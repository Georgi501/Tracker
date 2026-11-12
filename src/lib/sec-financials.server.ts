import { z } from "zod";
import { extractSecAnnualHistory, type SecAnnualRow } from "./sec-financials";

const tickerSchema = z.record(
  z.string(),
  z.object({
    cik_str: z.number().int().positive(),
    ticker: z.string(),
  }),
);
const normalizeTicker = (symbol: string) => symbol.toUpperCase().replaceAll(".", "-");
const DAY = 86_400_000;
type History = ReturnType<typeof extractSecAnnualHistory>;

/** Shared public-data cache and queue; no account/portfolio data enters this service. */
export function createSecFinancialService({
  fetcher = fetch,
  now = Date.now,
  wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
}: { fetcher?: typeof fetch; now?: () => number; wait?: (ms: number) => Promise<void> } = {}) {
  let queue: Promise<unknown> = Promise.resolve();
  let lastRequest = -Infinity;
  let tickers: { expires: number; value: Promise<Map<string, number>> } | null = null;
  const histories = new Map<string, { expires: number; value: Promise<History> }>();
  async function request(url: string) {
    const task = queue.then(async () => {
      await wait(Math.max(0, 500 - (now() - lastRequest)));
      lastRequest = now();
      const response = await fetcher(url, {
        headers: { "User-Agent": "CapiSpot support@capispot.com", Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`SEC financial data HTTP ${response.status}`);
      return response.json() as Promise<unknown>;
    });
    queue = task.catch(() => undefined);
    return task;
  }
  async function resolveCik(symbol: string) {
    if (!tickers || tickers.expires <= now()) {
      const value = request("https://www.sec.gov/files/company_tickers.json").then((payload) => {
        const mapping = new Map<string, number>();
        for (const entry of Object.values(tickerSchema.parse(payload))) {
          const ticker = normalizeTicker(entry.ticker);
          const existing = mapping.get(ticker);
          if (existing != null && existing !== entry.cik_str)
            throw new Error("Ambiguous SEC ticker mapping.");
          mapping.set(ticker, entry.cik_str);
        }
        return mapping;
      });
      const entry = { expires: now() + DAY, value };
      tickers = entry;
      void value.catch(() => {
        if (tickers === entry) tickers = null;
      });
    }
    return (await tickers.value).get(normalizeTicker(symbol)) ?? null;
  }
  return async function annual(symbol: string) {
    const cik = await resolveCik(symbol);
    if (cik == null) return null; // Unsupported listing: caller may use a separately labelled provider.
    const asOf = new Date(now()).toISOString().slice(0, 10);
    const key = `${cik}:${asOf}`;
    let cached = histories.get(key);
    if (!cached || cached.expires <= now()) {
      const value = request(
        `https://data.sec.gov/api/xbrl/companyfacts/CIK${String(cik).padStart(10, "0")}.json`,
      ).then((payload) => {
        const history = extractSecAnnualHistory(payload, { asOf, years: 10 });
        if (history.cik !== cik) throw new Error("SEC company identity mismatch.");
        return history;
      });
      cached = { expires: now() + 6 * 60 * 60_000, value };
      histories.set(key, cached);
      const entry = cached;
      void value.catch(() => {
        if (histories.get(key) === entry) histories.delete(key);
      });
      if (histories.size > 32) histories.delete(histories.keys().next().value!);
    }
    const history = await cached.value;
    if (
      !history.rows.some(
        (row) => row.revenue != null || row.netIncome != null || row.operatingCashFlow != null,
      )
    )
      return null;
    // Retain the latest reported EPS only. A dated, split-reconciled history is required before
    // comparing EPS across filings; do not join raw and split-adjusted share bases.
    const latestEps = [...history.rows].reverse().find((row) => row.dilutedEps != null)?.date;
    const rows = history.rows.map(({ sources: _sources, start: _start, ...row }) => ({
      ...row,
      dilutedEps: row.date === latestEps ? row.dilutedEps : null,
    }));
    const filing = (row: SecAnnualRow) =>
      row.sources.revenue ?? row.sources.netIncome ?? row.sources.operatingCashFlow;
    const filings = Object.fromEntries(
      history.rows.flatMap((row) => {
        const source = filing(row);
        return source ? [[row.date, source.filingUrl]] : [];
      }),
    );
    return {
      rows,
      currency: history.currency,
      source: "SEC EDGAR" as const,
      epsHistoryUnavailable: true,
      filings,
    };
  };
}

export const fetchSecAnnualFinancials = createSecFinancialService();
