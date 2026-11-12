import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { marketSearchSchema, searchCatalog, type MarketAsset } from "./market-search";
import { dedupeMarketNews } from "./market-news";
import {
  earningsSurprisePercent,
  sortEarningsCalendar,
  type EarningsCalendarData,
} from "./earnings";
import {
  filterFinancialRows,
  toTrailingFinancialRows,
  type FinancialSeriesRow,
} from "./financial-series";

export interface MarketNews {
  id: string;
  title: string;
  publisher: string;
  link: string;
  at: string | null;
  tickers: string[];
  image: string | null;
}

type Thumb = { thumbnail?: { resolutions?: { url: string; width: number }[] } };
/** Pick the smallest provider thumbnail ≥ 140px wide; https only, never a substitute image. */
function thumb(n: Thumb): string | null {
  const r = (n.thumbnail?.resolutions ?? [])
    .filter((x) => /^https:\/\//.test(x.url))
    .sort((a, b) => a.width - b.width);
  return (r.find((x) => x.width >= 140) ?? r[r.length - 1])?.url ?? null;
}

export const searchMarket = createServerFn({ method: "POST" })
  .validator((input) => marketSearchSchema.parse(input))
  .handler(
    async ({
      data,
    }): Promise<{ assets: MarketAsset[]; news: MarketNews[]; unavailable: boolean }> => {
      const fallback = searchCatalog(data.query);
      try {
        const { yahooClient } = await import("./prices.server");
        const result = await yahooClient().search(data.query, { newsCount: 8 });
        const assets = new Map(fallback.map((a) => [a.symbol, a]));
        for (const a of result.quotes) {
          if (!a.isYahooFinance || !a.symbol || !["EQUITY", "ETF"].includes(a.quoteType ?? ""))
            continue;
          assets.set(a.symbol, {
            symbol: a.symbol,
            name: a.longname ?? a.shortname ?? a.symbol,
            type: a.quoteType === "ETF" ? "etf" : "stock",
            ...(typeof a.exchange === "string" ? { exchange: a.exchange } : {}),
            ...(typeof a["currency"] === "string" ? { currency: a["currency"] } : {}),
          });
        }
        const news = dedupeMarketNews(
          (result.news ?? [])
            .filter((n) => n.title && /^https:\/\//.test(n.link))
            .map((n) => ({
              id: n.uuid,
              title: n.title,
              publisher: n.publisher ?? "",
              link: n.link,
              at: n.providerPublishTime ? new Date(n.providerPublishTime).toISOString() : null,
              tickers: (n.relatedTickers ?? []).slice(0, 4),
              image: thumb(n as Thumb),
            })),
        );
        return { assets: [...assets.values()].slice(0, 20), news, unavailable: false };
      } catch {
        return { assets: fallback, news: [], unavailable: true };
      }
    },
  );

export const marketQuote = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        symbol: z.string().regex(/^[A-Za-z0-9.^:=_-]{1,20}$/),
        type: z.enum(["stock", "etf", "crypto"]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { fetchLiveQuote } = await import("./prices.server");
    const quote = await fetchLiveQuote(data.symbol, data.type);
    return { quote, reason: quote ? null : ("unavailable" as const) };
  });

export interface ExtendedQuote {
  session: "pre" | "post";
  price: number;
  change: number;
  changePct: number;
  at: string;
}
const extCache = new Map<string, { at: number; v: ExtendedQuote | null }>();
/** Pre-market / after-hours price for US listings; null while the regular session is open or when the provider has none. */
export const marketExtended = createServerFn({ method: "POST" })
  .validator((input) =>
    z.object({ symbol: z.string().regex(/^[A-Za-z0-9.^:=_-]{1,20}$/) }).parse(input),
  )
  .handler(async ({ data }): Promise<{ ext: ExtendedQuote | null }> => {
    const k = data.symbol.toUpperCase();
    const hit = extCache.get(k);
    if (hit && Date.now() - hit.at < 60_000) return { ext: hit.v };
    let v: ExtendedQuote | null = null;
    try {
      const { yahooClient } = await import("./prices.server");
      const q = (await yahooClient().quote(data.symbol)) as Record<string, unknown>;
      const state = String(q["marketState"] ?? "");
      const pick = (p: "pre" | "post"): ExtendedQuote | null => {
        const price = q[`${p}MarketPrice`] as number | undefined,
          ch = q[`${p}MarketChange`] as number | undefined;
        const pct = q[`${p}MarketChangePercent`] as number | undefined,
          t = q[`${p}MarketTime`] as Date | undefined;
        return price && price > 0 && ch != null && pct != null && t
          ? { session: p, price, change: ch, changePct: pct, at: new Date(t).toISOString() }
          : null;
      };
      if (state === "PRE" || state === "PREPRE") v = pick("pre");
      else if (state === "POST" || state === "POSTPOST" || state === "CLOSED") v = pick("post");
    } catch {
      v = null;
    }
    extCache.set(k, { at: Date.now(), v });
    return { ext: v };
  });

export const getExchangeRate = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchLiveFx } = await import("./prices.server");
  return { fx: await fetchLiveFx() };
});

export const getAssetRiskHistory = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        assets: z
          .array(
            z.object({
              symbol: z.string().regex(/^[A-Za-z0-9.^:=_-]{1,20}$/),
              type: z.enum(["stock", "etf", "crypto"]),
              weight: z.number().finite().positive(),
            }),
          )
          .min(2)
          .max(12),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { dailyHistory } = await import("./history.server");
    const { currencyRate } = await import("./history");
    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - 366 * 86400000).toISOString().slice(0, 10);
    const unique = [...new Map(data.assets.map((asset) => [asset.symbol, asset])).values()];
    const histories = await Promise.all(
      unique.map(async (asset) => {
        try {
          return {
            asset,
            history: await dailyHistory(asset.symbol, start, end, asset.type),
          };
        } catch {
          return { asset, history: null };
        }
      }),
    );
    const currencies = new Set(histories.flatMap(({ history }) => history?.currency ?? []));
    const [eur, gbp, jpy] = await Promise.all([
      currencies.has("EUR") || currencies.has("BGN")
        ? dailyHistory("EURUSD=X", start, end)
            .then((value) => value.prices)
            .catch(() => [])
        : Promise.resolve([]),
      currencies.has("GBP") || currencies.has("GBX") || currencies.has("GBp")
        ? dailyHistory("GBPUSD=X", start, end)
            .then((value) => value.prices)
            .catch(() => [])
        : Promise.resolve([]),
      currencies.has("JPY")
        ? dailyHistory("JPY=X", start, end)
            .then((value) => value.prices)
            .catch(() => [])
        : Promise.resolve([]),
    ]);
    return histories.map(({ asset, history }) => ({
      symbol: asset.symbol,
      weight: asset.weight,
      prices:
        history?.prices.flatMap((point) => {
          const rate = currencyRate(history.currency, point.date, eur, gbp, jpy);
          return rate && Number.isFinite(point.close * rate)
            ? [{ date: point.date, value: point.close * rate }]
            : [];
        }) ?? [],
    }));
  });

export const CHART_RANGES = ["1D", "1W", "1M", "3M", "6M", "YTD", "1Y", "3Y", "MAX"] as const;
export type ChartRange = (typeof CHART_RANGES)[number];
export type MarketCandle = {
  t: number;
  c: number;
  o: number | null;
  h: number | null;
  l: number | null;
};
const RANGE_CFG: Record<
  ChartRange,
  { days: number; interval: "5m" | "30m" | "1d" | "1wk" | "1mo" }
> = {
  "1D": { days: 1, interval: "5m" },
  "1W": { days: 7, interval: "30m" },
  "1M": { days: 31, interval: "1d" },
  "3M": { days: 92, interval: "1d" },
  "6M": { days: 183, interval: "1d" },
  YTD: { days: 0, interval: "1d" },
  "1Y": { days: 366, interval: "1d" },
  "3Y": { days: 1096, interval: "1wk" },
  MAX: { days: 0, interval: "1mo" },
};

/** Real provider closes for the chosen range plus 52-week range; failures are flagged, never synthesized. */
export const marketDetails = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        symbol: z.string().regex(/^[A-Za-z0-9.^:=_-]{1,20}$/),
        type: z.enum(["stock", "etf", "crypto"]),
        range: z.enum(CHART_RANGES).default("1Y"),
      })
      .parse(input),
  )
  .handler(
    async ({
      data,
    }): Promise<{
      closes: MarketCandle[];
      lastPrice: number | null;
      lastPriceAt: string | null;
      dailyChangePct: number | null;
      low: number | null;
      high: number | null;
      currency: string | null;
      unavailable: boolean;
    }> => {
      const { fetchLiveQuote, yahooClient } = await import("./prices.server");
      const empty = {
        closes: [],
        lastPrice: null,
        lastPriceAt: null,
        dailyChangePct: null,
        low: null,
        high: null,
        currency: null,
        unavailable: false,
      };
      const cfg = RANGE_CFG[data.range];
      try {
        const symbol = data.type === "crypto" ? `${data.symbol.toUpperCase()}-USD` : data.symbol;
        const now = new Date();
        const period1 =
          data.range === "YTD"
            ? new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
            : cfg.days > 0
              ? new Date(now.getTime() - cfg.days * 86400000)
              : new Date("1970-01-02");
        const [chart, liveQuote] = await Promise.all([
          yahooClient().chart(symbol, { period1, interval: cfg.interval }),
          data.range === "1D" ? fetchLiveQuote(data.symbol, data.type) : Promise.resolve(null),
        ]);
        const closes = chart.quotes
          .filter((q) => q.close != null && q.close > 0)
          .map((q) => ({
            t: q.date.getTime(),
            c: q.close as number,
            o: q.open,
            h: q.high,
            l: q.low,
          }));
        const m = chart.meta as {
          fiftyTwoWeekLow?: number;
          fiftyTwoWeekHigh?: number;
          currency?: string;
          regularMarketPrice?: number;
          regularMarketTime?: Date | null;
        };
        const vals = closes.map((x) => x.c);
        const fromData = data.range === "1Y";
        const quoteAt =
          m.regularMarketTime instanceof Date && Number.isFinite(m.regularMarketTime.getTime())
            ? m.regularMarketTime.toISOString()
            : null;
        return {
          closes,
          lastPrice:
            (data.range === "1D" ? liveQuote?.price : null) ??
            (m.regularMarketPrice != null &&
            Number.isFinite(m.regularMarketPrice) &&
            m.regularMarketPrice > 0
              ? m.regularMarketPrice
              : (closes.at(-1)?.c ?? null)),
          lastPriceAt:
            (data.range === "1D" ? liveQuote?.at : null) ??
            (m.regularMarketPrice != null &&
            Number.isFinite(m.regularMarketPrice) &&
            m.regularMarketPrice > 0
              ? (quoteAt ?? (closes.at(-1)?.t ? new Date(closes.at(-1)!.t).toISOString() : null))
              : closes.at(-1)?.t
                ? new Date(closes.at(-1)!.t).toISOString()
                : null),
          dailyChangePct: data.range === "1D" ? (liveQuote?.change ?? null) : null,
          low: m.fiftyTwoWeekLow ?? (fromData && vals.length ? Math.min(...vals) : null),
          high: m.fiftyTwoWeekHigh ?? (fromData && vals.length ? Math.max(...vals) : null),
          currency: (data.range === "1D" ? liveQuote?.currency : null) ?? m.currency ?? null,
          unavailable: false,
        };
      } catch (error) {
        console.error("Unable to load market chart", data.symbol, error);
        return { ...empty, unavailable: true };
      }
    },
  );

export interface KeyStats {
  quoteAt: string | null;
  marketState: string | null;
  currentPrice: number | null;
  previousClose: number | null;
  open: number | null;
  dayLow: number | null;
  dayHigh: number | null;
  low52: number | null;
  high52: number | null;
  marketCap: number | null;
  enterpriseValue: number | null;
  trailingPe: number | null;
  forwardPe: number | null;
  priceToSales: number | null;
  priceToBook: number | null;
  pegRatio: number | null;
  beta: number | null;
  pe: number | null;
  eps: number | null;
  forwardEps: number | null;
  cash: number | null;
  totalDebt: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  targetLow: number | null;
  dividendRate: number | null;
  dividendYield: number | null;
  target: number | null;
  targetHigh: number | null;
  recommendation: string | null;
  returnOnEquity: number | null;
  debtToEquity: number | null;
  operatingMargins: number | null;
  profitMargins: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  earningsDate: string | null;
  currency: string | null;
}

export type { FinancialSeriesRow } from "./financial-series";

export interface FinancialSeries {
  source?: "SEC EDGAR" | "Yahoo Finance";
  epsHistoryUnavailable?: boolean;
  filings?: Record<string, string>;
  rows: FinancialSeriesRow[];
  currency: string | null;
}

/** Reported company financials; missing provider values remain null. */
export const marketFinancialSeries = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        symbol: z.string().regex(/^[A-Za-z0-9.^:=_-]{1,20}$/),
        period: z.enum(["annual", "quarterly", "trailing"]),
        years: z
          .number()
          .int()
          .refine((value) => [3, 5, 10].includes(value)),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<FinancialSeries> => {
    const { yahooClient } = await import("./prices.server");
    const yf = yahooClient();
    // Annual gets one extra year of margin: a fiscal year ending just before the cutoff must not be cut,
    // because the chart axis (buildAnnualAxis) selects exactly the requested number of fiscal years.
    const yearsBack = data.period === "annual" ? data.years + 1 : data.years;
    const periodStart = new Date(Date.now() - yearsBack * 365.25 * 24 * 60 * 60 * 1000);
    const period1 =
      data.period === "trailing"
        ? new Date(periodStart.getTime() - 365.25 * 24 * 60 * 60 * 1000)
        : periodStart;
    if (data.period === "annual") {
      const { fetchSecAnnualFinancials } = await import("./sec-financials.server");
      const sec = await fetchSecAnnualFinancials(data.symbol);
      if (sec) return sec;
      const { fetchAnnualFinancialHistory } = await import("./financial-history.server");
      return {
        ...(await fetchAnnualFinancialHistory(data.symbol, periodStart)),
        source: "Yahoo Finance",
      };
    }
    const sourcePeriod = data.period === "trailing" ? "quarterly" : data.period;
    const [income, cashFlow, quote] = await Promise.all([
      yf.fundamentalsTimeSeries(data.symbol, {
        period1,
        type: sourcePeriod,
        module: "financials",
      }),
      yf.fundamentalsTimeSeries(data.symbol, {
        period1,
        type: sourcePeriod,
        module: "cash-flow",
      }),
      yf.quote(data.symbol).catch(() => null),
    ]);
    const rows = new Map<string, FinancialSeriesRow>();
    const numberOrNull = (value: unknown) =>
      typeof value === "number" && Number.isFinite(value) ? value : null;
    const getRow = (dateValue: Date | number | string) => {
      const date =
        dateValue instanceof Date
          ? dateValue
          : new Date(typeof dateValue === "number" ? dateValue * 1000 : dateValue);
      if (Number.isNaN(date.getTime())) return null;
      const key = date.toISOString().slice(0, 10);
      let row = rows.get(key);
      if (!row) {
        row = {
          date: key,
          revenue: null,
          costOfRevenue: null,
          grossProfit: null,
          operatingIncome: null,
          operatingExpense: null,
          netIncome: null,
          dilutedEps: null,
          operatingCashFlow: null,
          freeCashFlow: null,
        };
        rows.set(key, row);
      }
      return row;
    };
    for (const item of income) {
      const row = getRow(item.date);
      if (!row || (item.TYPE !== "FINANCIALS" && item.TYPE !== "ALL")) continue;
      row.revenue = numberOrNull(item.totalRevenue);
      row.costOfRevenue = numberOrNull(item.costOfRevenue);
      row.grossProfit = numberOrNull(item.grossProfit);
      row.operatingIncome = numberOrNull(item.operatingIncome);
      row.operatingExpense = numberOrNull(item.operatingExpense);
      row.netIncome = numberOrNull(item.netIncome);
      row.dilutedEps = numberOrNull(item.dilutedEPS);
    }
    for (const item of cashFlow) {
      const row = getRow(item.date);
      if (!row || (item.TYPE !== "CASH_FLOW" && item.TYPE !== "ALL")) continue;
      row.operatingCashFlow = numberOrNull(item.operatingCashFlow);
      row.freeCashFlow = numberOrNull(item.freeCashFlow);
    }
    const sortedRows = [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
    const selectedRows =
      data.period === "trailing"
        ? filterFinancialRows(toTrailingFinancialRows(sortedRows), periodStart)
        : filterFinancialRows(sortedRows, periodStart);
    return {
      rows: selectedRows,
      currency: quote?.currency ?? null,
    };
  });

/** Yahoo key statistics for stocks/ETFs; every missing figure stays null (never estimated). */
export const marketStats = createServerFn({ method: "POST" })
  .validator((input) =>
    z.object({ symbol: z.string().regex(/^[A-Za-z0-9.^:=_-]{1,20}$/) }).parse(input),
  )
  .handler(async ({ data }): Promise<KeyStats | null> => {
    const { yahooClient } = await import("./prices.server");
    const yf = yahooClient();
    const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    try {
      const [q, s] = await Promise.all([
        yf.quote(data.symbol),
        yf
          .quoteSummary(data.symbol, {
            modules: ["defaultKeyStatistics", "financialData", "summaryDetail"],
          })
          .catch(() => null),
      ]);
      if (!q) return null;
      const earn = q.earningsTimestampStart ?? q.earningsTimestamp;
      const f = s?.financialData;
      const k = s?.defaultKeyStatistics;
      const d = s?.summaryDetail;
      return {
        quoteAt:
          q.regularMarketTime instanceof Date && !Number.isNaN(q.regularMarketTime.getTime())
            ? q.regularMarketTime.toISOString()
            : null,
        marketState: typeof q.marketState === "string" ? q.marketState : null,
        currentPrice: n(q.regularMarketPrice),
        previousClose: n(q.regularMarketPreviousClose),
        open: n(q.regularMarketOpen),
        dayLow: n(q.regularMarketDayLow),
        dayHigh: n(q.regularMarketDayHigh),
        low52: n(q.fiftyTwoWeekLow),
        high52: n(q.fiftyTwoWeekHigh),
        marketCap: n(q.marketCap),
        enterpriseValue: n(k?.enterpriseValue),
        trailingPe: n(q.trailingPE),
        forwardPe: n(k?.forwardPE ?? d?.forwardPE),
        priceToSales: n(d?.priceToSalesTrailing12Months),
        priceToBook: n(k?.priceToBook),
        pegRatio: n(k?.pegRatio),
        beta: n(k?.beta),
        pe: n(q.trailingPE),
        eps: n(q.epsTrailingTwelveMonths),
        forwardEps: n(k?.forwardEps),
        cash: n(f?.totalCash),
        totalDebt: n(f?.totalDebt),
        currentRatio: n(f?.currentRatio),
        quickRatio: n(f?.quickRatio),
        targetLow: n(f?.targetLowPrice),
        dividendRate: n(q.dividendRate),
        dividendYield: n(q.dividendYield),
        target: n(f?.targetMeanPrice),
        targetHigh: n(f?.targetHighPrice),
        recommendation: typeof f?.recommendationKey === "string" ? f.recommendationKey : null,
        returnOnEquity: n(f?.returnOnEquity),
        debtToEquity: n(f?.debtToEquity),
        operatingMargins: n(f?.operatingMargins),
        profitMargins: n(f?.profitMargins),
        revenueGrowth: n(f?.revenueGrowth),
        earningsGrowth: n(f?.earningsGrowth),
        earningsDate:
          earn instanceof Date && !Number.isNaN(earn.getTime()) ? earn.toISOString() : null,
        currency: q.currency ?? null,
      };
    } catch {
      return null;
    }
  });

export interface CompanyResearchData {
  retrievedAt: string;
  recommendations: {
    period: string;
    strongBuy: number;
    buy: number;
    hold: number;
    sell: number;
    strongSell: number;
  }[];
  estimates: {
    period: string;
    endDate: string | null;
    analystCount: number | null;
    epsAverage: number | null;
    epsLow: number | null;
    epsHigh: number | null;
    epsGrowth: number | null;
    revenueAverage: number | null;
    revenueLow: number | null;
    revenueHigh: number | null;
    revenueGrowth: number | null;
    epsCurrent: number | null;
    eps30DaysAgo: number | null;
    revisionsUp30Days: number | null;
    revisionsDown30Days: number | null;
  }[];
  earningsHistory: {
    period: string;
    quarter: string | null;
    epsActual: number | null;
    epsEstimate: number | null;
    surprisePercent: number | null;
  }[];
  ownership: {
    insiderPercent: number | null;
    institutionalPercent: number | null;
    institutionsCount: number | null;
    institutions: {
      name: string;
      percentHeld: number | null;
      value: number | null;
      reportDate: string | null;
    }[];
    insiders: {
      name: string;
      relation: string;
      shares: number | null;
      reportDate: string | null;
    }[];
  };
}

/** Real analyst estimates and reported ownership data; missing provider fields remain null. */
export const marketCompanyResearch = createServerFn({ method: "POST" })
  .validator((input) =>
    z.object({ symbol: z.string().regex(/^[A-Za-z0-9.^:=_-]{1,20}$/) }).parse(input),
  )
  .handler(async ({ data }): Promise<CompanyResearchData> => {
    const empty: CompanyResearchData = {
      retrievedAt: new Date().toISOString(),
      recommendations: [],
      estimates: [],
      earningsHistory: [],
      ownership: {
        insiderPercent: null,
        institutionalPercent: null,
        institutionsCount: null,
        institutions: [],
        insiders: [],
      },
    };
    const { yahooClient } = await import("./prices.server");
    const summary = await yahooClient().quoteSummary(data.symbol, {
      modules: [
        "earningsHistory",
        "earningsTrend",
        "recommendationTrend",
        "majorHoldersBreakdown",
        "institutionOwnership",
        "insiderHolders",
      ],
    });

    if (!summary) return empty;
    const numberOrNull = (value: unknown) =>
      typeof value === "number" && Number.isFinite(value) ? value : null;
    const dateOrNull = (value: unknown) => {
      if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
      return value.toISOString();
    };
    return {
      retrievedAt: new Date().toISOString(),
      recommendations: (summary.recommendationTrend?.trend ?? []).map((item) => ({
        period: item.period,
        strongBuy: item.strongBuy,
        buy: item.buy,
        hold: item.hold,
        sell: item.sell,
        strongSell: item.strongSell,
      })),
      estimates: (summary.earningsTrend?.trend ?? []).map((item) => ({
        period: item.period,
        endDate: dateOrNull(item.endDate),
        analystCount: numberOrNull(item.earningsEstimate.numberOfAnalysts),
        epsAverage: numberOrNull(item.earningsEstimate.avg),
        epsLow: numberOrNull(item.earningsEstimate.low),
        epsHigh: numberOrNull(item.earningsEstimate.high),
        epsGrowth: numberOrNull(item.earningsEstimate.growth),
        revenueAverage: numberOrNull(item.revenueEstimate.avg),
        revenueLow: numberOrNull(item.revenueEstimate.low),
        revenueHigh: numberOrNull(item.revenueEstimate.high),
        revenueGrowth: numberOrNull(item.revenueEstimate.growth),
        epsCurrent: numberOrNull(item.epsTrend.current),
        eps30DaysAgo: numberOrNull(item.epsTrend["30daysAgo"]),
        revisionsUp30Days: numberOrNull(item.epsRevisions.upLast30days),
        revisionsDown30Days: numberOrNull(item.epsRevisions.downLast30days),
      })),
      earningsHistory: (summary.earningsHistory?.history ?? []).map((item) => ({
        period: item.period,
        quarter: dateOrNull(item.quarter),
        epsActual: numberOrNull(item.epsActual),
        epsEstimate: numberOrNull(item.epsEstimate),
        surprisePercent: numberOrNull(item.surprisePercent),
      })),
      ownership: {
        insiderPercent: numberOrNull(summary.majorHoldersBreakdown?.insidersPercentHeld),
        institutionalPercent: numberOrNull(summary.majorHoldersBreakdown?.institutionsPercentHeld),
        institutionsCount: numberOrNull(summary.majorHoldersBreakdown?.institutionsCount),
        institutions: (summary.institutionOwnership?.ownershipList ?? [])
          .slice(0, 10)
          .map((item) => ({
            name: item.organization,
            percentHeld: numberOrNull(item.pctHeld),
            value: numberOrNull(item.value),
            reportDate: dateOrNull(item.reportDate),
          })),
        insiders: (summary.insiderHolders?.holders ?? []).slice(0, 10).map((item) => ({
          name: item.name,
          relation: String(item.relation ?? ""),
          shares: numberOrNull(item.positionSummary),
          reportDate: dateOrNull(item.positionSummaryDate),
        })),
      },
    };
  });

export const marketEarningsCalendar = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        symbols: z
          .array(z.string().regex(/^[A-Za-z0-9.^:=_-]{1,20}$/))
          .max(100)
          .transform((symbols) => [...new Set(symbols.map((symbol) => symbol.toUpperCase()))]),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<EarningsCalendarData> => {
    const result: EarningsCalendarData = {
      upcoming: [],
      reported: [],
      unavailableSymbols: [],
      retrievedAt: new Date().toISOString(),
    };
    const { yahooClient } = await import("./prices.server");
    const yf = yahooClient();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const asDate = (value: unknown) =>
      value instanceof Date && Number.isFinite(value.getTime()) ? value : null;
    const numberOrNull = (value: unknown) =>
      typeof value === "number" && Number.isFinite(value) ? value : null;

    for (let start = 0; start < data.symbols.length; start += 5) {
      const batch = data.symbols.slice(start, start + 5);
      const responses = await Promise.all(
        batch.map(async (symbol) => {
          try {
            const summary = await yf.quoteSummary(symbol, {
              modules: ["calendarEvents", "earningsHistory"],
            });
            return { symbol, summary, failed: false };
          } catch {
            return { symbol, summary: null, failed: true };
          }
        }),
      );
      for (const { symbol, summary, failed } of responses) {
        if (failed || !summary) {
          result.unavailableSymbols.push(symbol);
          continue;
        }
        const calendar = summary.calendarEvents?.earnings;
        const nextDate = (calendar?.earningsDate ?? [])
          .filter((date) => date instanceof Date && date >= today)
          .sort((a, b) => a.getTime() - b.getTime())[0];
        if (nextDate) {
          result.upcoming.push({
            symbol,
            date: nextDate.toISOString(),
            dateEstimated: calendar?.isEarningsDateEstimate !== false,
            epsEstimate: numberOrNull(calendar?.earningsAverage),
            revenueEstimate: numberOrNull(calendar?.revenueAverage),
          });
        }

        for (const item of summary.earningsHistory?.history ?? []) {
          const quarter = asDate(item.quarter);
          if (!quarter || quarter >= today) continue;
          const actualEps = numberOrNull(item.epsActual);
          const estimatedEps = numberOrNull(item.epsEstimate);
          if (actualEps === null && estimatedEps === null) continue;
          result.reported.push({
            symbol,
            period: quarter.toISOString().slice(0, 10),
            actualEps,
            estimatedEps,
            surprisePercent:
              numberOrNull(item.surprisePercent) ??
              earningsSurprisePercent(actualEps, estimatedEps),
          });
        }
      }
    }

    return sortEarningsCalendar(result);
  });

export interface DcfData {
  symbol: string;
  name: string;
  quoteType: string | null;
  price: number | null;
  priceAsOf: string | null;
  currency: string | null;
  finCurrency: string | null;
  fcf: number | null;
  fcfPeriodEnd: string | null;
  fcfPeriodType: "12M" | null;
  operatingCashFlow: number | null;
  capitalExpenditure: number | null;
  cash: number | null;
  debt: number | null;
  shares: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  fetchedAt: string;
}

/** Real Yahoo fundamentals for a DCF; missing figures stay null so the UI can say the model is not applicable. */
export const marketDcf = createServerFn({ method: "POST" })
  .validator((input) =>
    z.object({ symbol: z.string().regex(/^[A-Za-z0-9.^:=_-]{1,20}$/) }).parse(input),
  )
  .handler(async ({ data }): Promise<DcfData | null> => {
    const { yahooClient } = await import("./prices.server");
    const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    try {
      const yahoo = yahooClient();
      const [s, cashFlowRows] = await Promise.all([
        yahoo.quoteSummary(data.symbol, {
          modules: ["financialData", "defaultKeyStatistics", "price"],
        }),
        yahoo.fundamentalsTimeSeries(data.symbol, {
          period1: new Date(Date.UTC(new Date().getUTCFullYear() - 6, 0, 1)),
          type: "annual",
          module: "cash-flow",
        }),
      ]);
      const f = s.financialData;
      const k = s.defaultKeyStatistics;
      const p = s.price;
      const cashFlow = cashFlowRows
        .filter(
          (row) =>
            row.TYPE === "CASH_FLOW" &&
            row.periodType === "12M" &&
            row.date instanceof Date &&
            Number.isFinite(row.date.getTime()) &&
            row.date.getTime() <= Date.now(),
        )
        .sort((a, b) => b.date.getTime() - a.date.getTime())[0];
      const operatingCashFlow = n(
        cashFlow?.TYPE === "CASH_FLOW" ? cashFlow.operatingCashFlow : null,
      );
      const capitalExpenditureRaw = n(
        cashFlow?.TYPE === "CASH_FLOW" ? cashFlow.capitalExpenditure : null,
      );
      const capitalExpenditure =
        capitalExpenditureRaw == null ? null : Math.abs(capitalExpenditureRaw);
      const fcf =
        operatingCashFlow != null && capitalExpenditure != null
          ? operatingCashFlow - capitalExpenditure
          : null;
      const marketTime = (p as { regularMarketTime?: unknown } | undefined)?.regularMarketTime;
      const marketDate =
        marketTime instanceof Date
          ? marketTime
          : typeof marketTime === "number" && Number.isFinite(marketTime)
            ? new Date(marketTime < 1_000_000_000_000 ? marketTime * 1000 : marketTime)
            : null;
      return {
        symbol: data.symbol.toUpperCase(),
        name: p?.longName ?? p?.shortName ?? data.symbol,
        quoteType: p?.quoteType ?? null,
        price: n(f?.currentPrice ?? p?.regularMarketPrice),
        priceAsOf:
          marketDate && Number.isFinite(marketDate.getTime()) ? marketDate.toISOString() : null,
        currency: p?.currency ?? null,
        finCurrency: f?.financialCurrency ?? null,
        fcf,
        fcfPeriodEnd: cashFlow?.date.toISOString() ?? null,
        fcfPeriodType: cashFlow?.periodType === "12M" ? "12M" : null,
        operatingCashFlow,
        capitalExpenditure,
        cash: n(f?.totalCash),
        debt: n(f?.totalDebt),
        shares: n(k?.sharesOutstanding),
        revenueGrowth: n(f?.revenueGrowth),
        earningsGrowth: n(f?.earningsGrowth),
        fetchedAt: new Date().toISOString(),
      };
    } catch {
      throw new Error("Financial data is temporarily unavailable. Please try again.");
    }
  });

export interface CompanyOverview {
  name: string | null;
  description: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  city: string | null;
  website: string | null;
  employees: number | null;
  news: MarketNews[];
}

/** Real Yahoo company profile and symbol-related news; missing fields stay null. */
export const marketOverview = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        symbol: z.string().regex(/^[A-Za-z0-9.^:=_-]{1,20}$/),
        type: z.enum(["stock", "etf", "crypto"]),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<CompanyOverview> => {
    const { yahooClient } = await import("./prices.server");
    const yf = yahooClient();
    const symbol = data.type === "crypto" ? `${data.symbol.toUpperCase()}-USD` : data.symbol;
    const [s, r] = await Promise.all([
      data.type === "crypto"
        ? null
        : yf.quoteSummary(symbol, { modules: ["assetProfile", "price"] }).catch(() => null),
      yf.search(symbol, { newsCount: 8, quotesCount: 0 }).catch(() => null),
    ]);
    const a = s?.assetProfile;
    const news = dedupeMarketNews(
      (r?.news ?? [])
        .filter((n) => n.title && /^https:\/\//.test(n.link))
        .map((n) => ({
          id: n.uuid,
          title: n.title,
          publisher: n.publisher ?? "",
          link: n.link,
          at: n.providerPublishTime ? new Date(n.providerPublishTime).toISOString() : null,
          tickers: (n.relatedTickers ?? []).slice(0, 4),
          image: thumb(n as Thumb),
        })),
    );
    return {
      name: s?.price?.longName ?? s?.price?.shortName ?? null,
      description: a?.longBusinessSummary ?? null,
      sector: a?.sector ?? null,
      industry: a?.industry ?? null,
      country: a?.country ?? null,
      city: a?.city ?? null,
      website: a?.website && /^https?:\/\//.test(a.website) ? a.website : null,
      employees: typeof a?.fullTimeEmployees === "number" ? a.fullTimeEmployees : null,
      news,
    };
  });

export const marketEtfHoldings = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        symbols: z
          .array(z.string().regex(/^[A-Za-z0-9.^:=_-]{1,20}$/))
          .min(1)
          .max(10),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { yahooClient } = await import("./prices.server");
    const yf = yahooClient();
    const results = await Promise.all(
      [...new Set(data.symbols.map((symbol) => symbol.toUpperCase()))].map(async (symbol) => {
        const summary = await yf
          .quoteSummary(symbol, { modules: ["topHoldings"] })
          .catch(() => null);
        const holdings = summary?.topHoldings?.holdings
          ?.filter(
            (holding) =>
              /^[A-Z0-9.^=_-]{1,20}$/i.test(holding.symbol) &&
              Number.isFinite(holding.holdingPercent) &&
              holding.holdingPercent > 0,
          )
          .map((holding) => ({
            symbol: holding.symbol.toUpperCase(),
            name: holding.holdingName,
            weight:
              holding.holdingPercent <= 1 ? holding.holdingPercent : holding.holdingPercent / 100,
          }));
        return holdings?.length ? { symbol, holdings } : null;
      }),
    );
    return {
      funds: results.filter((result): result is NonNullable<typeof result> => result !== null),
      fetchedAt: new Date().toISOString(),
    };
  });
