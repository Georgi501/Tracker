import { describe, expect, it } from "vitest";
import {
  assetRiskAnalysis,
  dividendIncomeSummary,
  exportCsv,
  fifoSalePreview,
  fifoTaxReport,
  rebalance,
  riskMetrics,
} from "@/lib/tools";
import { detectBrokerFormat, parseBrokerCsv } from "@/lib/csv-import";

describe("FIFO tax report", () => {
  it("matches sells against oldest lots first", () => {
    const r = fifoTaxReport([
      { id: "1", assetId: "a", kind: "buy", quantity: 10, price: 100, date: "2024-01-01" },
      { id: "2", assetId: "a", kind: "buy", quantity: 10, price: 200, date: "2024-06-01" },
      { id: "3", assetId: "a", kind: "sell", quantity: 15, price: 300, date: "2025-03-01" },
      { id: "4", assetId: "a", kind: "dividend", quantity: 1, price: 25, date: "2025-04-01" },
    ]);
    const y = r.find((x) => x.year === 2025)!;
    expect(y.cost).toBe(2000);
    expect(y.realized).toBe(2500);
    expect(y.dividends).toBe(25);
  });

  describe("assetRiskAnalysis", () => {
    it("uses only common real dates and returns contributions summing to portfolio risk", () => {
      const dates = Array.from({ length: 40 }, (_, index) => {
        const date = new Date(Date.UTC(2024, 0, index + 1)).toISOString().slice(0, 10);
        return date;
      });
      const series = [
        {
          symbol: "AAA",
          weight: 60,
          prices: dates.map((date, index) => ({ date, value: 100 + index * 2 })),
        },
        {
          symbol: "BBB",
          weight: 40,
          prices: dates.slice(1).map((date, index) => ({ date, value: 100 + index * 1.5 })),
        },
      ];
      const result = assetRiskAnalysis(series);
      expect(result?.observations).toBe(38);
      expect(result?.correlations[0]?.values[1]?.value).toBeGreaterThan(0.9);
      expect(result?.contributions.reduce((sum, item) => sum + item.share, 0)).toBeCloseTo(1);
    });
    it("does not fabricate analysis from too few overlapping observations", () => {
      const prices = Array.from({ length: 10 }, (_, index) => ({
        date: `2024-01-${String(index + 1).padStart(2, "0")}`,
        value: index + 1,
      }));
      expect(
        assetRiskAnalysis([
          { symbol: "A", weight: 1, prices },
          { symbol: "B", weight: 1, prices },
        ]),
      ).toBeNull();
    });
  });
  it("adds acquisition fees to FIFO cost and subtracts sale fees from proceeds", () => {
    const [year] = fifoTaxReport([
      {
        id: "buy",
        assetId: "a",
        kind: "buy",
        quantity: 2,
        price: 100,
        fee: 10,
        date: "2024-01-01",
      },
      {
        id: "sell",
        assetId: "a",
        kind: "sell",
        quantity: 1,
        price: 120,
        fee: 2,
        date: "2024-02-01",
      },
    ]);
    expect(year?.cost).toBe(105);
    expect(year?.proceeds).toBe(118);
    expect(year?.realized).toBe(13);
  });

  it("previews a hypothetical sale using remaining FIFO lots without changing transactions", () => {
    const transactions = [
      {
        id: "buy-1",
        assetId: "a",
        kind: "buy" as const,
        quantity: 10,
        price: 10,
        fee: 10,
        date: "2024-01-01",
      },
      {
        id: "buy-2",
        assetId: "a",
        kind: "buy" as const,
        quantity: 5,
        price: 20,
        fee: 5,
        date: "2024-02-01",
      },
      {
        id: "sell-1",
        assetId: "a",
        kind: "sell" as const,
        quantity: 4,
        price: 15,
        date: "2024-03-01",
      },
    ];
    const preview = fifoSalePreview(transactions, "a", 7, 30);
    expect(preview).toEqual({ quantity: 7, proceeds: 210, cost: 87, gain: 123 });
    expect(transactions).toHaveLength(3);
    expect(fifoSalePreview(transactions, "a", 12, 30)).toBeNull();
    expect(fifoSalePreview(transactions, "missing", 1, 30)).toBeNull();
  });
});

describe("rebalance", () => {
  it("puts new cash into underweight classes only", () => {
    const r = rebalance({ etf: 900, crypto: 100 }, { etf: 50, crypto: 50 }, 200);
    expect(r["crypto"]).toBeCloseTo(200);
    expect(r["etf"]).toBeCloseTo(0);
  });
});

describe("risk metrics", () => {
  it("reports max drawdown from peak", () => {
    const vals = [100, 110, 120, 90, 95, 100, 105, 110, 115, 120, 125, 130];
    const m = riskMetrics(vals.map((v, i) => ({ t: i, v, flow: 0 })))!;
    expect(m.maxDrawdown).toBeCloseTo(-25);
  });
});

it("exports transactions in a generic CSV format that can be restored", () => {
  const csv = exportCsv(
    [
      {
        id: "asset-1",
        name: "Apple, Inc.",
        symbol: "AAPL",
        type: "stock",
        sector: "Technology",
        region: "North America",
        price: 180,
        change24h: 0,
        dividendPerShare: 0,
        payMonths: [],
      },
    ],
    [{ id: "tx-1", assetId: "asset-1", kind: "buy", quantity: 2, price: 150, date: "2024-01-15" }],
  );

  expect(detectBrokerFormat(csv)).toBe("generic");
  expect(parseBrokerCsv("generic", csv)[0]).toMatchObject({
    symbol: "AAPL",
    name: "Apple, Inc.",
    quantity: 2,
    price: 150,
    fee: 0,
    currency: "USD",
  });
});

describe("dividendIncomeSummary", () => {
  it("summarizes net recorded income by month, year and asset with like-for-like comparison", () => {
    const transactions = [
      {
        id: "1",
        assetId: "a",
        kind: "dividend" as const,
        quantity: 1,
        price: 20,
        fee: 2,
        date: "2026-03-10",
      },
      {
        id: "2",
        assetId: "a",
        kind: "dividend" as const,
        quantity: 1,
        price: 10,
        date: "2026-02-10",
      },
      {
        id: "3",
        assetId: "b",
        kind: "dividend" as const,
        quantity: 1,
        price: 15,
        date: "2025-03-15",
      },
      {
        id: "4",
        assetId: "a",
        kind: "buy" as const,
        quantity: 1,
        price: 100,
        date: "2026-03-01",
      },
    ];
    const assets = [
      { id: "a", symbol: "AAA" },
      { id: "b", symbol: "BBB" },
    ];
    const summary = dividendIncomeSummary(transactions, assets, "2026-03-20");
    expect(summary.currentMonth).toBe(18);
    expect(summary.previousMonth).toBe(10);
    expect(summary.yearToDate).toBe(28);
    expect(summary.previousYearToDate).toBe(15);
    expect(summary.byAsset).toEqual([{ assetId: "a", symbol: "AAA", amount: 28 }]);
    expect(summary.monthly).toHaveLength(12);
    expect(summary.monthly.at(-1)).toEqual({ month: "2026-03", amount: 18 });
  });

  it("excludes malformed and future dividend records instead of treating them as income", () => {
    const summary = dividendIncomeSummary(
      [
        {
          id: "1",
          assetId: "a",
          kind: "dividend",
          quantity: 1,
          price: 5,
          date: "2026-12-01",
        },
        {
          id: "2",
          assetId: "a",
          kind: "dividend",
          quantity: 1,
          price: Number.NaN,
          date: "2026-02-01",
        },
      ],
      [],
      "2026-11-01",
    );
    expect(summary.yearToDate).toBe(0);
    expect(summary.excludedTransactions).toBe(2);
  });
});
