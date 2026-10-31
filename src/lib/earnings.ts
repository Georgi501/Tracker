export interface UpcomingEarningsReport {
  symbol: string;
  date: string;
  dateEstimated: boolean;
  epsEstimate: number | null;
  revenueEstimate: number | null;
}

export interface ReportedEarningsResult {
  symbol: string;
  period: string;
  actualEps: number | null;
  estimatedEps: number | null;
  surprisePercent: number | null;
}

export interface EarningsCalendarData {
  upcoming: UpcomingEarningsReport[];
  reported: ReportedEarningsResult[];
  unavailableSymbols: string[];
  retrievedAt: string;
}

export function earningsSurprisePercent(
  actual: number | null,
  estimate: number | null,
): number | null {
  if (
    actual === null ||
    estimate === null ||
    !Number.isFinite(actual) ||
    !Number.isFinite(estimate) ||
    estimate === 0
  )
    return null;
  return (actual - estimate) / Math.abs(estimate);
}

export function sortEarningsCalendar(data: EarningsCalendarData): EarningsCalendarData {
  return {
    ...data,
    upcoming: [...data.upcoming].sort(
      (a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol),
    ),
    reported: [...data.reported].sort(
      (a, b) => b.period.localeCompare(a.period) || a.symbol.localeCompare(b.symbol),
    ),
    unavailableSymbols: [...new Set(data.unavailableSymbols)].sort(),
  };
}
