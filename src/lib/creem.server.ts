import { z } from "zod";

export type CreemMode = "test" | "prod";

type CreemProductPlan = {
  productId: string;
  interval: "month" | "year";
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function getCreemMode(): CreemMode {
  const mode = requiredEnv("CREEM_MODE");
  if (mode !== "test" && mode !== "prod") throw new Error("CREEM_MODE must be test or prod");
  return mode;
}

export function getCreemProductPlans(): CreemProductPlan[] {
  return [
    { productId: requiredEnv("CREEM_PRODUCT_ID_MONTHLY"), interval: "month" },
    { productId: requiredEnv("CREEM_PRODUCT_ID_YEARLY"), interval: "year" },
  ];
}

export function getCreemPlan(productId: string): CreemProductPlan | null {
  return getCreemProductPlans().find((plan) => plan.productId === productId) ?? null;
}

function apiBaseUrl(mode: CreemMode): string {
  return mode === "test" ? "https://test-api.creem.io" : "https://api.creem.io";
}

async function creemRequest(
  mode: CreemMode,
  path: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${apiBaseUrl(mode)}${path}`, {
    method: "POST",
    headers: {
      "x-api-key": requiredEnv("CREEM_API_KEY"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Creem API request failed (${response.status})`);
  const parsed = z.record(z.string(), z.unknown()).safeParse(await response.json());
  if (!parsed.success) throw new Error("Creem API returned an invalid response");
  return parsed.data;
}

export async function createCreemCheckout(input: {
  userId: string;
  email: string;
  interval: "month" | "year";
}): Promise<string> {
  const mode = getCreemMode();
  const product = getCreemProductPlans().find((plan) => plan.interval === input.interval);
  if (!product) throw new Error(`Creem product for ${input.interval} is not configured`);
  const appUrl = new URL(requiredEnv("PUBLIC_APP_URL"));
  if (appUrl.protocol !== "https:" && appUrl.hostname !== "localhost")
    throw new Error("PUBLIC_APP_URL must use HTTPS");
  const result = await creemRequest(mode, "/v1/checkouts", {
    product_id: product.productId,
    units: 1,
    customer: { email: input.email },
    success_url: new URL("/pricing?checkout=success", appUrl).toString(),
    metadata: {
      user_id: input.userId,
      plan: "pro",
      interval: input.interval,
    },
  });
  const checkoutUrl = result["checkout_url"];
  if (typeof checkoutUrl !== "string" || !isCreemUrl(checkoutUrl))
    throw new Error("Creem did not return a valid checkout URL");
  return checkoutUrl;
}

export async function createCreemBillingLink(mode: CreemMode, customerId: string): Promise<string> {
  const result = await creemRequest(mode, "/v1/customers/billing", { customer_id: customerId });
  const portalUrl = result["customer_portal_link"];
  if (typeof portalUrl !== "string" || !isCreemUrl(portalUrl))
    throw new Error("Creem did not return a valid customer portal URL");
  return portalUrl;
}

export async function cancelCreemSubscription(
  mode: CreemMode,
  subscriptionId: string,
): Promise<void> {
  await creemRequest(mode, `/v1/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
    mode: "scheduled",
    onExecute: "cancel",
  });
}

export async function verifyCreemWebhookSignature(
  body: string,
  signature: string | null,
  secret = requiredEnv("CREEM_WEBHOOK_SECRET"),
): Promise<boolean> {
  if (!signature || !/^[a-f\d]{64}$/i.test(signature)) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)),
  );
  const expected = Array.from(signed, (byte) => byte.toString(16).padStart(2, "0")).join("");
  let difference = 0;
  for (let index = 0; index < expected.length; index++)
    difference |= expected.charCodeAt(index) ^ signature.toLowerCase().charCodeAt(index);
  return difference === 0;
}

function isCreemUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "creem.io" || url.hostname.endsWith(".creem.io"))
    );
  } catch {
    return false;
  }
}
