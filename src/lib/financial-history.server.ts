import { z } from "zod";
import type { FinancialSeriesRow } from "./financial-series";

const metrics = {
  TotalRevenue: "revenue",
  CostOfRevenue: "costOfRevenue",
  GrossProfit: "grossProfit",
  OperatingIncome: "operatingIncome",
  OperatingExpense: "operatingExpense",
  NetIncome: "netIncome",
  DilutedEPS: "dilutedEps",
  OperatingCashFlow: "operatingCashFlow",
  FreeCashFlow: "freeCashFlow",
} as const;

const pointSchema = z.object({
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodType: z.string(),
  currencyCode: z.string(),
  reportedValue: z.object({ raw: z.number().finite() }),
});
const responseSchema = z.object({
  timeseries: z.object({
    error: z.unknown().optional(),
    result: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
  }),
});

/** Use reported asOfDate, not the position in the timestamp array; retain reported zeros. */
export function parseAnnualFinancials(payload: unknown) {
  const { timeseries } = responseSchema.parse(payload);
  if (timeseries.error) throw new Error("Yahoo financial history request failed.");
  const rows = new Map<string, FinancialSeriesRow>();
  const currencies = new Set<string>();
  for (const series of timeseries.result ?? []) {
    for (const [providerKey, metric] of Object.entries(metrics)) {
      const points = series[`annual${providerKey}`];
      if (!Array.isArray(points)) continue;
      for (const candidate of points) {
        const parsed = pointSchema.safeParse(candidate);
        if (!parsed.success || parsed.data.periodType !== "12M") continue;
        const point = parsed.data;
        currencies.add(point.currencyCode);
        const row = rows.get(point.asOfDate) ?? {
          date: point.asOfDate,
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
        row[metric] = point.reportedValue.raw;
        rows.set(point.asOfDate, row);
      }
    }
  }
  if (currencies.size > 1) throw new Error("Mixed financial reporting currencies.");
  return {
    rows: [...rows.values()].sort((a, b) => a.date.localeCompare(b.date)),
    currency: [...currencies][0] ?? null,
  };
}

/**
 * Yahoo can omit an older report from a wide query while returning it with an earlier period2.
 * Request disjoint windows of at most four years; no synthetic or alternative-provider data.
 */
export async function fetchAnnualFinancialHistory(
  symbol: string,
  start: Date,
  end = new Date(),
  fetcher: typeof fetch = fetch,
) {
  const rows = new Map<string, FinancialSeriesRow>();
  const currencies = new Set<string>();
  let windowEnd = new Date(end);
  while (windowEnd > start) {
    const windowStart = new Date(windowEnd);
    windowStart.setUTCFullYear(windowStart.getUTCFullYear() - 4);
    if (windowStart < start) windowStart.setTime(start.getTime());
    const url = new URL(
      `https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}`,
    );
    url.searchParams.set(
      "type",
      Object.keys(metrics)
        .map((key) => `annual${key}`)
        .join(","),
    );
    url.searchParams.set("period1", String(Math.floor(windowStart.getTime() / 1000)));
    url.searchParams.set("period2", String(Math.floor(windowEnd.getTime() / 1000)));
    const response = await fetcher(url, {
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CapiSpot/1.0)",
        Accept: "application/json",
      },
    });
    if (!response.ok) throw new Error(`Yahoo financial history HTTP ${response.status}`);
    const result = parseAnnualFinancials(await response.json());
    if (result.currency) currencies.add(result.currency);
    for (const row of result.rows) {
      if (row.date >= start.toISOString().slice(0, 10) && row.date < end.toISOString().slice(0, 10))
        rows.set(row.date, row);
    }
    windowEnd = windowStart;
  }
  if (currencies.size > 1) throw new Error("Mixed financial reporting currencies.");
  return {
    rows: [...rows.values()].sort((a, b) => a.date.localeCompare(b.date)),
    currency: [...currencies][0] ?? null,
  };
}
