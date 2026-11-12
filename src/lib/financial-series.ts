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

type FinancialMetricKey = Exclude<keyof FinancialSeriesRow, "date">;

const FINANCIAL_METRICS: FinancialMetricKey[] = [
  "revenue",
  "costOfRevenue",
  "grossProfit",
  "operatingIncome",
  "operatingExpense",
  "netIncome",
  "dilutedEps",
  "operatingCashFlow",
  "freeCashFlow",
];

export interface AnnualSlot {
  year: number;
  expectedDate: string;
  row: FinancialSeriesRow | null;
}

const DAY_MS = 86_400_000;

/**
 * One slot per fiscal year, ending at the latest reported year, so every metric shares the same axis.
 * A slot is matched by period-end date (±45 days covers 52/53-week years); unmatched slots stay empty.
 */
export function buildAnnualAxis(rows: FinancialSeriesRow[], years: number): AnnualSlot[] {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const anchor =
    [...sorted].reverse().find((row) => FINANCIAL_METRICS.some((metric) => row[metric] != null)) ??
    sorted.at(-1);
  if (!anchor) return [];
  const end = new Date(`${anchor.date}T00:00:00Z`);
  if (Number.isNaN(end.getTime())) return [];

  const slots: AnnualSlot[] = [];
  for (let offset = years - 1; offset >= 0; offset -= 1) {
    const expected = new Date(
      Date.UTC(end.getUTCFullYear() - offset, end.getUTCMonth(), end.getUTCDate()),
    );
    const row =
      sorted.find(
        (candidate) =>
          Math.abs(Date.parse(`${candidate.date}T00:00:00Z`) - expected.getTime()) <= 45 * DAY_MS,
      ) ?? null;
    slots.push({
      year: expected.getUTCFullYear(),
      expectedDate: expected.toISOString().slice(0, 10),
      row,
    });
  }
  return slots;
}

export function filterFinancialRows(
  rows: FinancialSeriesRow[],
  startDate: Date,
): FinancialSeriesRow[] {
  const start = startDate.toISOString().slice(0, 10);
  return rows.filter((row) => row.date >= start);
}

export function toTrailingFinancialRows(rows: FinancialSeriesRow[]): FinancialSeriesRow[] {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const trailingRows: FinancialSeriesRow[] = [];

  for (let index = 3; index < sorted.length; index += 1) {
    const window = sorted.slice(index - 3, index + 1);
    const consecutiveQuarters = window.slice(1).every((row, offset) => {
      const previous = Date.parse(`${window[offset]!.date}T00:00:00Z`);
      const current = Date.parse(`${row.date}T00:00:00Z`);
      const days = (current - previous) / 86_400_000;
      return days >= 70 && days <= 110;
    });
    if (!consecutiveQuarters) continue;

    const trailingRow: FinancialSeriesRow = {
      date: window[3]!.date,
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

    for (const metric of FINANCIAL_METRICS) {
      const values = window.map((row) => row[metric]);
      const completeValues = values.filter(
        (value): value is number => value != null && Number.isFinite(value),
      );
      if (completeValues.length === window.length) {
        trailingRow[metric] = completeValues.reduce((total, value) => total + value, 0);
      }
    }

    if (FINANCIAL_METRICS.some((metric) => trailingRow[metric] != null)) {
      trailingRows.push(trailingRow);
    }
  }

  return trailingRows;
}
