import { createFileRoute } from "@tanstack/react-router";
import type { PaddleEnv } from "@/lib/paddle.server";

type Sub = {
  id: string; customerId: string; status: string; customData?: { userId?: string } | null;
  currentBillingPeriod?: { startsAt?: string; endsAt?: string } | null;
  scheduledChange?: { action?: string } | null;
  items: { price?: { importMeta?: { externalId?: string } | null; billingCycle?: { interval?: string } }; product?: { importMeta?: { externalId?: string } | null } }[];
};

async function handle(request: Request, env: PaddleEnv) {
  const { verifyWebhook, EventName } = await import("@/lib/paddle.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const event = await verifyWebhook(request, env);
  const data = event.data as unknown as Sub;
  if (event.eventType === EventName.SubscriptionCreated) {
    const userId = data.customData?.userId;
    const item = data.items[0];
    const priceId = item?.price?.importMeta?.externalId; const productId = item?.product?.importMeta?.externalId;
    if (!userId || !priceId || !productId) { console.warn("Skipping subscription without user or catalog ids"); return; }
    const { error } = await supabaseAdmin.from("subscriptions").upsert({
      user_id: userId, paddle_subscription_id: data.id, paddle_customer_id: data.customerId,
      product_id: productId, price_id: priceId, plan: "pro", interval: item?.price?.billingCycle?.interval ?? null,
      status: data.status, current_period_start: data.currentBillingPeriod?.startsAt ?? null,
      current_period_end: data.currentBillingPeriod?.endsAt ?? null, environment: env, updated_at: new Date().toISOString(),
    }, { onConflict: "paddle_subscription_id" });
    if (error) throw error;
  } else if (event.eventType === EventName.SubscriptionUpdated || event.eventType === EventName.SubscriptionCanceled) {
    const canceled = event.eventType === EventName.SubscriptionCanceled;
    const { error } = await supabaseAdmin.from("subscriptions").update({
      status: canceled ? "canceled" : data.status,
      ...(data.currentBillingPeriod?.startsAt ? { current_period_start: data.currentBillingPeriod.startsAt } : {}),
      ...(data.currentBillingPeriod?.endsAt ? { current_period_end: data.currentBillingPeriod.endsAt } : {}),
      cancel_at_period_end: data.scheduledChange?.action === "cancel",
      updated_at: new Date().toISOString(),
    }).eq("paddle_subscription_id", data.id).eq("environment", env);
    if (error) throw error;
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const env: PaddleEnv = new URL(request.url).searchParams.get("env") === "live" ? "live" : "sandbox";
        try { await handle(request, env); return Response.json({ received: true }); }
        catch (e) { console.error("Webhook error:", e); return new Response("Webhook error", { status: 400 }); }
      },
    },
  },
});
