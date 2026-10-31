import { describe, expect, it } from "vitest";
import { localDateString } from "@/lib/local-date";

describe("localDateString", () => {
  it("formats the calendar day in the local timezone", () => {
    expect(localDateString(new Date(2026, 0, 2, 0, 15))).toBe("2026-01-02");
  });

  it("pads single-digit months and days", () => {
    expect(localDateString(new Date(2026, 2, 4, 12))).toBe("2026-03-04");
  });
});
