import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
export type Quote = { price: number; change: number | null; at: string; currency: string; source: string };
export const getQuotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ items: z.array(z.object({ symbol: z.string().max(20), type: z.string().max(20) })).max(60) }).parse(d))
  .handler(async ({ data }) => {
    const { fetchLiveQuote, fetchFx } = await import("./prices.server");
    const fx = await fetchFx();
    const gbp = data.items.length ? await fetchLiveQuote("GBPUSD=X", "stock") : null;
    const quotes: Record<string, Quote> = {};
    const missing: string[] = [];
    // Bounded batches avoid overwhelming the free providers.
    for (let i = 0; i < data.items.length; i += 4) {
      await Promise.all(data.items.slice(i, i + 4).map(async (item) => {
        if (item.type === "cash") return;
        const q = await fetchLiveQuote(item.symbol, item.type);
        const rate = !q ? null : q.currency === "USD" ? 1 : q.currency === "EUR" && fx ? 1 / fx : q.currency === "GBP" ? gbp?.price : ["GBX", "GBp"].includes(q.currency) && gbp ? gbp.price / 100 : null;
        if (!q || !rate) { missing.push(item.symbol); return; }
        quotes[item.symbol] = { ...q, price: q.price * rate };
      }));
    }
    return { quotes, missing, eurPerUsd: fx, at: new Date().toISOString() };
  });
