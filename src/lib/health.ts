import { assetCurrency, type Holding } from "./portfolio";

export interface HealthPart { key: "diversification" | "position" | "sector" | "currency"; score: number; value: number }
export interface HealthReport { score: number; parts: HealthPart[]; topPosition: { symbol: string; weight: number } | null }
export interface Scenario { key: "market" | "crypto" | "usd"; loss: number; lossPct: number }

const clamp = (n: number) => Math.max(0, Math.min(100, n));
/** 100 at or below `ok`, linearly down to 0 at `bad`. */
const band = (w: number, ok: number, bad: number) => clamp(100 - ((w - ok) / (bad - ok)) * 100);

const priced = (hs: Holding[]) => hs.filter((h) => Number.isFinite(h.value) && h.value > 0);

function maxWeight(hs: Holding[], key: (h: Holding) => string) {
  const total = hs.reduce((s, h) => s + h.value, 0);
  const m = new Map<string, number>();
  for (const h of hs) m.set(key(h), (m.get(key(h)) ?? 0) + h.value);
  let best = { name: "", weight: 0 };
  for (const [name, v] of m) if ((v / total) * 100 > best.weight) best = { name, weight: (v / total) * 100 };
  return best;
}

/** Health score 0-100 from real priced holdings only; null when nothing is priced. */
export function portfolioHealth(holdings: Holding[]): HealthReport | null {
  const hs = priced(holdings);
  if (!hs.length) return null;
  const pos = maxWeight(hs, (h) => h.asset.symbol);
  const sec = maxWeight(hs.filter((h) => h.asset.type === "stock"), (h) => h.asset.sector || "Other");
  const cur = maxWeight(hs, (h) => assetCurrency(h.asset));
  const parts: HealthPart[] = [
    { key: "diversification", score: clamp((hs.length / 10) * 100), value: hs.length },
    { key: "position", score: band(pos.weight, 20, 60), value: pos.weight },
    { key: "sector", score: sec.name ? band(sec.weight, 40, 90) : 100, value: sec.weight },
    { key: "currency", score: band(cur.weight, 70, 100), value: cur.weight },
  ];
  return { score: Math.round(parts.reduce((s, p) => s + p.score, 0) / parts.length), parts, topPosition: { symbol: pos.name, weight: pos.weight } };
}

/** Simple, explicitly hypothetical shocks applied to current real values. */
export function stressScenarios(holdings: Holding[], base: string): Scenario[] {
  const hs = priced(holdings);
  const total = hs.reduce((s, h) => s + h.value, 0);
  if (total <= 0) return [];
  const sum = (f: (h: Holding) => number) => hs.reduce((s, h) => s + f(h), 0);
  const market = sum((h) => (h.asset.type === "stock" || h.asset.type === "etf" ? h.value * 0.2 : h.asset.type === "crypto" ? h.value * 0.4 : 0));
  const crypto = sum((h) => (h.asset.type === "crypto" ? h.value * 0.5 : 0));
  const usd = base === "USD" ? 0 : sum((h) => (assetCurrency(h.asset) === "USD" ? h.value * 0.1 : 0));
  return ([["market", market], ["crypto", crypto], ["usd", usd]] as const).map(([key, loss]) => ({ key, loss, lossPct: (loss / total) * 100 }));
}

/** Points from the last 7 days (inclusive of the last point at or before the window start), for a flow-adjusted weekly return. */
export function lastWeek<T extends { t: number }>(points: T[], days = 7): T[] {
  const end = points.at(-1);
  if (!end) return [];
  const from = end.t - days * 86400000;
  const i = points.findIndex((p) => p.t >= from);
  return points.slice(Math.max(0, i > 0 && points[i]!.t > from ? i - 1 : i));
}
