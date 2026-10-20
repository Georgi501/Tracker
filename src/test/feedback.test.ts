import { expect, it } from "vitest";
import { feedbackSchema } from "@/lib/feedback";

it("validates and trims feedback", () => {
  expect(feedbackSchema.parse({ category: "idea", message: "  Please add price alerts  " })).toEqual({ category: "idea", message: "Please add price alerts" });
});
it("rejects blank and oversized messages", () => {
  expect(feedbackSchema.safeParse({ category: "bug", message: "          " }).success).toBe(false);
  expect(feedbackSchema.safeParse({ category: "bug", message: "a".repeat(2001) }).success).toBe(false);
});
it("rejects unsupported feedback categories", () => {
  expect(feedbackSchema.safeParse({ category: "admin", message: "A valid message here" }).success).toBe(false);
});