import { resolvePaddlePrice } from "./payments.functions";

const clientToken = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] as string | undefined;

type PaddleEvent = { name?: string };

type PaddleInstance = {
  Environment: { set: (environment: "sandbox" | "production") => void };
  Initialize: (options: { token: string; eventCallback: (event: PaddleEvent) => void }) => void;
  Checkout: {
    open: (options: {
      items: { priceId: string; quantity: number }[];
      customer?: { email: string } | undefined;
      customData: { userId: string };
      settings: {
        displayMode: "overlay";
        successUrl: string;
        allowLogout: boolean;
        showAddDiscounts: boolean;
        variant: "one-page";
      };
    }) => void;
  };
};

declare global {
  interface Window {
    Paddle: PaddleInstance;
  }
}

export function getPaddleEnvironment(): "sandbox" | "live" {
  return clientToken?.startsWith("test_") ? "sandbox" : "live";
}

let ready: Promise<void> | null = null;
export function initializePaddle(onEvent?: (e: { name?: string }) => void) {
  if (!clientToken) return Promise.reject(new Error("Payments are not configured"));
  ready ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.onload = () => {
      window.Paddle.Environment.set(
        getPaddleEnvironment() === "sandbox" ? "sandbox" : "production",
      );
      window.Paddle.Initialize({
        token: clientToken,
        eventCallback: (e: { name?: string }) => paddleListeners.forEach((l) => l(e)),
      });
      resolve();
    };
    script.onerror = () => {
      ready = null;
      reject(new Error("Checkout failed to load"));
    };
    document.head.appendChild(script);
  });
  if (onEvent) paddleListeners.add(onEvent);
  return ready;
}
export const paddleListeners = new Set<(e: { name?: string }) => void>();

export async function openProCheckout(opts: {
  priceId: "pro_monthly" | "pro_yearly";
  userId: string;
  email?: string | undefined;
}) {
  await initializePaddle();
  const priceId = await resolvePaddlePrice({
    data: { priceId: opts.priceId, environment: getPaddleEnvironment() },
  });
  const { trackAnalyticsEvent } = await import("./analytics");
  trackAnalyticsEvent("checkout_started");
  window.Paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customer: opts.email ? { email: opts.email } : undefined,
    customData: { userId: opts.userId },
    settings: {
      displayMode: "overlay",
      successUrl: `${window.location.origin}/pricing?checkout=success`,
      allowLogout: false,
      showAddDiscounts: true,
      variant: "one-page",
    },
  });
}
