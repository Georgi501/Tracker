import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildPortfolioHistory, periodStart, currencyRate } from "./history";
import type { Transaction } from "./portfolio";

export const getPortfolioHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ period: z.enum(["1M", "3M", "6M", "1Y", "3Y", "5Y", "ALL"]), currency: z.enum(["EUR", "USD"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const [a, t] = await Promise.all([context.supabase.from("assets").select("id,symbol,type"), context.supabase.from("transactions").select("id,asset_id,kind,quantity,price,date").order("date")]);
    if (a.error || t.error) return { points: [], unavailable: true };
    const txs: Transaction[] = (t.data ?? []).map((r) => ({ id: r.id, assetId: r.asset_id, kind: r.kind as Transaction["kind"], quantity: Number(r.quantity), price: Number(r.price), date: r.date }));
    if (!txs.length) return { points: [], unavailable: false };
    const now = new Date(); const end = now.toISOString().slice(0, 10);
    const first = txs[0]?.date ?? end;
    const start = [periodStart(data.period, first, now), first].sort().at(-1) ?? first;
    const fetchStart = new Date(Date.parse(start) - 7 * 86400000).toISOString().slice(0, 10);
    try {
      const { dailyHistory } = await import("./history.server");
      const [eur, gbp] = await Promise.all([dailyHistory("EURUSD=X", fetchStart, end), dailyHistory("GBPUSD=X", fetchStart, end)]);
      const assets = [];
      for (const asset of a.data ?? []) {
        if (asset.type === "cash") { assets.push({ id: asset.id, type: asset.type, currency: "USD", prices: [] }); continue; }
        const h = await dailyHistory(asset.symbol, fetchStart, end, asset.type);
        // Corporate-action reconciliation is not represented in transaction records yet: never draw a misleading series.
        if (h.splits) return { points: [], unavailable: true };
        assets.push({ id: asset.id, type: asset.type, currency: h.currency, prices: h.prices });
      }
      return buildPortfolioHistory(assets, txs, start, end, data.currency, eur.prices, gbp.prices);
    } catch { return { points: [], unavailable: true }; }
  });

export const convertImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ rows: z.array(z.object({ symbol: z.string().max(30), name: z.string().max(200), assetType: z.enum(["stock", "etf", "crypto", "cash", "realEstate"]), kind: z.enum(["buy", "sell", "dividend"]), quantity: z.number().positive(), price: z.number().positive(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), currency: z.enum(["USD", "EUR", "BGN", "GBX", "GBP"]).default("USD") })).min(1).max(10000) }).parse(input))
  .handler(async ({ data }) => {
    const { dailyHistory } = await import("./history.server");
    const dates = data.rows.map((r) => r.date).sort();
    const first = dates[0]; const last = dates.at(-1);
    if (!first || !last || last > new Date().toISOString().slice(0, 10)) throw new Error("Invalid transaction dates");
    const start = new Date(Date.parse(first) - 7 * 86400000).toISOString().slice(0, 10);
    const needsEur = data.rows.some((r) => ["EUR", "BGN"].includes(r.currency));
    const needsGbp = data.rows.some((r) => ["GBX", "GBP"].includes(r.currency));
    const [eur, gbp] = await Promise.all([needsEur ? dailyHistory("EURUSD=X", start, last) : null, needsGbp ? dailyHistory("GBPUSD=X", start, last) : null]);
    return data.rows.map((r) => {
      const rate = currencyRate(r.currency, r.date, eur?.prices ?? [], gbp?.prices ?? []);
      if (rate === null) throw new Error(`Historical exchange rate unavailable: ${r.date} ${r.currency}`);
      return { ...r, price: r.price * rate, currency: "USD" };
    });
  });
