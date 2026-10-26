export type AnalyticsEvent =
  | "pricing_view"
  | "signup_completed"
  | "first_holding_added"
  | "checkout_started"
  | "checkout_completed"
  | "referral_link_copied";

const CONSENT_KEY = "folio-analytics-consent";
const SESSION_KEY = "folio-analytics-session";

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
    window.dispatchEvent(new Event("folio-analytics-consent-changed"));
  } catch (error) {
    console.error("Unable to save analytics preference", error);
    throw error;
  }
}

export function openAnalyticsPreferences(): void {
  window.dispatchEvent(new Event("folio-open-analytics-preferences"));
}

export function trackAnalyticsEvent(event: AnalyticsEvent): void {
  if (!hasAnalyticsConsent()) return;

  try {
    let sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }

    void fetch("/api/public/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, event }),
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
