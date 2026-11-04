export type AnalyticsEvent =
  | "site_visit"
  | "visit_end"
  | "pricing_view"
  | "signup_completed"
  | "first_holding_added"
  | "manual_entry_started"
  | "csv_import_started"
  | "csv_import_completed"
  | "checkout_started"
  | "checkout_completed"
  | "referral_link_copied";

const CONSENT_KEY = "folio-analytics-consent";
const SESSION_KEY = "folio-analytics-session";
const VISITOR_KEY = "folio-analytics-visitor";
const VISIT_KEY = "folio-analytics-visit";

/** Records one visit per browser session, and only with analytics consent. */
export function trackSiteVisit(): void {
  if (!hasAnalyticsConsent()) return;
  try {
    if (sessionStorage.getItem(VISIT_KEY)) return;
    sessionStorage.setItem(VISIT_KEY, "1");
  } catch {
    return;
  }
  trackAnalyticsEvent("site_visit");
  startEngagementTracking();
}

let engagementStarted = false;
let visibleSince: number | null = null;

function flushEngagement(): void {
  if (visibleSince === null) return;
  const seconds = Math.round((Date.now() - visibleSince) / 1000);
  visibleSince = null;
  if (seconds >= 1) trackAnalyticsEvent("visit_end", Math.min(seconds, 86400));
}

/** Measures only the time the tab is visible and sends it when the tab is hidden or closed. */
function startEngagementTracking(): void {
  if (engagementStarted || typeof document === "undefined") return;
  engagementStarted = true;
  if (document.visibilityState === "visible") visibleSince = Date.now();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushEngagement();
    else visibleSince = Date.now();
  });
  window.addEventListener("pagehide", flushEngagement);
}

export function hasAnalyticsConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

export function setAnalyticsConsent(accepted: boolean): void {
  try {
    localStorage.setItem(CONSENT_KEY, accepted ? "accepted" : "rejected");
    if (!accepted) localStorage.removeItem(VISITOR_KEY);
    window.dispatchEvent(new Event("folio-analytics-consent-changed"));
  } catch (error) {
    console.error("Unable to save analytics preference", error);
    throw error;
  }
}

export function openAnalyticsPreferences(): void {
  window.dispatchEvent(new Event("folio-open-analytics-preferences"));
}

export function trackAnalyticsEvent(event: AnalyticsEvent, durationSeconds?: number): void {
  if (!hasAnalyticsConsent()) return;

  try {
    let sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }
    let visitorId = localStorage.getItem(VISITOR_KEY);
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, visitorId);
    }

    void fetch("/api/public/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        durationSeconds
          ? { sessionId, visitorId, event, durationSeconds }
          : { sessionId, visitorId, event },
      ),
      keepalive: true,
    })
      .then((response) => {
        if (!response.ok) console.warn("Analytics event was not recorded", response.status);
      })
      .catch((error: unknown) => {
        console.warn("Analytics event was not recorded", error);
      });
  } catch (error) {
    console.warn("Analytics event was not recorded", error);
  }
}
