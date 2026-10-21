import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { setAnalyticsConsent, trackAnalyticsEvent } from "@/lib/analytics";

const sessionId = "7e4f1e4e-b031-49ef-a921-ea564e1408d3";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.stubGlobal("crypto", { randomUUID: () => sessionId });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it("does not record events before analytics consent", () => {
  trackAnalyticsEvent("pricing_view");
  expect(fetch).not.toHaveBeenCalled();
});

it("records only the allowed event and temporary session identifier after consent", () => {
  setAnalyticsConsent(true);
  trackAnalyticsEvent("pricing_view");

  expect(fetch).toHaveBeenCalledWith("/api/public/analytics", expect.objectContaining({
    method: "POST",
    body: JSON.stringify({ sessionId, event: "pricing_view" }),
  }));
  expect(sessionStorage.getItem("folio-analytics-session")).toBe(sessionId);
});

it("stops recording events after consent is rejected", () => {
  setAnalyticsConsent(true);
  setAnalyticsConsent(false);
  trackAnalyticsEvent("checkout_started");
  expect(fetch).not.toHaveBeenCalled();
});
