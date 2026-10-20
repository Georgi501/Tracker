import { resolvePaddlePrice } from "./payments.functions";

const clientToken = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] as string | undefined;

declare global {
  interface Window { Paddle: any }
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
      window.Paddle.Environment.set(getPaddleEnvironment() === "sandbox" ? "sandbox" : "production");
      window.Paddle.Initialize({ token: clientToken, eventCallback: (e: { name?: string }) => paddleListeners.forEach((l) => l(e)) });
      resolve();
    };
    script.onerror = () => { ready = null; reject(new Error("Checkout failed to load")); };
    document.head.appendChild(script);
  });
  if (onEvent) paddleListeners.add(onEvent);
  return ready;
}
export const paddleListeners = new Set<(e: { name?: string }) => void>();

export async function openProCheckout(opts: { priceId: "pro_monthly" | "pro_yearly"; userId: string; email?: string | undefined }) {
  await initializePaddle();
  const priceId = await resolvePaddlePrice({ data: { priceId: opts.priceId, environment: getPaddleEnvironment() } });
  window.Paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customer: opts.email ? { email: opts.email } : undefined,
    customData: { userId: opts.userId },
    settings: { displayMode: "overlay", successUrl: `${window.location.origin}/pricing?checkout=success`, allowLogout: false, variant: "one-page" },
  });
}
