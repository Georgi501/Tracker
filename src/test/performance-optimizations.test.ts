import { describe, expect, it } from "vitest";
import { buildPortfolioHistory, type DailyPrice, type HistoryAsset } from "@/lib/history";
import { transactionsFingerprint, type Transaction } from "@/lib/portfolio";

function makeSeries(startDate: string, days: number, basePrice: number): DailyPrice[] {
  const out: DailyPrice[] = [];
  const startMs = Date.parse(`${startDate}T00:00:00Z`);
  for (let i = 0; i < days; i++) {
    const t = startMs + i * 86400000;
    const dow = new Date(t).getUTCDay();
    if (dow === 0 || dow === 6) continue;
    out.push({
      date: new Date(t).toISOString().slice(0, 10),
      close: basePrice + (i % 25) * 0.5,
    });
  }
  return out;
}

describe("performance optimizations", () => {
  it("benchmarks buildPortfolioHistory on 30 assets over 5 years", () => {
    const start = "2021-01-04";
    const days = 1825;
    const end = new Date(Date.parse(`${start}T00:00:00Z`) + (days - 1) * 86400000)
      .toISOString()
      .slice(0, 10);

    const eurUsd = makeSeries(start, days, 1.1);
    const gbpUsd = makeSeries(start, days, 1.25);
    const assets: HistoryAsset[] = Array.from({ length: 30 }, (_, i) => ({
      id: `a-${i}`,
      type: "stock",
      currency: i % 3 === 0 ? "EUR" : "USD",
      prices: makeSeries(start, days, 50 + i * 3),
    }));
    const txs: Transaction[] = assets.map((a, i) => ({
      id: `tx-${i}`,
      assetId: a.id,
      kind: "buy",
      quantity: 10,
      price: 50 + i * 3,
      fee: 1,
      date: start,
    }));

    const t0 = performance.now();
    const result = buildPortfolioHistory(assets, txs, start, end, "EUR", eurUsd, gbpUsd);
    const elapsedMs = performance.now() - t0;

    console.info(`[PERF] buildPortfolioHistory (30 assets x 5Y): ${elapsedMs.toFixed(2)}ms`);
    expect(result.unavailable).toBe(false);
    expect(result.points).toHaveLength(days);
    expect(result.assetContributions).toHaveLength(30);
  });

  it("produces a stable transactionsFingerprint across array copies and changes on edits", () => {
    const base: Transaction[] = [
      { id: "t1", assetId: "a1", kind: "buy", quantity: 2, price: 100, fee: 1, date: "2024-01-10" },
    ];
    const cloned = base.map((t) => ({ ...t }));
    expect(transactionsFingerprint(base)).toBe(transactionsFingerprint(cloned));
    expect(transactionsFingerprint([])).toBe("0");

    const edited: Transaction[] = [{ ...base[0]!, quantity: 3 }];
    expect(transactionsFingerprint(edited)).not.toBe(transactionsFingerprint(base));
  });
});
