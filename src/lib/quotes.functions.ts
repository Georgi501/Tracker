import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isValidIsoDate, type DailyPrice } from "./history";
import {
  resolveAssetIdentity,
  validateQuoteIdentity,
  type QuoteRejectionReason,
} from "./instrument-identity";
import type { AssetType } from "./portfolio";
import { QUOTE_BATCH_SIZE } from "./quote-batches";
export type Quote = {
  price: number;
  nativePrice: number;
  change: number | null;
  at: string;
  currency: string;
  source: string;
  resolvedSymbol?: string;
  fxAt?: string;
  fxSource?: string;
};
export const getQuotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        items: z
          .array(
            z.object({
              symbol: z.string().max(24),
              type: z.string().max(20),
              name: z.string().max(200).optional(),
              isin: z.string().max(16).optional(),
              quoteSymbol: z.string().max(24).optional(),
              expectedCurrency: z.string().max(8).optional(),
            }),
          )
          .max(QUOTE_BATCH_SIZE),
        eurUsdRange: z
          .object({
            start: z.string().refine(isValidIsoDate),
            end: z.string().refine(isValidIsoDate),
          })
          .optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { fetchCryptoQuotes, fetchLiveQuote, fetchFx } = await import("./prices.server");
    const resolvedItems = data.items.map((item) => ({
      item,
      identity: resolveAssetIdentity({
        symbol: item.symbol,
        type: (item.type as AssetType) || "stock",
        name: item.name,
        isin: item.isin,
        quoteSymbol: item.quoteSymbol,
        expectedCurrency: item.expectedCurrency,
      }),
    }));
    const cryptoSymbols = resolvedItems
      .filter(({ identity }) => identity.effectiveType === "crypto")
      .map(({ identity }) => identity.quoteSymbol);

    const eurUsdPromise: Promise<DailyPrice[] | undefined> = data.eurUsdRange
      ? import("./history.server")
          .then(({ dailyHistory }) =>
            dailyHistory("EURUSD=X", data.eurUsdRange!.start, data.eurUsdRange!.end).then(
              (history) => history.prices,
            ),
          )
          .catch(() => undefined)
      : Promise.resolve(undefined);

    const emptyCryptoQuotes: Awaited<ReturnType<typeof fetchCryptoQuotes>> = {};
    const [fx, gbp, cryptoQuotes, eurUsdPrices] = await Promise.all([
      data.items.length ? fetchFx() : null,
      data.items.length ? fetchLiveQuote("GBPUSD=X", "stock") : null,
      cryptoSymbols.length ? fetchCryptoQuotes(cryptoSymbols) : Promise.resolve(emptyCryptoQuotes),
      eurUsdPromise,
    ]);
    const quotes: Record<string, Quote> = {};
    const missing: string[] = [];
    const diagnostics: Record<string, QuoteRejectionReason> = {};
    // Bounded batches avoid overwhelming the free providers.
    for (let i = 0; i < resolvedItems.length; i += 4) {
      await Promise.all(
        resolvedItems.slice(i, i + 4).map(async ({ item, identity }) => {
          if (item.type === "cash" || item.type === "bond" || item.type === "realEstate") return;
          if (identity.forbidUsListingCollision) {
            diagnostics[item.symbol] = "ticker_collision_blocked";
            missing.push(item.symbol);
            return;
          }
          const q =
            identity.effectiveType === "crypto"
              ? cryptoQuotes[identity.quoteSymbol.toUpperCase()]
              : await fetchLiveQuote(identity.quoteSymbol, identity.effectiveType);
          if (!q) {
            missing.push(item.symbol);
            return;
          }
          const validation = validateQuoteIdentity(identity, {
            providerSymbol: q.providerSymbol ?? identity.quoteSymbol,
            currency: q.currency,
            exchangeName: q.exchangeName,
            fullExchangeName: q.fullExchangeName,
            instrumentType: q.instrumentType,
            longName: q.longName,
            shortName: q.shortName,
          });
          if (!validation.ok) {
            diagnostics[item.symbol] = validation.reason;
            missing.push(item.symbol);
            return;
          }
          const rate =
            q.currency === "USD"
              ? 1
              : q.currency === "EUR" && fx
                ? 1 / fx
                : q.currency === "GBP"
                  ? gbp?.price
                  : ["GBX", "GBp"].includes(q.currency) && gbp
                    ? gbp.price / 100
                    : null;
          if (!rate) {
            missing.push(item.symbol);
            return;
          }
          quotes[item.symbol] = {
            price: q.price * rate,
            nativePrice: q.price,
            change: q.change,
            at: q.at,
            currency: q.currency,
            source: q.source,
            resolvedSymbol: identity.quoteSymbol,
            ...(["GBP", "GBX", "GBp"].includes(q.currency) && gbp
              ? { fxAt: gbp.at, fxSource: gbp.source }
              : {}),
          };
        }),
      );
    }
    return {
      quotes,
      missing,
      diagnostics,
      ...(eurUsdPrices?.length ? { eurUsdPrices } : {}),
      at: new Date().toISOString(),
    };
  });
