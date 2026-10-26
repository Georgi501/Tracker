// Pure helpers for Pro features. Inputs are real data or user-entered assumptions only.

/** Years until portfolio reaches the FIRE number (annual spend / withdrawal rate). */
export function fireProjection(o: {
  current: number;
  monthly: number;
  annualReturnPct: number;
  annualSpend: number;
  withdrawalPct?: number;
  maxYears?: number;
}) {
  const target = o.annualSpend / ((o.withdrawalPct ?? 4) / 100);
  const r = Math.pow(1 + o.annualReturnPct / 100, 1 / 12) - 1;
  const max = (o.maxYears ?? 60) * 12;
  let v = Math.max(0, o.current);
  const path: { year: number; value: number }[] = [{ year: 0, value: v }];
  let months: number | null = v >= target ? 0 : null;
  for (let m = 1; m <= max; m++) {
    v = v * (1 + r) + o.monthly;
    if (m % 12 === 0) path.push({ year: m / 12, value: v });
    if (months === null && v >= target) months = m;
    if (months !== null && m % 12 === 0 && m >= months + 12) break;
  }
  return { target, years: months === null ? null : months / 12, path };
}

/** Confirmed per-share payouts × held quantity, bucketed by calendar month (0-11). */
export function monthlyIncome(
  rows: {
    quantity: number;
    toUsd: (amount: number) => number;
    paid: { date: string; amount: number }[];
  }[],
): number[] {
  const out = Array<number>(12).fill(0);
  for (const r of rows)
    for (const d of r.paid) {
      const v = r.toUsd(d.amount) * r.quantity;
      if (Number.isFinite(v)) {
        const k = new Date(d.date).getUTCMonth();
        out[k] = (out[k] ?? 0) + v;
      }
    }
  return out;
}
