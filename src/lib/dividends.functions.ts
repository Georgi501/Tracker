import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface DividendInfo {
  symbol: string;
  currency: string | null;
  paid: { date: string; amount: number }[]; // confirmed payouts per share, last 12 months
  exDate: string | null; // confirmed upcoming ex-dividend date
  payDate: string | null; // confirmed upcoming payment date
}

export interface CorporateActions {
  symbol: string;
  currency: string | null;
  unavailable: boolean;
  dividends: { date: string; amount: number; previousAmount: number; changePercent: number }[];
  splits: { date: string; numerator: number; denominator: number }[];
}

/** Public read-only confirmed dividend and split events; dividend changes compare adjacent payouts only. */
export const getCorporateActions = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({ symbols: z.array(z.string().regex(/^[A-Za-z0-9.^:=_-]{1,20}$/)).max(40) })
      .parse(input),
  )
  .handler(async ({ data }): Promise<CorporateActions[]> => {
    const { yahooClient } = await import("./prices.server");
    const yf = yahooClient();
    const period1 = new Date(Date.now() - 2 * 366 * 86400000);
    return Promise.all(
      [...new Set(data.symbols.map((symbol) => symbol.toUpperCase()))].map(async (symbol) => {
        try {
          const chart = await yf.chart(symbol, { period1, interval: "1d", events: "div,splits" });
          const payoutEvents = (chart.events?.dividends ?? [])
            .filter((event) => Number.isFinite(event.amount) && event.amount > 0)
            .map((event) => ({
              date: new Date(event.date).toISOString().slice(0, 10),
              amount: event.amount,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
          const dividends = payoutEvents.slice(1).map((event, index) => {
            const previousAmount = payoutEvents[index]!.amount;
            return {
              ...event,
              previousAmount,
              changePercent: (event.amount / previousAmount - 1) * 100,
            };
          });
          const splits = (chart.events?.splits ?? [])
            .filter(
              (event) =>
                Number.isFinite(event.numerator) &&
                Number.isFinite(event.denominator) &&
                event.numerator > 0 &&
                event.denominator > 0,
            )
            .map((event) => ({
              date: new Date(event.date).toISOString().slice(0, 10),
              numerator: event.numerator,
              denominator: event.denominator,
            }))
            .sort((a, b) => b.date.localeCompare(a.date));
          return {
            symbol,
            currency: chart.meta.currency ?? null,
            unavailable: false,
            dividends: dividends.reverse(),
            splits,
          };
        } catch {
          return { symbol, currency: null, unavailable: true, dividends: [], splits: [] };
        }
      }),
    );
  });

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
