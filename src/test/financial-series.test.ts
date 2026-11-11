import { describe, expect, it } from "vitest";
import {
  filterFinancialRows,
  toTrailingFinancialRows,
  type FinancialSeriesRow,
} from "@/lib/financial-series";

function row(date: string, value: number): FinancialSeriesRow {
  return {
    date,
    revenue: value,
    costOfRevenue: value / 2,
    grossProfit: value / 2,
    operatingIncome: value / 3,
    operatingExpense: value / 6,
    netIncome: value / 4,
    dilutedEps: value / 10,
    operatingCashFlow: value / 5,
    freeCashFlow: value / 8,
  };
}

describe("financial history ranges", () => {
  it("filters provider results to the requested start date", () => {
    const rows = [
      row("2022-05-31", 1),
      row("2023-05-31", 2),
      row("2024-05-31", 3),
      row("2025-05-31", 4),
      row("2026-05-31", 5),
    ];

    expect(filterFinancialRows(rows, new Date("2023-11-11T00:00:00Z"))).toHaveLength(3);
    expect(filterFinancialRows(rows, new Date("2016-11-11T00:00:00Z"))).toHaveLength(5);
  });

  it("builds rolling TTM values from four consecutive quarterly reports", () => {
    const rows = [
      row("2025-08-31", 10),
      row("2025-11-30", 20),
      row("2026-02-28", 30),
      row("2026-05-31", 40),
      row("2026-08-31", 50),
    ];

    const trailing = toTrailingFinancialRows(rows);

    expect(trailing).toHaveLength(2);
    expect(trailing.map((item) => item.date)).toEqual(["2026-05-31", "2026-08-31"]);
    expect(trailing.map((item) => item.revenue)).toEqual([100, 140]);
    expect(trailing.map((item) => item.dilutedEps)).toEqual([10, 14]);
  });

  it("does not fill missing metrics or sum across a missing quarter", () => {
    const rows = [
      row("2025-08-31", 10),
      row("2025-11-30", 20),
      row("2026-02-28", 30),
      row("2026-05-31", 40),
      row("2026-12-31", 50),
    ];
    rows[1]!.freeCashFlow = null;

    const trailing = toTrailingFinancialRows(rows);

    expect(trailing).toHaveLength(1);
    expect(trailing[0]).toMatchObject({ date: "2026-05-31", revenue: 100, freeCashFlow: null });
  });
});
