import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  buildPortfolioHistory,
  closeAt,
  currencyRate,
  isValidIsoDate,
  mapInBatches,
  periodStart,
  type HistoryAsset,
} from "./history";
import { dailyAttribution } from "./performance-attribution";
import {
  normalizeTransactionsForSplits,
  type CorporateAction,
  type Transaction,
} from "./portfolio";

const HISTORY_BATCH_SIZE = 5;

export const getPortfolioHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z
      .object({
        period: z.enum(["1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y", "ALL"]),
        currency: z.enum(["EUR", "USD"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const [a, t, actionRows, valuationRows] = await Promise.all([
      context.supabase.from("assets").select("id,symbol,type"),
      context.supabase
        .from("transactions")
        .select("id,asset_id,kind,quantity,price,fee,date")
        .order("date"),
      context.supabase
        .from("corporate_actions")
        .select("asset_id,event_date,numerator,denominator"),
      context.supabase
        .from("asset_valuations")
        .select("asset_id,valuation_date,price_usd")
        .order("valuation_date"),
    ]);
    if (a.error || t.error || actionRows.error || valuationRows.error)
      throw new Error(
        `Could not load portfolio history inputs: ${a.error?.message ?? t.error?.message ?? actionRows.error?.message ?? valuationRows.error?.message}`,
      );
    const txs: Transaction[] = (t.data ?? []).map((r) => ({
      id: r.id,
      assetId: r.asset_id,
      kind: r.kind as Transaction["kind"],
      quantity: Number(r.quantity),
      price: Number(r.price),
      fee: Number(r.fee ?? 0),
      date: r.date,
    }));
    if (!txs.length)
      return {
        attribution: null,
        points: [],
        unavailable: false,
        assetReturns: [],
        assetContributions: [],
        pendingSplits: [],
      };
    const approvedActions: CorporateAction[] = (actionRows.data ?? []).map((action) => ({
      assetId: action.asset_id,
      date: action.event_date,
      numerator: Number(action.numerator),
      denominator: Number(action.denominator),
    }));
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    const first = txs[0]?.date ?? end;
    const start = [periodStart(data.period, first, now), first].sort().at(-1) ?? first;
    const fetchStart = new Date(Date.parse(start) - 7 * 86400000).toISOString().slice(0, 10);
    try {
      const { dailyHistory } = await import("./history.server");
      const [eur, gbp] = await Promise.all([
        dailyHistory("EURUSD=X", fetchStart, end),
        dailyHistory("GBPUSD=X", fetchStart, end),
      ]);
      const transactedAssetIds = new Set(
        txs
          .filter((transaction) => transaction.kind !== "dividend")
          .map((transaction) => transaction.assetId),
      );
      const portfolioAssets = (a.data ?? []).filter((asset) => transactedAssetIds.has(asset.id));
      const downloadedAssets = await mapInBatches(
        portfolioAssets.filter((asset) => ["stock", "etf", "crypto"].includes(asset.type)),
        HISTORY_BATCH_SIZE,
        async (asset) => {
          const history = await dailyHistory(asset.symbol, fetchStart, end, asset.type);
          return {
            id: asset.id,
            symbol: asset.symbol,
            type: asset.type,
            currency: history.currency,
            prices: history.prices,
            splits: history.splits,
          };
        },
      );
      const downloadedById = new Map(downloadedAssets.map((asset) => [asset.id, asset]));
      const valuationsByAsset = new Map<string, { date: string; close: number }[]>();
      for (const valuation of valuationRows.data ?? []) {
        const values = valuationsByAsset.get(valuation.asset_id) ?? [];
        values.push({ date: valuation.valuation_date, close: Number(valuation.price_usd) });
        valuationsByAsset.set(valuation.asset_id, values);
      }
      const assets: HistoryAsset[] = portfolioAssets.map((asset) => {
        const downloaded = downloadedById.get(asset.id);
        if (downloaded) return downloaded;
        if (asset.type === "bond" || asset.type === "realEstate")
          return {
            id: asset.id,
            type: asset.type,
            currency: "USD",
            prices: valuationsByAsset.get(asset.id) ?? [],
            manualValuation: true,
            splits: [],
          };
        return {
          id: asset.id,
          type: asset.type,
          currency: "USD",
          prices: [],
          splits: [],
        };
      });
      const hasPositionBefore = (assetId: string, date: string) => {
        let quantity = 0;
        for (const transaction of txs) {
          if (transaction.assetId !== assetId || transaction.date >= date) continue;
          if (transaction.kind === "buy") quantity += transaction.quantity;
          else if (transaction.kind === "sell") quantity -= transaction.quantity;
        }
        return quantity > 1e-9;
      };
      const approvedKeys = new Set(
        approvedActions.map(
          (action) => `${action.assetId}|${action.date}|${action.numerator}|${action.denominator}`,
        ),
      );
      const discoveredSplits = downloadedAssets.flatMap((asset) =>
        asset.splits.map((split) => ({ assetId: asset.id, symbol: asset.symbol, ...split })),
      );
      const pendingSplits = discoveredSplits.filter(
        (split) =>
          hasPositionBefore(split.assetId, split.date) &&
          !approvedKeys.has(
            `${split.assetId}|${split.date}|${split.numerator}|${split.denominator}`,
          ),
      );
      if (pendingSplits.length)
        return {
          attribution: null,
          points: [],
          unavailable: true,
          assetReturns: [],
          assetContributions: [],
          pendingSplits,
        };
      const confirmedSplits = discoveredSplits.filter(
        (split) =>
          hasPositionBefore(split.assetId, split.date) &&
          approvedKeys.has(
            `${split.assetId}|${split.date}|${split.numerator}|${split.denominator}`,
          ),
      );
      const splitActions: CorporateAction[] = confirmedSplits.map(
        ({ assetId, date, numerator, denominator }) => ({
          assetId,
          date,
          numerator,
          denominator,
        }),
      );
      const history = buildPortfolioHistory(
        assets,
        txs,
        start,
        end,
        data.currency,
        eur.prices,
        gbp.prices,
        splitActions,
      );
      if (history.unavailable)
        return { ...history, attribution: null, assetReturns: [], pendingSplits: [] };
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
        .toISOString()
        .slice(0, 10);
      const quantities = new Map<string, number>();
      for (const transaction of normalizeTransactionsForSplits(txs, splitActions)) {
        if (transaction.date > end || transaction.kind === "dividend") continue;
        quantities.set(
          transaction.assetId,
          Math.max(
            0,
            (quantities.get(transaction.assetId) ?? 0) +
              (transaction.kind === "buy" ? transaction.quantity : -transaction.quantity),
          ),
        );
      }
      const baseRateAt = (date: string) =>
        data.currency === "USD" ? 1 : currencyRate("EUR", date, eur.prices, gbp.prices);
      const assetReturns = assets.flatMap((asset) => {
        if (asset.type === "cash" || (quantities.get(asset.id) ?? 0) <= 0) return [];
        const maxAge = asset.manualValuation ? 90 : 7;
        const startPrice = closeAt(asset.prices, monthStart, maxAge);
        const endPrice = closeAt(asset.prices, end, maxAge);
        const startRate = currencyRate(asset.currency, monthStart, eur.prices, gbp.prices);
        const endRate = currencyRate(asset.currency, end, eur.prices, gbp.prices);
        const startBaseRate = baseRateAt(monthStart);
        const endBaseRate = baseRateAt(end);
        if (
          startPrice === null ||
          endPrice === null ||
          startRate === null ||
          endRate === null ||
          startBaseRate === null ||
          endBaseRate === null
        )
          return [];
        const startValue = (startPrice * startRate) / startBaseRate;
        const endValue = (endPrice * endRate) / endBaseRate;
        return startValue > 0
          ? [{ assetId: asset.id, returnPct: (endValue / startValue - 1) * 100 }]
          : [];
      });
      return {
        ...history,
        attribution: dailyAttribution(
          assets,
          txs,
          history.points,
          data.currency,
          eur.prices,
          gbp.prices,
          splitActions,
        ),
        assetReturns,
        pendingSplits: [],
      };
    } catch (error) {
      console.error("Could not build portfolio history", error);
      return {
        attribution: null,
        points: [],
        unavailable: true,
        assetReturns: [],
        assetContributions: [],
        pendingSplits: [],
      };
    }
  });

export const convertImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z
      .object({
        rows: z
          .array(
            z.object({
              symbol: z.string().max(30),
              name: z.string().max(200),
              assetType: z.enum(["stock", "etf", "crypto", "bond", "cash", "realEstate"]),
              kind: z.enum(["buy", "sell", "dividend"]),
              quantity: z.number().positive(),
              price: z.number().positive(),
              fee: z.number().nonnegative().default(0),
              date: z.string().refine(isValidIsoDate, "Invalid transaction date"),
              currency: z.enum(["USD", "EUR", "BGN", "GBX", "GBP"]).default("USD"),
              sourceTransactionId: z.string().max(512).optional(),
              sourceExecutedAt: z.string().max(128).optional(),
              feeCurrency: z.enum(["USD", "EUR", "BGN", "GBX", "GBP"]).optional(),
              bondCouponRate: z.number().nonnegative().optional(),
              bondMaturityDate: z
                .string()
                .refine(isValidIsoDate, "Invalid bond maturity date")
                .optional(),
              bondFaceValue: z.number().positive().optional(),
              bondManualPrice: z.number().positive().optional(),
            }),
          )
          .min(1)
          .max(10000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { dailyHistory } = await import("./history.server");
    const dates = data.rows.map((r) => r.date).sort();
    const first = dates[0];
    const last = dates.at(-1);
    if (!first || !last || last > new Date().toISOString().slice(0, 10))
      throw new Error("Invalid transaction dates");
    const start = new Date(Date.parse(first) - 7 * 86400000).toISOString().slice(0, 10);
    const feeCurrencies = data.rows.map((row) => row.feeCurrency ?? row.currency);
    const needsEur =
      data.rows.some((r) => ["EUR", "BGN"].includes(r.currency)) ||
      feeCurrencies.some((currency) => ["EUR", "BGN"].includes(currency));
    const needsGbp =
      data.rows.some((r) => ["GBX", "GBP"].includes(r.currency)) ||
      feeCurrencies.some((currency) => ["GBX", "GBP"].includes(currency));
    const [eur, gbp] = await Promise.all([
      needsEur ? dailyHistory("EURUSD=X", start, last) : null,
      needsGbp ? dailyHistory("GBPUSD=X", start, last) : null,
    ]);
    return data.rows.map((r) => {
      const rate = currencyRate(r.currency, r.date, eur?.prices ?? [], gbp?.prices ?? []);
      if (rate === null)
        throw new Error(`Historical exchange rate unavailable: ${r.date} ${r.currency}`);
      const feeCurrency = r.feeCurrency ?? r.currency;
      const feeRate = currencyRate(feeCurrency, r.date, eur?.prices ?? [], gbp?.prices ?? []);
      if (feeRate === null)
        throw new Error(`Historical exchange rate unavailable: ${r.date} ${feeCurrency}`);
      return {
        ...r,
        price: r.price * rate,
        fee: r.fee * feeRate,
        currency: "USD",
        feeCurrency: "USD",
      };
    });
  });
