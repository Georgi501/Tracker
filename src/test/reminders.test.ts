import { describe, expect, it } from "vitest";
import { parseDateMap, parseEarningsReminders } from "@/lib/watchlist";

describe("reminder preferences", () => {
  it("keeps unique supported earnings symbols only", () => {
    expect(
      parseEarningsReminders(JSON.stringify(["AAPL", "AAPL", "BTC-USD", "invalid ticker", 4])),
    ).toEqual(["AAPL", "BTC-USD"]);
  });

  it("keeps valid ISO dates in keyed reminder preferences", () => {
    expect(
      parseDateMap(
        JSON.stringify({
          bond1: "2030-01-15",
          bond2: "2030-02-31",
          bond3: "not-a-date",
          bond4: 20300115,
        }),
      ),
    ).toEqual({ bond1: "2030-01-15" });
  });

  it("returns empty preferences for malformed storage", () => {
    expect(parseEarningsReminders("{")).toEqual([]);
    expect(parseDateMap("{")).toEqual({});
  });
});
