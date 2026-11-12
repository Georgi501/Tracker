import { quoteCoverage } from "@/lib/data-status";
import { expect, it } from "vitest";
const now = Date.parse("2026-11-12T12:00:00Z");
it("distinguishes source freshness, missing valuations and manual assets", () => {
  const a = [
    { id: "a", type: "stock" as const, price: 100, quoteAt: "2026-11-12T10:00:00Z" },
    { id: "b", type: "etf" as const, price: NaN, quoteAt: "2026-11-01T10:00:00Z" },
    { id: "c", type: "crypto" as const, price: NaN },
    { id: "d", type: "cash" as const, price: 1 },
  ];
  expect(quoteCoverage(a, now)).toEqual({
    fresh: 1,
    stale: 1,
    missing: 1,
    manual: 1,
    latest: Date.parse("2026-11-12T10:00:00Z"),
  });
});
it("does not count a future or malformed timestamp as current", () => {
  expect(
    quoteCoverage(
      [
        { id: "a", type: "stock", price: 100, quoteAt: "2027-01-01" },
        { id: "b", type: "stock", price: 100, quoteAt: "bad" },
      ],
      now,
    ),
  ).toEqual({ fresh: 0, stale: 0, missing: 2, manual: 0, latest: null });
});
