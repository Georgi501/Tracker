import { describe, expect, it } from "vitest";
import {
  earningsSurprisePercent,
  sortEarningsCalendar,
  type EarningsCalendarData,
} from "@/lib/earnings";

describe("earnings calendar", () => {
  it("calculates EPS surprise without dividing by zero or inventing missing values", () => {
    expect(earningsSurprisePercent(1.2, 1)).toBeCloseTo(0.2);
    expect(earningsSurprisePercent(0.8, 1)).toBeCloseTo(-0.2);
    expect(earningsSurprisePercent(1, 0)).toBeNull();
    expect(earningsSurprisePercent(null, 1)).toBeNull();
  });

  it("sorts upcoming events, reported periods, and unavailable symbols", () => {
    const data: EarningsCalendarData = {
      upcoming: [
        {
          symbol: "MSFT",
          date: "2027-01-20T00:00:00.000Z",
          dateEstimated: false,
          epsEstimate: 2,
          revenueEstimate: null,
        },
        {
          symbol: "AAPL",
          date: "2026-11-02T00:00:00.000Z",
          dateEstimated: true,
          epsEstimate: null,
          revenueEstimate: null,
        },
      ],
      reported: [
        {
          symbol: "MSFT",
          period: "2025-12-31",
          actualEps: 2,
          estimatedEps: 1.8,
          surprisePercent: null,
        },
        {
          symbol: "AAPL",
          period: "2026-03-31",
          actualEps: 1,
          estimatedEps: 1,
          surprisePercent: 0,
        },
      ],
      unavailableSymbols: ["XYZ", "AAPL", "XYZ"],
      retrievedAt: "2026-10-31T00:00:00.000Z",
    };

    expect(sortEarningsCalendar(data)).toMatchObject({
      upcoming: [{ symbol: "AAPL" }, { symbol: "MSFT" }],
      reported: [{ symbol: "AAPL" }, { symbol: "MSFT" }],
      unavailableSymbols: ["AAPL", "XYZ"],
    });
  });
});
