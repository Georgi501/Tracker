import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { marketSearchSchema, searchCatalog, type MarketAsset } from "./market-search";
import { dedupeMarketNews } from "./market-news";

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
  .inputValidator((input) => marketSearchSchema.parse(input))
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
  .inputValidator((input) =>
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
  .inputValidator((input) =>
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
  const { fetchFx } = await import("./prices.server");
  return { eurPerUsd: await fetchFx() };
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

/** Real provider closes for the chosen range plus 52-week range; empty when unavailable (never synthesized). */
export const marketDetails = createServerFn({ method: "POST" })
  .inputValidator((input) =>
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
      low: number | null;
      high: number | null;
      currency: string | null;
    }> => {
      const { yahooClient } = await import("./prices.server");
      const empty = { closes: [], low: null, high: null, currency: null };
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
        const chart = await yahooClient().chart(symbol, { period1, interval: cfg.interval });
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
        };
        const vals = closes.map((x) => x.c);
        const fromData = data.range === "1Y";
        return {
          closes,
          low: m.fiftyTwoWeekLow ?? (fromData && vals.length ? Math.min(...vals) : null),
          high: m.fiftyTwoWeekHigh ?? (fromData && vals.length ? Math.max(...vals) : null),
          currency: m.currency ?? null,
        };
      } catch {
        return empty;
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

export interface FinancialSeriesRow {
  date: string;
  revenue: number | null;
  costOfRevenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  operatingExpense: number | null;
  netIncome: number | null;
  dilutedEps: number | null;
  operatingCashFlow: number | null;
  freeCashFlow: number | null;
}

export interface FinancialSeries {
  rows: FinancialSeriesRow[];
  currency: string | null;
}

/** Reported company financials; missing provider values remain null. */
export const marketFinancialSeries = createServerFn({ method: "POST" })
  .inputValidator((input) =>
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
    const period1 = new Date(Date.now() - data.years * 365.25 * 24 * 60 * 60 * 1000);
    const moduleOptions =
      data.period === "trailing" ? { validateResult: false as const } : undefined;
    const [income, cashFlow, quote] = await Promise.all([
      yf.fundamentalsTimeSeries(
        data.symbol,
        { period1, type: data.period, module: "financials" },
        moduleOptions,
      ),
      yf.fundamentalsTimeSeries(
        data.symbol,
        { period1, type: data.period, module: "cash-flow" },
        moduleOptions,
      ),
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
    return {
      rows: [...rows.values()].sort((a, b) => a.date.localeCompare(b.date)),
      currency: quote?.currency ?? null,
    };
  });

/** Yahoo key statistics for stocks/ETFs; every missing figure stays null (never estimated). */
export const marketStats = createServerFn({ method: "POST" })
  .inputValidator((input) =>
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
  .inputValidator((input) =>
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

export interface DcfData {
  symbol: string;
  name: string;
  price: number | null;
  currency: string | null;
  finCurrency: string | null;
  fcf: number | null;
  cash: number | null;
  debt: number | null;
  shares: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
}

/** Real Yahoo fundamentals for a DCF; missing figures stay null so the UI can say the model is not applicable. */
export const marketDcf = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ symbol: z.string().regex(/^[A-Za-z0-9.^:=_-]{1,20}$/) }).parse(input),
  )
  .handler(async ({ data }): Promise<DcfData | null> => {
    const { yahooClient } = await import("./prices.server");
    const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    try {
      const s = await yahooClient().quoteSummary(data.symbol, {
        modules: ["financialData", "defaultKeyStatistics", "price"],
      });
      const f = s.financialData;
      const k = s.defaultKeyStatistics;
      const p = s.price;
      return {
        symbol: data.symbol.toUpperCase(),
        name: p?.longName ?? p?.shortName ?? data.symbol,
        price: n(f?.currentPrice ?? p?.regularMarketPrice),
        currency: p?.currency ?? null,
        finCurrency: f?.financialCurrency ?? null,
        fcf: n(f?.freeCashflow),
        cash: n(f?.totalCash),
        debt: n(f?.totalDebt),
        shares: n(k?.sharesOutstanding),
        revenueGrowth: n(f?.revenueGrowth),
        earningsGrowth: n(f?.earningsGrowth),
      };
    } catch {
      return null;
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
  .inputValidator((input) =>
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
