import { describe, expect, it } from "vitest";
import {
  buildPortfolioHistory,
  earliestTransactionDate,
  historyReturn,
  partitionDiscoveredSplits,
} from "@/lib/history";
import { portfolioIrr, type Transaction } from "@/lib/portfolio";
import { riskMetrics } from "@/lib/tools";

describe("financial accuracy regressions", () => {
  describe("assetContributions EUR FX translation", () => {
    it("accounts for prior-day FX translation when USD asset price is flat and EURUSD moves", () => {
      const assets = [
        {
          id: "a1",
          type: "stock",
          currency: "USD",
          prices: [
            { date: "2024-01-01", close: 100 },
            { date: "2024-01-02", close: 100 },
          ],
        },
      ];
      const txs: Transaction[] = [
        {
          id: "t1",
          assetId: "a1",
          kind: "buy",
          quantity: 1,
          price: 100,
          fee: 0,
          date: "2024-01-01",
        },
      ];
      const eurUsd = [
        { date: "2024-01-01", close: 1.0 },
        { date: "2024-01-02", close: 1.25 },
      ];

      const res = buildPortfolioHistory(assets, txs, "2024-01-01", "2024-01-02", "EUR", eurUsd, []);
      expect(res.unavailable).toBe(false);
      // Day 1: $100 / 1.00 = €100; Day 2: $100 / 1.25 = €80 -> -€20 EUR P&L
      expect(res.points[0]!.v).toBeCloseTo(100, 6);
      expect(res.points[1]!.v).toBeCloseTo(80, 6);
      const contrib = res.assetContributions.find((c) => c.assetId === "a1")?.amount ?? 0;
      expect(contrib).toBeCloseTo(-20, 6);
      // Total contributions must reconcile to total EUR P&L (v_end - v_start - flows_after_start)
      const totalContrib = res.assetContributions.reduce((s, c) => s + c.amount, 0);
      const totalFlowAfterStart = res.points.slice(1).reduce((s, p) => s + p.flow, 0);
      expect(totalContrib).toBeCloseTo(
        res.points[1]!.v - res.points[0]!.v - totalFlowAfterStart,
        6,
      );
    });

    it("reconciles EUR assetContributions across cash flows, partial sells, and dividends", () => {
      const assets = [
        {
          id: "a1",
          type: "stock",
          currency: "USD",
          prices: [
            { date: "2024-01-01", close: 100 },
            { date: "2024-01-02", close: 110 },
            { date: "2024-01-03", close: 120 },
          ],
        },
      ];
      const txs: Transaction[] = [
        {
          id: "t1",
          assetId: "a1",
          kind: "buy",
          quantity: 2,
          price: 100,
          fee: 0,
          date: "2024-01-01",
        },
        {
          id: "t2",
          assetId: "a1",
          kind: "sell",
          quantity: 1,
          price: 110,
          fee: 0,
          date: "2024-01-02",
        },
        {
          id: "t3",
          assetId: "a1",
          kind: "dividend",
          quantity: 1,
          price: 5,
          fee: 0,
          date: "2024-01-03",
        },
      ];
      const eurUsd = [
        { date: "2024-01-01", close: 1.0 },
        { date: "2024-01-02", close: 1.1 },
        { date: "2024-01-03", close: 1.2 },
      ];

      const res = buildPortfolioHistory(assets, txs, "2024-01-01", "2024-01-03", "EUR", eurUsd, []);
      expect(res.unavailable).toBe(false);
      // Day 1: 2*100/1.0 = 200
      // Day 2: 1*110/1.1 = 100, flow = -110/1.1 = -100
      // Day 3: 1*120/1.2 = 100, flow = 0 (dividends excluded from external flow)
      const totalContrib = res.assetContributions.reduce((s, c) => s + c.amount, 0);
      const totalFlowAfterStart = res.points.slice(1).reduce((s, p) => s + p.flow, 0);
      const expectedTotalPnl = res.points.at(-1)!.v - res.points[0]!.v - totalFlowAfterStart;
      expect(totalContrib).toBeCloseTo(expectedTotalPnl, 6);
    });
  });

  describe("riskMetrics invalid return guard and calendar-day consistency", () => {
    it("returns null instead of < -100% drawdown when flow-adjusted value is negative", () => {
      const points = Array.from({ length: 12 }, (_, i) => ({
        t: Date.UTC(2024, 0, 1 + i),
        v: i === 5 ? 50 : 100,
        flow: i === 5 ? 80 : 0, // b.v - b.flow = -30 < 0 -> r = -1.3
      }));
      expect(riskMetrics(points)).toBeNull();
    });

    it("produces consistent annualized volatility on calendar-day series with zero-return weekends", () => {
      // 365 calendar days: 252 trading days alternating +1% / -1%, 113 weekend/holiday days with 0%
      // True trading-day std dev ≈ 1%, annualized = 1% * sqrt(252) ≈ 15.87%
      // Calendar-day sample std dev * sqrt(365) cancels sqrt(252/365) * sqrt(365) = sqrt(252) ≈ 15.87%
      const points: { t: number; v: number; flow: number }[] = [];
      let v = 100;
      let tradingIdx = 0;
      for (let day = 0; day < 365; day++) {
        const t = Date.UTC(2024, 0, 1 + day);
        const dow = new Date(t).getUTCDay();
        if (day > 0 && dow !== 0 && dow !== 6 && tradingIdx < 252) {
          const r = tradingIdx % 2 === 0 ? 0.01 : -0.01;
          v = v * (1 + r);
          tradingIdx++;
        }
        points.push({ t, v, flow: 0 });
      }
      const m = riskMetrics(points)!;
      expect(m).not.toBeNull();
      expect(m.volatility).toBeGreaterThan(15);
      expect(m.volatility).toBeLessThan(17);
    });
  });

  describe("portfolioIrr currency consistency", () => {
    it("computes EUR IRR matching EUR TTWROR when EURUSD changes and USD price is flat", () => {
      const txs: Transaction[] = [
        {
          id: "t1",
          assetId: "a1",
          kind: "buy",
          quantity: 1,
          price: 100,
          fee: 0,
          date: "2024-01-01",
        },
      ];
      const eurUsd = [
        { date: "2024-01-01", close: 1.0 },
        { date: "2025-01-01", close: 1.25 },
      ];
      const now = new Date("2025-01-01T00:00:00Z");

      // USD return is 0% ($100 -> $100)
      const usdIrr = portfolioIrr(txs, 100, now);
      expect(usdIrr).toBeCloseTo(0, 4);

      // EUR return is -20% (€100 invested -> €80 value at liveEurPerUsd = 1/1.25 = 0.8)
      const eurIrr = portfolioIrr(txs, 100, now, {
        currency: "EUR",
        eurUsd,
        liveEurPerUsd: 0.8,
      });
      expect(eurIrr).toBeCloseTo(-20, 1);

      // Verify EUR TTWROR from history also gives -20%
      const hist = buildPortfolioHistory(
        [
          {
            id: "a1",
            type: "stock",
            currency: "USD",
            prices: [
              { date: "2024-01-01", close: 100 },
              { date: "2024-01-02", close: 100 },
            ],
          },
        ],
        txs,
        "2024-01-01",
        "2024-01-02",
        "EUR",
        [
          { date: "2024-01-01", close: 1.0 },
          { date: "2024-01-02", close: 1.25 },
        ],
        [],
      );
      expect(historyReturn(hist.points)).toBeCloseTo(-20, 6);
    });

    it("returns null in EUR mode when dated FX or liveEurPerUsd is missing", () => {
      const txs: Transaction[] = [
        {
          id: "t1",
          assetId: "a1",
          kind: "buy",
          quantity: 1,
          price: 100,
          fee: 0,
          date: "2024-01-01",
        },
      ];
      const now = new Date("2025-01-01T00:00:00Z");
      expect(
        portfolioIrr(txs, 100, now, {
          currency: "EUR",
          eurUsd: [],
          liveEurPerUsd: 0.8,
        }),
      ).toBeNull();
      expect(
        portfolioIrr(txs, 100, now, {
          currency: "EUR",
          eurUsd: [{ date: "2024-01-01", close: 1.0 }],
          liveEurPerUsd: null,
        }),
      ).toBeNull();
    });
  });

  describe("multi-split position detection and transaction ordering", () => {
    it("detects a second split after a partial sale between splits", () => {
      const txs: Transaction[] = [
        {
          id: "t1",
          assetId: "a1",
          kind: "buy",
          quantity: 1,
          price: 400,
          fee: 0,
          date: "2024-01-10",
        },
        {
          id: "t2",
          assetId: "a1",
          kind: "sell",
          quantity: 2,
          price: 110,
          fee: 0,
          date: "2024-04-10",
        },
      ];
      const discovered = [
        { assetId: "a1", symbol: "NVDA", date: "2024-03-01", numerator: 4, denominator: 1 },
        { assetId: "a1", symbol: "NVDA", date: "2024-06-01", numerator: 2, denominator: 1 },
      ];
      // Approve the first split; second split must still be detected as pending (held 1*4 - 2 = 2 shares)
      const { pendingSplits, confirmedSplits } = partitionDiscoveredSplits(txs, discovered, [
        { assetId: "a1", date: "2024-03-01", numerator: 4, denominator: 1 },
      ]);
      expect(confirmedSplits).toHaveLength(1);
      expect(confirmedSplits[0]!.date).toBe("2024-03-01");
      expect(pendingSplits).toHaveLength(1);
      expect(pendingSplits[0]!.date).toBe("2024-06-01");
    });

    it("ignores a second split when all split-adjusted shares were sold before it", () => {
      const txs: Transaction[] = [
        {
          id: "t1",
          assetId: "a1",
          kind: "buy",
          quantity: 1,
          price: 400,
          fee: 0,
          date: "2024-01-10",
        },
        {
          id: "t2",
          assetId: "a1",
          kind: "sell",
          quantity: 4,
          price: 110,
          fee: 0,
          date: "2024-04-10",
        },
      ];
      const discovered = [
        { assetId: "a1", symbol: "NVDA", date: "2024-03-01", numerator: 4, denominator: 1 },
        { assetId: "a1", symbol: "NVDA", date: "2024-06-01", numerator: 2, denominator: 1 },
      ];
      const { pendingSplits, confirmedSplits } = partitionDiscoveredSplits(txs, discovered, []);
      expect(confirmedSplits).toHaveLength(0);
      expect(pendingSplits).toHaveLength(1);
      expect(pendingSplits[0]!.date).toBe("2024-03-01");
    });

    it("finds the earliest transaction date even when transactions are unsorted", () => {
      const txs: Transaction[] = [
        {
          id: "t2",
          assetId: "a1",
          kind: "buy",
          quantity: 1,
          price: 120,
          fee: 0,
          date: "2024-06-15",
        },
        {
          id: "t1",
          assetId: "a1",
          kind: "buy",
          quantity: 2,
          price: 100,
          fee: 0,
          date: "2023-03-01",
        },
        {
          id: "t3",
          assetId: "a1",
          kind: "sell",
          quantity: 1,
          price: 130,
          fee: 0,
          date: "2024-08-01",
        },
      ];
      expect(earliestTransactionDate(txs, "2026-11-17")).toBe("2023-03-01");
      expect(earliestTransactionDate([], "2026-11-17")).toBe("2026-11-17");
    });
  });
});
