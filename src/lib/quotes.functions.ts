import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
export type Quote = {
  price: number;
  nativePrice: number;
  change: number | null;
  at: string;
  currency: string;
  source: string;
};
export const getQuotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        items: z.array(z.object({ symbol: z.string().max(20), type: z.string().max(20) })).max(60),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { fetchCryptoQuotes, fetchLiveQuote, fetchFx } = await import("./prices.server");
    const cryptoSymbols = data.items
      .filter((item) => item.type === "crypto")
      .map((item) => item.symbol);
    const [fx, gbp, cryptoQuotes] = await Promise.all([
      fetchFx(),
      data.items.length ? fetchLiveQuote("GBPUSD=X", "stock") : null,
      fetchCryptoQuotes(cryptoSymbols),
    ]);
    const quotes: Record<string, Quote> = {};
    const missing: string[] = [];
    // Bounded batches avoid overwhelming the free providers.
    for (let i = 0; i < data.items.length; i += 4) {
      await Promise.all(
        data.items.slice(i, i + 4).map(async (item) => {
          if (item.type === "cash" || item.type === "bond") return;
          const q =
            item.type === "crypto"
              ? cryptoQuotes[item.symbol.toUpperCase()]
              : await fetchLiveQuote(item.symbol, item.type);
          const rate = !q
            ? null
            : q.currency === "USD"
              ? 1
              : q.currency === "EUR" && fx
                ? 1 / fx
                : q.currency === "GBP"
                  ? gbp?.price
                  : ["GBX", "GBp"].includes(q.currency) && gbp
                    ? gbp.price / 100
                    : null;
          if (!q || !rate) {
            missing.push(item.symbol);
            return;
          }
          quotes[item.symbol] = { ...q, price: q.price * rate, nativePrice: q.price };
        }),
      );
    }
    return { quotes, missing, eurPerUsd: fx, at: new Date().toISOString() };
  });
