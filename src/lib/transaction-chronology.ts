import type { Transaction } from "./portfolio";

type Execution = {
  second: number;
  fraction: string;
  clock: string;
  day: string;
  minuteOnly: boolean;
};
type Entry = { trade: Transaction; execution: Execution | null; day: string };

function executionOf(trade: Transaction): Execution | null {
  const raw = trade.sourceExecutedAt
    ?.trim()
    .replace(/^(\d{4})(\d{2})(\d{2});(\d{2})(\d{2})(\d{2})$/, "$1-$2-$3 $4:$5:$6");
  const m = raw?.match(
    /^(\d{4}-\d{2}-\d{2})[T ;](\d{2}:\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i,
  );
  if (!m) return null;
  const [, day, hm, seconds = "00", fraction = "", offset] = m;
  const wall = `${day}T${hm}:${seconds}`;
  const wallTime = Date.parse(`${wall}Z`);
  if (!Number.isFinite(wallTime) || new Date(wallTime).toISOString().slice(0, 19) !== wall)
    return null;
  const second = offset ? Date.parse(wall + offset.toUpperCase()) : wallTime;
  if (!Number.isFinite(second)) return null;
  const utcDay = new Date(second).toISOString().slice(0, 10);
  if (trade.date !== day && trade.date !== utcDay) return null;
  if (!day) return null;
  return {
    second,
    fraction: fraction.padEnd(9, "0"),
    clock: offset
      ? "utc"
      : `wall:${trade.brokerId ?? ""}:${trade.sourceTransactionId?.match(/^[^:]+:/)?.[0] ?? ""}`,
    day: offset ? utcDay : day,
    minuteOnly: m[3] === undefined,
  };
}

/** Daily valuations use UTC for offset-bearing trades. Tax and trade FX retain the stored trade date. */
export function transactionLedgerDay(trade: Transaction): string {
  return executionOf(trade)?.day ?? trade.date;
}

const direction = { buy: 0, sell: 1, dividend: 2 };
const byTime = (a: Execution, b: Execution) =>
  a.second - b.second || a.fraction.localeCompare(b.fraction);
const fallback = (a: Transaction, b: Transaction) =>
  direction[a.kind] - direction[b.kind] ||
  a.price - b.price ||
  a.quantity - b.quantity ||
  (a.fee ?? 0) - (b.fee ?? 0) ||
  (a.sourceTransactionId ?? "").localeCompare(b.sourceTransactionId ?? "");

/**
 * Zoned timestamps are comparable by instant. An unzoned broker clock is only comparable
 * within that same clock on the same day. Date-only, mixed-clock and tied trades use a
 * deterministic calculation order, with affected basis figures withheld by callers.
 * Source IDs are opaque: none of the stored broker fields guarantees execution sequence.
 */
export function transactionChronology(transactions: readonly Transaction[]) {
  const groups = new Map<string, Entry[]>();
  const entries = transactions.map((trade) => {
    const execution = executionOf(trade);
    const day = execution?.day ?? trade.date;
    const entry = { trade, execution, day };
    if (trade.kind !== "dividend") {
      const key = JSON.stringify([trade.assetId, day]);
      const group = groups.get(key) ?? [];
      group.push(entry);
      groups.set(key, group);
    }
    return entry;
  });
  const mixed = new Map<string, string>();
  const fifo = new Map<string, string>();
  const mark = (map: Map<string, string>, asset: string, day: string) => {
    const prior = map.get(asset);
    if (prior === undefined || day < prior) map.set(asset, day);
  };
  const fallbackEntries = new Set<Entry>();
  const roundedToMinutes = new Set<Entry>();
  const assess = (slot: Entry[]) => {
    if (slot.length < 2) return;
    const first = slot[0]!;
    const buys = slot.filter(({ trade }) => trade.kind === "buy");
    const sells = slot.length - buys.length;
    if (buys.length && sells) mark(mixed, first.trade.assetId, first.day);
    const lotCosts = new Set(
      buys.map(({ trade }) => trade.price + (trade.fee ?? 0) / trade.quantity + "|" + trade.date),
    );
    if ((buys.length && sells) || lotCosts.size > 1 || sells > 1)
      mark(fifo, first.trade.assetId, first.day);
  };
  for (const group of groups.values()) {
    const clocks = new Set(group.map(({ execution }) => execution?.clock));
    if (clocks.size !== 1 || clocks.has(undefined)) {
      assess(group);
      group.forEach((entry) => fallbackEntries.add(entry));
      continue;
    }
    const slots = new Map<string, Entry[]>();
    const incompleteMinutes = new Set(
      group
        .filter(({ execution }) => execution!.minuteOnly)
        .map(({ execution }) => Math.floor(execution!.second / 60_000)),
    );
    for (const entry of group) {
      const time = entry.execution!;
      const minute = Math.floor(time.second / 60_000);
      const imprecise = incompleteMinutes.has(minute);
      if (imprecise) roundedToMinutes.add(entry);
      const key = imprecise ? `minute:${minute}` : `${time.second}.${time.fraction}`;
      const slot = slots.get(key) ?? [];
      slot.push(entry);
      slots.set(key, slot);
    }
    for (const slot of slots.values()) assess(slot);
  }
  const sortTime = (entry: Entry) => {
    if (fallbackEntries.has(entry) || !entry.execution) return null;
    if (!roundedToMinutes.has(entry)) return entry.execution;
    return {
      ...entry.execution,
      second: Math.floor(entry.execution.second / 60_000) * 60_000,
      fraction: "",
    };
  };
  const ordered = entries
    .sort((a, b) => {
      const day = a.day.localeCompare(b.day);
      if (day) return day;
      const aTime = sortTime(a);
      const bTime = sortTime(b);
      const time =
        aTime && bTime ? byTime(aTime, bTime) : Number(Boolean(aTime)) - Number(Boolean(bTime));
      return time || a.trade.assetId.localeCompare(b.trade.assetId) || fallback(a.trade, b.trade);
    })
    .map(({ trade }) => trade);
  const invalid = new Map<string, string>();
  const quantities = new Map<string, number>();
  const latestSale = new Map<string, string>();
  for (const trade of ordered) {
    if (trade.kind === "dividend") continue;
    const qty =
      (quantities.get(trade.assetId) ?? 0) +
      (trade.kind === "buy" ? trade.quantity : -trade.quantity);
    quantities.set(trade.assetId, qty);
    if (trade.kind === "sell") {
      const day = transactionLedgerDay(trade);
      latestSale.set(trade.assetId, day);
      if (qty < -1e-9) mark(invalid, trade.assetId, day);
    }
  }
  const affectedFifo = new Set(
    [...fifo]
      .filter(([asset, day]) => (latestSale.get(asset) ?? "") >= day)
      .map(([asset]) => asset),
  );
  return { ordered, mixed, fifo, invalid, quantities, affectedFifo };
}

export function unverifiedSale(
  trade: Transaction,
  chronology: Pick<ReturnType<typeof transactionChronology>, "fifo" | "invalid">,
): boolean {
  const day = transactionLedgerDay(trade);
  const fifo = chronology.fifo.get(trade.assetId);
  const invalid = chronology.invalid.get(trade.assetId);
  return (fifo !== undefined && day >= fifo) || (invalid !== undefined && day >= invalid);
}
