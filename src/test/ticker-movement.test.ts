import { expect, it } from "vitest";
import { rangeChange, sharedSparklineScale, sparklineReturns } from "@/lib/ticker-movement";

it("calculates a selected-range return through the latest provider price", () => {
  expect(rangeChange([100, 102], 103)).toBeCloseTo(3);
  expect(rangeChange([100], 103)).toBeNull();
  expect(rangeChange([0, Number.NaN], 103)).toBeNull();
});

it("plots prices against the supplied reference and includes the latest quote", () => {
  const values = sparklineReturns([100, 101, 100.5], 100, 102);
  expect(values).toHaveLength(4);
  expect(values[0]).toBe(0);
  expect(values[1]).toBeCloseTo(1);
  expect(values[2]).toBeCloseTo(0.5);
  expect(values[3]).toBeCloseTo(2);
  expect(sparklineReturns([100], 100, 102)).toEqual([]);
});

it("uses a shared percentage scale with a range-specific minimum", () => {
  expect(
    sharedSparklineScale(
      [
        [0, 0.1],
        [0, -0.5],
      ],
      "1D",
    ),
  ).toBe(2);
  expect(
    sharedSparklineScale(
      [
        [0, 3],
        [0, -4],
      ],
      "1D",
    ),
  ).toBeCloseTo(4.4);
});
