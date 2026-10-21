import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { marketSearchSchema, searchCatalog, type MarketAsset } from "./market-search";

export interface MarketNews { id: string; title: string; publisher: string; link: string; at: string | null; tickers: string[]; image: string | null }

type Thumb = { thumbnail?: { resolutions?: { url: string; width: number }[] } };
/** Pick the smallest provider thumbnail ≥ 140px wide; https only, never a substitute image. */
function thumb(n: Thumb): string | null {
  const r = (n.thumbnail?.resolutions ?? []).filter((x) => /^https:\/\//.test(x.url)).sort((a, b) => a.width - b.width);
  return (r.find((x) => x.width >= 140) ?? r[r.length - 1])?.url ?? null;
}

export const searchMarket = createServerFn({ method: "POST" })
  .inputValidator((input) => marketSearchSchema.parse(input))
  .handler(async ({ data }): Promise<{ assets: MarketAsset[]; news: MarketNews[]; unavailable: boolean }> => {
    const fallback = searchCatalog(data.query);
    try {
      const { yahooClient } = await import("./prices.server");
      const result = await yahooClient().search(data.query, { newsCount: 8 });
      const assets = new Map(fallback.map((a) => [a.symbol, a]));
      for (const a of result.quotes) {
        if (!a.isYahooFinance || !a.symbol || !["EQUITY", "ETF"].includes(a.quoteType ?? "")) continue;
        assets.set(a.symbol, { symbol: a.symbol, name: a.longname ?? a.shortname ?? a.symbol, type: a.quoteType === "ETF" ? "etf" : "stock" });
      }
      const news: MarketNews[] = (result.news ?? []).filter((n) => n.title && /^https:\/\//.test(n.link)).map((n) => ({
        id: n.uuid, title: n.title, publisher: n.publisher ?? "", link: n.link,
        at: n.providerPublishTime ? new Date(n.providerPublishTime).toISOString() : null,
        tickers: (n.relatedTickers ?? []).slice(0, 4), image: thumb(n as Thumb),
      }));
      return { assets: [...assets.values()].slice(0, 20), news, unavailable: false };
    } catch { return { assets: fallback, news: [], unavailable: true }; }
  });

export const marketQuote = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ symbol: z.string().regex(/^[A-Za-z0-9.^:=_-]{1,20}$/), type: z.enum(["stock", "etf", "crypto"]) }).parse(input))
  .handler(async ({ data }) => {
    const { fetchLiveQuote } = await import("./prices.server");
    const quote = await fetchLiveQuote(data.symbol, data.type);
    return { quote, reason: quote ? null : "unavailable" as const };
  });

export interface ExtendedQuote { session: "pre" | "post"; price: number; change: number; changePct: number; at: string }
const extCache = new Map<string, { at: number; v: ExtendedQuote | null }>();
/** Pre-market / after-hours price for US listings; null while the regular session is open or when the provider has none. */
export const marketExtended = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ symbol: z.string().regex(/^[A-Za-z0-9.^:=_-]{1,20}$/) }).parse(input))
  .handler(async ({ data }): Promise<{ ext: ExtendedQuote | null }> => {
    const k = data.symbol.toUpperCase();
    const hit = extCache.get(k);
    if (hit && Date.now() - hit.at < 60_000) return { ext: hit.v };
    let v: ExtendedQuote | null = null;
    try {
      const { yahooClient } = await import("./prices.server");
      const q = await yahooClient().quote(data.symbol) as Record<string, unknown>;
      const state = String(q["marketState"] ?? "");
      const pick = (p: "pre" | "post"): ExtendedQuote | null => {
        const price = q[`${p}MarketPrice`] as number | undefined, ch = q[`${p}MarketChange`] as number | undefined;
        const pct = q[`${p}MarketChangePercent`] as number | undefined, t = q[`${p}MarketTime`] as Date | undefined;
        return price && price > 0 && ch != null && pct != null && t ? { session: p, price, change: ch, changePct: pct, at: new Date(t).toISOString() } : null;
      };
      if (state === "PRE" || state === "PREPRE") v = pick("pre");
      else if (state === "POST" || state === "POSTPOST" || state === "CLOSED") v = pick("post");
    } catch { v = null; }
    extCache.set(k, { at: Date.now(), v });
    return { ext: v };
  });

export const getExchangeRate = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchFx } = await import("./prices.server");
  return { eurPerUsd: await fetchFx() };
});

export const CHART_RANGES = ["1D", "1W", "1M", "3M", "6M", "1Y", "3Y", "MAX"] as const;
export type ChartRange = typeof CHART_RANGES[number];
const RANGE_CFG: Record<ChartRange, { days: number; interval: "5m" | "30m" | "1d" | "1wk" | "1mo" }> = {
  "1D": { days: 1, interval: "5m" }, "1W": { days: 7, interval: "30m" }, "1M": { days: 31, interval: "1d" }, "3M": { days: 92, interval: "1d" },
  "6M": { days: 183, interval: "1d" }, "1Y": { days: 366, interval: "1d" }, "3Y": { days: 1096, interval: "1wk" }, MAX: { days: 0, interval: "1mo" },
};

/** Real provider closes for the chosen range plus 52-week range; empty when unavailable (never synthesized). */
export const marketDetails = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ symbol: z.string().regex(/^[A-Za-z0-9.^:=_-]{1,20}$/), type: z.enum(["stock", "etf", "crypto"]), range: z.enum(CHART_RANGES).default("1Y") }).parse(input))
  .handler(async ({ data }): Promise<{ closes: { t: number; c: number }[]; low: number | null; high: number | null; currency: string | null }> => {
    const { yahooClient, CRYPTO_IDS } = await import("./prices.server");
    const empty = { closes: [], low: null, high: null, currency: null };
    const cfg = RANGE_CFG[data.range];
    try {
      // CoinGecko free API covers up to 365 days; longer crypto ranges use Yahoo's USD pair for the whole chart.
      if (data.type === "crypto" && cfg.days > 0 && cfg.days <= 366) {
        const id = CRYPTO_IDS[data.symbol.toUpperCase()];
        if (!id) return empty;
        const days = Math.min(cfg.days, 365);
        const r = await fetch(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}${days > 90 ? "&interval=daily" : ""}`, { signal: AbortSignal.timeout(10000) });
        if (!r.ok) return empty;
        const json = await r.json() as { prices?: [number, number][] };
        const closes = (json.prices ?? []).filter(([, c]) => c > 0).map(([t, c]) => ({ t, c }));
        const vals = closes.map((x) => x.c);
        return { closes, low: vals.length ? Math.min(...vals) : null, high: vals.length ? Math.max(...vals) : null, currency: "USD" };
      }
      const symbol = data.type === "crypto" ? `${data.symbol.toUpperCase()}-USD` : data.symbol;
      const period1 = cfg.days > 0 ? new Date(Date.now() - cfg.days * 86400000) : new Date("1970-01-02");
      const chart = await yahooClient().chart(symbol, { period1, interval: cfg.interval });
      const closes = chart.quotes.filter((q) => q.close != null && q.close > 0).map((q) => ({ t: q.date.getTime(), c: q.close as number }));
      const m = chart.meta as { fiftyTwoWeekLow?: number; fiftyTwoWeekHigh?: number; currency?: string };
      const vals = closes.map((x) => x.c);
      const fromData = data.range === "1Y";
      return { closes, low: m.fiftyTwoWeekLow ?? (fromData && vals.length ? Math.min(...vals) : null), high: m.fiftyTwoWeekHigh ?? (fromData && vals.length ? Math.max(...vals) : null), currency: m.currency ?? null };
    } catch { return empty; }
  });

export interface KeyStats {
  previousClose: number | null; open: number | null; dayLow: number | null; dayHigh: number | null;
  low52: number | null; high52: number | null; marketCap: number | null; beta: number | null;
  pe: number | null; eps: number | null; dividendRate: number | null; dividendYield: number | null;
  target: number | null; earningsDate: string | null; currency: string | null;
}

/** Yahoo key statistics for stocks/ETFs; every missing figure stays null (never estimated). */
export const marketStats = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ symbol: z.string().regex(/^[A-Za-z0-9.^:=_-]{1,20}$/) }).parse(input))
  .handler(async ({ data }): Promise<KeyStats | null> => {
    const { yahooClient } = await import("./prices.server");
    const yf = yahooClient();
    const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    try {
      const [q, s] = await Promise.all([
        yf.quote(data.symbol),
        yf.quoteSummary(data.symbol, { modules: ["defaultKeyStatistics", "financialData"] }).catch(() => null),
      ]);
      if (!q) return null;
      const earn = q.earningsTimestampStart ?? q.earningsTimestamp;
      return {
        previousClose: n(q.regularMarketPreviousClose), open: n(q.regularMarketOpen),
        dayLow: n(q.regularMarketDayLow), dayHigh: n(q.regularMarketDayHigh),
        low52: n(q.fiftyTwoWeekLow), high52: n(q.fiftyTwoWeekHigh), marketCap: n(q.marketCap),
        beta: n(s?.defaultKeyStatistics?.beta), pe: n(q.trailingPE), eps: n(q.epsTrailingTwelveMonths),
        dividendRate: n(q.dividendRate), dividendYield: n(q.dividendYield),
        target: n(s?.financialData?.targetMeanPrice),
        earningsDate: earn instanceof Date && !Number.isNaN(earn.getTime()) ? earn.toISOString() : null,
        currency: q.currency ?? null,
      };
    } catch { return null; }
  });

export interface DcfData { symbol: string; name: string; price: number | null; currency: string | null; finCurrency: string | null; fcf: number | null; cash: number | null; debt: number | null; shares: number | null; revenueGrowth: number | null; earningsGrowth: number | null }

/** Real Yahoo fundamentals for a DCF; missing figures stay null so the UI can say the model is not applicable. */
export const marketDcf = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ symbol: z.string().regex(/^[A-Za-z0-9.^:=_-]{1,20}$/) }).parse(input))
  .handler(async ({ data }): Promise<DcfData | null> => {
    const { yahooClient } = await import("./prices.server");
    const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    try {
      const s = await yahooClient().quoteSummary(data.symbol, { modules: ["financialData", "defaultKeyStatistics", "price"] });
      const f = s.financialData; const k = s.defaultKeyStatistics; const p = s.price;
      return {
        symbol: data.symbol.toUpperCase(), name: p?.longName ?? p?.shortName ?? data.symbol,
        price: n(f?.currentPrice ?? p?.regularMarketPrice), currency: p?.currency ?? null, finCurrency: f?.financialCurrency ?? null,
        fcf: n(f?.freeCashflow), cash: n(f?.totalCash), debt: n(f?.totalDebt),
        shares: n(k?.sharesOutstanding), revenueGrowth: n(f?.revenueGrowth), earningsGrowth: n(f?.earningsGrowth),
      };
    } catch { return null; }
  });

export interface CompanyOverview {
  name: string | null; description: string | null; sector: string | null; industry: string | null; country: string | null;
  city: string | null; website: string | null; employees: number | null; news: MarketNews[];
}

/** Real Yahoo company profile and symbol-related news; missing fields stay null. */
export const marketOverview = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ symbol: z.string().regex(/^[A-Za-z0-9.^:=_-]{1,20}$/), type: z.enum(["stock", "etf", "crypto"]) }).parse(input))
  .handler(async ({ data }): Promise<CompanyOverview> => {
    const { yahooClient } = await import("./prices.server");
    const yf = yahooClient();
    const symbol = data.type === "crypto" ? `${data.symbol.toUpperCase()}-USD` : data.symbol;
    const [s, r] = await Promise.all([
      data.type === "crypto" ? null : yf.quoteSummary(symbol, { modules: ["assetProfile", "price"] }).catch(() => null),
      yf.search(symbol, { newsCount: 8, quotesCount: 0 }).catch(() => null),
    ]);
    const a = s?.assetProfile;
    const news: MarketNews[] = (r?.news ?? []).filter((n) => n.title && /^https:\/\//.test(n.link)).map((n) => ({
      id: n.uuid, title: n.title, publisher: n.publisher ?? "", link: n.link,
      at: n.providerPublishTime ? new Date(n.providerPublishTime).toISOString() : null, tickers: (n.relatedTickers ?? []).slice(0, 4), image: thumb(n as Thumb),
    }));
    return {
      name: s?.price?.longName ?? s?.price?.shortName ?? null, description: a?.longBusinessSummary ?? null,
      sector: a?.sector ?? null, industry: a?.industry ?? null, country: a?.country ?? null, city: a?.city ?? null,
      website: a?.website && /^https?:\/\//.test(a.website) ? a.website : null,
      employees: typeof a?.fullTimeEmployees === "number" ? a.fullTimeEmployees : null, news,
    };
  });
