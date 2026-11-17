import { describe, expect, it } from "vitest";
import { buildPortfolioHistory, type DailyPrice, type HistoryAsset } from "@/lib/history";
import {
  portfolioHistoryFingerprint,
  transactionsFingerprint,
  type Transaction,
} from "@/lib/portfolio";

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
    expect(transactionsFingerprint([{ ...base[0]!, fee: 2 }])).not.toBe(
      transactionsFingerprint(base),
    );
    expect(transactionsFingerprint([{ ...base[0]!, date: "2024-01-11" }])).not.toBe(
      transactionsFingerprint(base),
    );
  });

  it("invalidates portfolioHistoryFingerprint when corporate actions or manual valuations change in-place", () => {
    const txs: Transaction[] = [
      { id: "t1", assetId: "a1", kind: "buy", quantity: 1, price: 100, fee: 0, date: "2024-01-10" },
    ];
    const actions = [{ assetId: "a1", date: "2024-06-01", numerator: 2, denominator: 1 }];
    const vals = [{ id: "v1", assetId: "a1", date: "2024-07-01", priceUsd: 120 }];

    const fp0 = portfolioHistoryFingerprint(txs, actions, vals);
    const fpEditedAction = portfolioHistoryFingerprint(
      txs,
      [{ assetId: "a1", date: "2024-06-01", numerator: 4, denominator: 1 }],
      vals,
    );
    const fpEditedVal = portfolioHistoryFingerprint(txs, actions, [
      { id: "v1", assetId: "a1", date: "2024-07-01", priceUsd: 135 },
    ]);
    expect(fpEditedAction).not.toBe(fp0);
    expect(fpEditedVal).not.toBe(fp0);
    expect(portfolioHistoryFingerprint([...txs], [...actions], [...vals])).toBe(fp0);
  });

  it("handles duplicate timestamps, unsorted prices, weekend gaps, and stock splits in buildPortfolioHistory", () => {
    const assets: HistoryAsset[] = [
      {
        id: "a1",
        type: "stock",
        currency: "USD",
        // Unsorted + duplicate date ("2024-01-05" appears twice, latest 105 wins) + weekend gap (Jan 6-7)
        prices: [
          { date: "2024-01-08", close: 55 }, // post 2:1 split
          { date: "2024-01-05", close: 100 },
          { date: "2024-01-05", close: 105 },
        ],
      },
    ];
    const txs: Transaction[] = [
      { id: "t1", assetId: "a1", kind: "buy", quantity: 1, price: 100, fee: 0, date: "2024-01-05" },
    ];
    const splits = [{ assetId: "a1", date: "2024-01-08", numerator: 2, denominator: 1 }];
    const res = buildPortfolioHistory(
      assets,
      txs,
      "2024-01-05",
      "2024-01-08",
      "USD",
      [],
      [],
      splits,
    );
    expect(res.unavailable).toBe(false);
    // Jan 5: 2 split-adjusted shares * (105 / 2)? No, split is on Jan 8, so price on Jan 5 is Yahoo split-adjusted!
    // Wait: Yahoo daily closes are already split-adjusted; normalizeTransactionsForSplits scales quantity by 2 -> 2 * 105 = 210 on Jan 5..7, 2 * 55 = 110 on Jan 8
    expect(res.points.map((p) => p.v)).toEqual([210, 210, 210, 110]);
  });

  it("marks history unavailable when price gap exceeds 7 calendar days", () => {
    const assets: HistoryAsset[] = [
      {
        id: "a1",
        type: "stock",
        currency: "USD",
        prices: [{ date: "2024-01-01", close: 100 }],
      },
    ];
    const txs: Transaction[] = [
      { id: "t1", assetId: "a1", kind: "buy", quantity: 1, price: 100, fee: 0, date: "2024-01-01" },
    ];
    const res = buildPortfolioHistory(assets, txs, "2024-01-01", "2024-01-09", "USD", [], []);
    expect(res.unavailable).toBe(true);
    expect(res.points).toEqual([]);
  });
});
