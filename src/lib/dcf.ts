export interface DcfInputs { fcf: number; growth: number; discount: number; terminal: number; cash: number; debt: number; shares: number; years?: number }
export type DcfCase = "bear" | "base" | "bull";

/** Two-stage DCF: explicit FCF growth for N years, Gordon terminal value, net cash added. Returns per-share value or null when not applicable. */
export function dcfValue(i: DcfInputs): number | null {
  const n = i.years ?? 5;
  if (!(i.fcf > 0) || !(i.shares > 0) || i.discount <= i.terminal) return null;
  let pv = 0; let f = i.fcf;
  for (let t = 1; t <= n; t++) { f *= 1 + i.growth; pv += f / (1 + i.discount) ** t; }
  const tv = (f * (1 + i.terminal)) / (i.discount - i.terminal);
  pv += tv / (1 + i.discount) ** n;
  return (pv + i.cash - i.debt) / i.shares;
}

/** Scenario assumptions derived from a base growth rate (fractions). */
export function scenario(c: DcfCase, baseGrowth: number) {
  const g = Math.max(-0.05, Math.min(0.25, baseGrowth));
  if (c === "bear") return { growth: g * 0.5, discount: 0.105, terminal: 0.02 };
  if (c === "bull") return { growth: Math.min(0.3, g * 1.5), discount: 0.08, terminal: 0.03 };
  return { growth: g, discount: 0.09, terminal: 0.025 };
}

/** Positive = undervalued by that fraction of intrinsic value. */
export const valuationGap = (intrinsic: number, price: number) => (intrinsic - price) / intrinsic;
