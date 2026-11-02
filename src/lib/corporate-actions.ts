export interface StockSplitEvent {
  date: string;
  numerator: number;
  denominator: number;
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
}

export function parseStockSplits(value: unknown): StockSplitEvent[] {
  const events: unknown[] = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? Object.values(value)
      : [];
  const unique = new Map<string, StockSplitEvent>();
  for (const item of events) {
    if (!item || typeof item !== "object") continue;
    const event = item as { date?: unknown; numerator?: unknown; denominator?: unknown };
    const date =
      event.date instanceof Date && Number.isFinite(event.date.getTime())
        ? event.date.toISOString().slice(0, 10)
        : typeof event.date === "string" && isIsoDate(event.date.slice(0, 10))
          ? event.date.slice(0, 10)
          : null;
    if (
      !date ||
      typeof event.numerator !== "number" ||
      !Number.isFinite(event.numerator) ||
      event.numerator <= 0 ||
      typeof event.denominator !== "number" ||
      !Number.isFinite(event.denominator) ||
      event.denominator <= 0
    )
      continue;
    const split = { date, numerator: event.numerator, denominator: event.denominator };
    unique.set(`${date}|${split.numerator}|${split.denominator}`, split);
  }
  return [...unique.values()].sort((a, b) => a.date.localeCompare(b.date));
}
