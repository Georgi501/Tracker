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

  expect(fetch).toHaveBeenCalledWith(
    "/api/public/analytics",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ sessionId, visitorId: sessionId, event: "pricing_view" }),
    }),
  );
  expect(sessionStorage.getItem("folio-analytics-session")).toBe(sessionId);
});

it("records onboarding funnel events after consent", () => {
  setAnalyticsConsent(true);
  trackAnalyticsEvent("csv_import_started");

  expect(fetch).toHaveBeenCalledWith(
    "/api/public/analytics",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ sessionId, visitorId: sessionId, event: "csv_import_started" }),
    }),
  );
});

it("records CSV demo steps with only their page path after consent", () => {
  setAnalyticsConsent(true);
  trackAnalyticsEvent("csv_demo_view", undefined, "/import-demo");
  trackAnalyticsEvent("csv_demo_import_click", undefined, "/import-demo");

  expect(fetch).toHaveBeenNthCalledWith(
    1,
    "/api/public/analytics",
    expect.objectContaining({
      body: JSON.stringify({
        sessionId,
        visitorId: sessionId,
        event: "csv_demo_view",
        pagePath: "/import-demo",
      }),
    }),
  );
  expect(fetch).toHaveBeenNthCalledWith(
    2,
    "/api/public/analytics",
    expect.objectContaining({
      body: JSON.stringify({
        sessionId,
        visitorId: sessionId,
        event: "csv_demo_import_click",
        pagePath: "/import-demo",
      }),
    }),
  );
});

it("records confirmed sign-ups with the auth page after consent", () => {
  setAnalyticsConsent(true);
  trackAnalyticsEvent("signup_confirmed", undefined, "/auth");

  expect(fetch).toHaveBeenCalledWith(
    "/api/public/analytics",
    expect.objectContaining({
      body: JSON.stringify({
        sessionId,
        visitorId: sessionId,
        event: "signup_confirmed",
        pagePath: "/auth",
      }),
    }),
  );
});

it("stops recording events after consent is rejected", () => {
  setAnalyticsConsent(true);
  setAnalyticsConsent(false);
  trackAnalyticsEvent("checkout_started");
  trackAnalyticsEvent("csv_demo_view", undefined, "/import-demo");
  expect(fetch).not.toHaveBeenCalled();
});
