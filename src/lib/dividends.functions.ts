import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface DividendInfo {
  symbol: string;
  currency: string | null;
  paid: { date: string; amount: number }[]; // confirmed payouts per share, last 12 months
  exDate: string | null; // confirmed upcoming ex-dividend date
  payDate: string | null; // confirmed upcoming payment date
}

/** Public read-only: confirmed dividend events from Yahoo Finance; nothing is estimated. */
export const getDividendEvents = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ symbols: z.array(z.string().min(1).max(20)).max(40) }).parse(input),
  )
  .handler(async ({ data }): Promise<DividendInfo[]> => {
    const { yahooClient } = await import("./prices.server");
    const yf = yahooClient();
    const today = Date.now();
    return Promise.all(
      data.symbols.map(async (symbol) => {
        const info: DividendInfo = {
          symbol,
          currency: null,
          paid: [],
          exDate: null,
          payDate: null,
        };
        try {
          const chart = await yf.chart(symbol, {
            period1: new Date(today - 366 * 86400000),
            interval: "1d",
            events: "div",
          });
          info.currency = chart.meta.currency ?? null;
          info.paid = (chart.events?.dividends ?? []).map((d) => ({
            date: new Date(d.date).toISOString().slice(0, 10),
            amount: d.amount,
          }));
        } catch {
          /* unavailable */
        }
        try {
          const s = await yf.quoteSummary(symbol, { modules: ["calendarEvents"] });
          const ex = s.calendarEvents?.exDividendDate;
          const pay = s.calendarEvents?.dividendDate;
          if (ex && ex.getTime() >= today - 86400000) info.exDate = ex.toISOString().slice(0, 10);
          if (pay && pay.getTime() >= today - 86400000)
            info.payDate = pay.toISOString().slice(0, 10);
        } catch {
          /* unavailable */
        }
        return info;
      }),
    );
  });
