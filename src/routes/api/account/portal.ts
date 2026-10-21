import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import type { PaddleEnv } from "@/lib/paddle.server";

const requestSchema = z.object({}).strict();

export const Route = createFileRoute("/api/account/portal")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
        if (!token) return Response.json({ error: "Authentication required" }, { status: 401 });
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        if (!requestSchema.safeParse(payload).success)
          return Response.json({ error: "Invalid request" }, { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !auth.user)
          return Response.json({ error: "Invalid session" }, { status: 401 });

        const { data: rows, error } = await supabaseAdmin
          .from("subscriptions")
          .select(
            "paddle_subscription_id,paddle_customer_id,environment,status,current_period_end,cancel_at_period_end",
          )
          .eq("user_id", auth.user.id)
          .in("status", ["active", "trialing", "past_due", "canceled"]);
        if (error) {
          console.error("Unable to load subscription for customer portal", error);
          return Response.json({ error: "Unable to load subscription" }, { status: 500 });
        }
        const now = Date.now();
        const subscription = rows.find(
          (row) =>
            row.paddle_subscription_id &&
            row.paddle_customer_id &&
            (!row.current_period_end || Date.parse(row.current_period_end) > now),
        );
        if (!subscription?.paddle_subscription_id || !subscription.paddle_customer_id)
          return Response.json(
            { error: "No active Paddle subscription was found" },
            { status: 404 },
          );

        try {
          const env: PaddleEnv = subscription.environment === "live" ? "live" : "sandbox";
          const { getPaddleClient } = await import("@/lib/paddle.server");
          const session = await getPaddleClient(env).customerPortalSessions.create(
            subscription.paddle_customer_id,
            [subscription.paddle_subscription_id],
          );
          return Response.json({ url: session.urls.general.overview });
        } catch (error) {
          console.error("Unable to create Paddle customer portal session", error);
          return Response.json({ error: "Unable to open billing portal" }, { status: 502 });
        }
      },
    },
  },
});
