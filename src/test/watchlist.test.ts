import { describe, expect, it } from "vitest";
import {
  alertTriggered,
  alertCrossed,
  parseAlerts,
  parseRecurringReminders,
  parseWatchlist,
} from "@/lib/watchlist";
import { fifoTaxReport, taxReportCsv } from "@/lib/tools";

describe("price alerts", () => {
  it("triggers above at or over target", () => {
    expect(alertTriggered({ symbol: "VWCE.DE", direction: "above", target: 125 }, 125)).toBe(true);
  });
  it("triggers below under target", () => {
    expect(alertTriggered({ symbol: "VWCE.DE", direction: "below", target: 125 }, 124.9)).toBe(
      true,
    );
  });
  it("does not trigger below when price is higher", () => {
    expect(alertTriggered({ symbol: "VWCE.DE", direction: "below", target: 125 }, 130)).toBe(false);
  });
  it("never triggers without a real price", () => {
    expect(alertTriggered({ symbol: "A", direction: "below", target: 125 }, null)).toBe(false);
  });
  it("detects an actual crossing and not just an already-triggered quote", () => {
    const alert = { symbol: "A", direction: "above" as const, target: 125 };
    expect(alertCrossed(alert, 124, 125)).toBe(true);
    expect(alertCrossed(alert, 125, 126)).toBe(false);
    expect(alertCrossed(alert, null, 126)).toBe(false);
  });
  it("drops invalid stored alerts", () => {
    expect(
      parseAlerts(
        JSON.stringify([
          { symbol: "A", direction: "up", target: 1 },
          { symbol: "B", direction: "above", target: 2 },
        ]),
      ),
    ).toHaveLength(1);
  });
  it("dedupes watchlist symbols", () => {
    expect(parseWatchlist('["META","META","bad sym"]')).toEqual(["META"]);
  });
  it("validates recurring reminder preferences without portfolio data", () => {
    expect(
      parseRecurringReminders(
        JSON.stringify([
          {
            id: "monthly-1",
            symbol: "VWCE.DE",
            amount: 300,
            currency: "EUR",
            dayOfMonth: 15,
          },
          {
            id: "invalid",
            symbol: "bad symbol",
            amount: 300,
            currency: "EUR",
            dayOfMonth: 31,
          },
        ]),
      ),
    ).toEqual([
      {
        id: "monthly-1",
        symbol: "VWCE.DE",
        amount: 300,
        currency: "EUR",
        dayOfMonth: 15,
      },
    ]);
  });
});

describe("tax report export", () => {
  it("lists yearly summary and FIFO sale gain", () => {
    const years = fifoTaxReport([
      { id: "1", assetId: "a", kind: "buy", quantity: 2, price: 100, date: "2024-01-02" },
      { id: "2", assetId: "a", kind: "sell", quantity: 1, price: 150, date: "2025-03-01" },
    ] as never);
    const csv = taxReportCsv(years, [{ id: "a", symbol: "AAPL" }] as never);
    expect(csv).toContain("summary,2025,,,,150.00,100.00,50.00,0.00");
    expect(csv).toContain("sale,2025,2025-03-01,AAPL,1,150.00,100.00,50.00,");
  });
});
