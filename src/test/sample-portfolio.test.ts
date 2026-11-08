import { expect, it } from "vitest";
import {
  SAMPLE_COST_BASIS,
  SAMPLE_GAIN,
  SAMPLE_GAIN_PERCENT,
  SAMPLE_HISTORY,
  SAMPLE_TOTAL_VALUE,
} from "@/lib/sample-portfolio";

it("keeps the homepage and demo portfolio totals consistent", () => {
  expect(SAMPLE_TOTAL_VALUE).toBe(16985);
  expect(SAMPLE_COST_BASIS).toBe(13670);
  expect(SAMPLE_GAIN).toBe(3315);
  expect(SAMPLE_GAIN_PERCENT.toFixed(1)).toBe("24.3");
  expect(SAMPLE_HISTORY.at(-1)?.value).toBe(SAMPLE_TOTAL_VALUE);
});
