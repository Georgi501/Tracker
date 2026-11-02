import { expect, it } from "vitest";
import { parseStockSplits } from "@/lib/corporate-actions";

it("parses Yahoo split events returned as either arrays or keyed objects", () => {
  const event = {
    date: new Date("2024-06-10T00:00:00Z"),
    numerator: 4,
    denominator: 1,
  };
  expect(parseStockSplits([event])).toEqual([{ date: "2024-06-10", numerator: 4, denominator: 1 }]);
  expect(parseStockSplits({ "1717977600": event })).toEqual([
    { date: "2024-06-10", numerator: 4, denominator: 1 },
  ]);
});

it("ignores malformed and duplicate split events", () => {
  expect(
    parseStockSplits([
      { date: "2024-02-30", numerator: 2, denominator: 1 },
      { date: "2024-03-01", numerator: 0, denominator: 1 },
      { date: "2024-03-01", numerator: 2, denominator: 1 },
      { date: "2024-03-01", numerator: 2, denominator: 1 },
    ]),
  ).toEqual([{ date: "2024-03-01", numerator: 2, denominator: 1 }]);
});
