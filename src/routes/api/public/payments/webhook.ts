import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import type { CreemMode } from "@/lib/creem.server";

const webhookSchema = z.object({
  eventType: z.string().min(1),
  object: z.record(z.string(), z.unknown()),
});
const idSchema = z.string().uuid();

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function entityId(value: unknown): string | null {
  if (typeof value === "string") return value;
  const id = object(value)?.["id"];
  return typeof id === "string" ? id : null;
}

function timestamp(value: unknown): string | null {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;
}

function metadataUserId(...values: unknown[]): string | null {
  for (const value of values) {
    const metadata = object(value);
    if (!metadata) continue;
    const customData = object(metadata["custom_data"]);
    for (const candidate of [metadata["user_id"], customData?.["user_id"]]) {
      const parsed = idSchema.safeParse(candidate);
      if (parsed.success) return parsed.data;
    }
  }
  return null;
}

export async function applyWebhook(
  eventType: string,
  data: Record<string, unknown>,
  mode: CreemMode,
) {
  if (mode === "test") return;
  const environment = "live";
  const { getCreemPlan } = await import("@/lib/creem.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (eventType === "checkout.completed") {
    const order = object(data["order"]);
    const subscription = object(data["subscription"]);
    const isTrialing = subscription?.["status"] === "trialing";
    if (data["status"] !== "completed" || (!isTrialing && order?.["status"] !== "paid")) return;
    const subscriptionId = entityId(data["subscription"]);
    const customerId = entityId(data["customer"]);
    const productId = entityId(data["product"]) ?? entityId(subscription?.["product"]);
    const userId = metadataUserId(data["metadata"], subscription?.["metadata"]);
    const plan = productId ? getCreemPlan(productId) : null;
    const periodEnd = timestamp(subscription?.["current_period_end_date"]);
    if (!subscriptionId || !customerId || !productId || !plan || !userId || !periodEnd) {
      console.error("Creem checkout is missing valid subscription metadata");
      throw new Error("Unmatched completed Creem checkout");
    }

    const { error } = await supabaseAdmin.from("subscriptions").upsert(
      {
        user_id: userId,
        provider_subscription_id: subscriptionId,
        provider_customer_id: customerId,
        product_id: productId,
        price_id: null,
        plan: "pro",
        interval: plan.interval,
        status: isTrialing ? "trialing" : "active",
        current_period_start: timestamp(subscription?.["current_period_start_date"]),
        current_period_end: periodEnd,
        cancel_at_period_end: false,
        environment,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider_subscription_id" },
    );
    if (error) throw error;

    if (!isTrialing && mode === "prod") {
      const { error: referralError } = await supabaseAdmin.rpc("grant_referral_reward", {
        _referred_user_id: userId,
      });
      if (referralError) throw referralError;
    }

    return;
  }

  if (eventType === "subscription.trialing") {
    const subscriptionId = entityId(data);
    if (!subscriptionId) throw new Error("Creem subscription event is missing its ID");

    const customerId = entityId(data["customer"]);
    const productId = entityId(data["product"]);
    const userId = metadataUserId(data["metadata"]);
    const plan = productId ? getCreemPlan(productId) : null;
    const periodEnd = timestamp(data["current_period_end_date"]);

    if (customerId && productId && userId && plan && periodEnd) {
      const { error } = await supabaseAdmin.from("subscriptions").upsert(
        {
          user_id: userId,
          provider_subscription_id: subscriptionId,
          provider_customer_id: customerId,
          product_id: productId,
          price_id: null,
          plan: "pro",
          interval: plan.interval,
          status: "trialing",
          current_period_start: timestamp(data["current_period_start_date"]),
          current_period_end: periodEnd,
          cancel_at_period_end: false,
          environment,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "provider_subscription_id" },
      );
      if (error) throw error;
      return;
    }

    const { data: current, error: lookupError } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("provider_subscription_id", subscriptionId)
      .eq("environment", environment)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!current) {
      console.error("Creem trial event is missing valid subscription metadata");
      throw new Error("Unmatched trialing Creem subscription");
    }

    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update({
        status: "trialing",
        ...(timestamp(data["current_period_start_date"])
          ? { current_period_start: timestamp(data["current_period_start_date"]) }
          : {}),
        ...(periodEnd ? { current_period_end: periodEnd } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("provider_subscription_id", subscriptionId)
      .eq("environment", environment);
    if (error) throw error;
    return;
  }

  if (
    eventType !== "subscription.paid" &&
    eventType !== "subscription.active" &&
    eventType !== "subscription.scheduled_cancel" &&
    eventType !== "subscription.canceled" &&
    eventType !== "subscription.expired"
  )
    return;

  const subscriptionId = entityId(data);
  if (!subscriptionId) throw new Error("Creem subscription event is missing its ID");
  const { data: current, error: lookupError } = await supabaseAdmin
    .from("subscriptions")
    .select("id, user_id")
    .eq("provider_subscription_id", subscriptionId)
    .eq("environment", environment)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (!current) return;

  const status =
    eventType === "subscription.canceled"
      ? "canceled"
      : eventType === "subscription.expired"
        ? "expired"
        : "active";
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      status,
      ...(timestamp(data["current_period_start_date"])
        ? { current_period_start: timestamp(data["current_period_start_date"]) }
        : {}),
      ...(timestamp(data["current_period_end_date"])
        ? { current_period_end: timestamp(data["current_period_end_date"]) }
        : {}),
      ...(eventType === "subscription.scheduled_cancel"
        ? { cancel_at_period_end: true }
        : eventType === "subscription.canceled" || eventType === "subscription.expired"
          ? { cancel_at_period_end: false }
          : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("provider_subscription_id", subscriptionId)
    .eq("environment", environment);
  if (error) throw error;

  if (eventType === "subscription.paid" && mode === "prod") {
    const { error: referralError } = await supabaseAdmin.rpc("grant_referral_reward", {
      _referred_user_id: current.user_id,
    });
    if (referralError) throw referralError;
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        if (!body || body.length > 1_000_000)
          return new Response("Invalid webhook body", { status: 400 });
        try {
          const { getCreemMode, verifyCreemWebhookSignature } = await import("@/lib/creem.server");
          const mode = getCreemMode();
          if (!(await verifyCreemWebhookSignature(body, request.headers.get("creem-signature"))))
            return new Response("Invalid signature", { status: 401 });
          let payload: unknown;
          try {
            payload = JSON.parse(body);
          } catch {
            return new Response("Invalid webhook payload", { status: 400 });
          }
          const parsed = webhookSchema.safeParse(payload);
          if (!parsed.success) return new Response("Invalid webhook payload", { status: 400 });
          await applyWebhook(parsed.data.eventType, parsed.data.object, mode);
          return Response.json({ received: true });
        } catch (error) {
          console.error("Creem webhook error:", error);
          return new Response("Webhook error", { status: 500 });
        }
      },
    },
  },
});
