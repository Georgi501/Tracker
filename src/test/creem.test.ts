import { afterEach, expect, it, vi } from "vitest";
import { getCreemPlan, getCreemMode, verifyCreemWebhookSignature } from "@/lib/creem.server";

afterEach(() => {
  vi.unstubAllEnvs();
});

it("verifies Creem signatures against the exact raw payload", async () => {
  const body = JSON.stringify({ eventType: "checkout.completed" });
  const secret = "test-webhook-secret";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = Array.from(
    new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body))),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");

  await expect(verifyCreemWebhookSignature(body, signature, secret)).resolves.toBe(true);
  await expect(verifyCreemWebhookSignature(`${body} `, signature, secret)).resolves.toBe(false);
  await expect(verifyCreemWebhookSignature(body, "invalid", secret)).resolves.toBe(false);
});

it("requires a supported environment and maps only configured product IDs", () => {
  vi.stubEnv("CREEM_MODE", "prod");
  vi.stubEnv("CREEM_PRODUCT_ID_MONTHLY", "prod_monthly");
  vi.stubEnv("CREEM_PRODUCT_ID_YEARLY", "prod_yearly");

  expect(getCreemMode()).toBe("prod");
  expect(getCreemPlan("prod_monthly")).toEqual({ productId: "prod_monthly", interval: "month" });
  expect(getCreemPlan("prod_yearly")).toEqual({ productId: "prod_yearly", interval: "year" });
  expect(getCreemPlan("unconfigured")).toBeNull();

  vi.stubEnv("CREEM_MODE", "sandbox");
  expect(() => getCreemMode()).toThrow("CREEM_MODE must be test or prod");
});
