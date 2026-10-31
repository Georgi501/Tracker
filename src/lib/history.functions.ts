import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildPortfolioHistory, closeAt, currencyRate, periodStart } from "./history";
import type { Transaction } from "./portfolio";

export const getPortfolioHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        period: z.enum(["1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y", "ALL"]),
        currency: z.enum(["EUR", "USD"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const [a, t] = await Promise.all([
      context.supabase.from("assets").select("id,symbol,type"),
      context.supabase
        .from("transactions")
        .select("id,asset_id,kind,quantity,price,fee,date")
        .order("date"),
    ]);
    if (a.error || t.error) return { points: [], unavailable: true, assetReturns: [] };
    const txs: Transaction[] = (t.data ?? []).map((r) => ({
      id: r.id,
      assetId: r.asset_id,
      kind: r.kind as Transaction["kind"],
      quantity: Number(r.quantity),
      price: Number(r.price),
      fee: Number(r.fee ?? 0),
      date: r.date,
    }));
    if (!txs.length) return { points: [], unavailable: false, assetReturns: [] };
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
      const assets: {
        id: string;
        type: string;
        currency: string;
        prices: { date: string; close: number }[];
      }[] = [];
      for (const asset of a.data ?? []) {
        if (asset.type === "cash") {
          assets.push({ id: asset.id, type: asset.type, currency: "USD", prices: [] });
          continue;
        }
        if (asset.type === "bond") return { points: [], unavailable: true, assetReturns: [] };
        const h = await dailyHistory(asset.symbol, fetchStart, end, asset.type);
        // Corporate-action reconciliation is not represented in transaction records yet: never draw a misleading series.
        if (h.splits) return { points: [], unavailable: true, assetReturns: [] };
        assets.push({ id: asset.id, type: asset.type, currency: h.currency, prices: h.prices });
      }
      const history = buildPortfolioHistory(
        assets,
        txs,
        start,
        end,
        data.currency,
        eur.prices,
        gbp.prices,
      );
      if (history.unavailable) return { ...history, assetReturns: [] };
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
        .toISOString()
        .slice(0, 10);
      const quantities = new Map<string, number>();
      for (const transaction of txs) {
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
        const startPrice = closeAt(asset.prices, monthStart);
        const endPrice = closeAt(asset.prices, end);
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
      return { ...history, assetReturns };
    } catch {
      return { points: [], unavailable: true, assetReturns: [] };
    }
  });

export const convertImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
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
              date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
              currency: z.enum(["USD", "EUR", "BGN", "GBX", "GBP"]).default("USD"),
              feeCurrency: z.enum(["USD", "EUR", "BGN", "GBX", "GBP"]).optional(),
              bondCouponRate: z.number().nonnegative().optional(),
              bondMaturityDate: z
                .string()
                .regex(/^\d{4}-\d{2}-\d{2}$/)
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
