import { expect, it } from "vitest";
import { previousSessionClose } from "@/lib/prices.server";

const bars = [
  { date: new Date("2026-10-22T13:30:00Z"), close: 340 },
  { date: new Date("2026-10-23T13:30:00Z"), close: 345 },
  { date: new Date("2026-10-26T13:30:00Z"), close: 343.9 },
];

it("uses the last completed session before the quote's trading day", () => {
  expect(previousSessionClose(bars, new Date("2026-10-26T20:00:00Z"), "America/New_York")).toBe(
    345,
  );
});

it("ignores bars without a close and returns null when none precede the quote", () => {
  expect(
    previousSessionClose(
      [{ date: new Date("2026-10-23T13:30:00Z"), close: null }],
      new Date("2026-10-26T20:00:00Z"),
      "America/New_York",
    ),
  ).toBeNull();
});
