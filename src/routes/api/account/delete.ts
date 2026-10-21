import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import type { PaddleEnv } from "@/lib/paddle.server";

const requestSchema = z.object({ confirmEmail: z.string().email().max(320) }).strict();

export const Route = createFileRoute("/api/account/delete")({
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
        const parsed = requestSchema.safeParse(payload);
        if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(token);
        const user = auth.user;
        if (authError || !user?.email)
          return Response.json({ error: "Invalid session" }, { status: 401 });
        if (parsed.data.confirmEmail.trim().toLowerCase() !== user.email.toLowerCase())
          return Response.json({ error: "Confirmation email does not match" }, { status: 400 });

        const { data: subscriptions, error: subscriptionError } = await supabaseAdmin
          .from("subscriptions")
          .select(
            "paddle_subscription_id,environment,status,cancel_at_period_end,current_period_end",
          )
          .eq("user_id", user.id)
          .in("status", ["active", "trialing", "past_due", "canceled"]);
        if (subscriptionError) {
          console.error("Unable to load subscriptions before account deletion", subscriptionError);
          return Response.json(
            { error: "Unable to prepare subscription cancellation" },
            { status: 500 },
          );
        }

        const now = Date.now();
        for (const subscription of subscriptions) {
          if (!["active", "trialing", "past_due"].includes(subscription.status)) continue;
          if (subscription.cancel_at_period_end) continue;
          if (subscription.current_period_end && Date.parse(subscription.current_period_end) <= now)
            continue;
          if (!subscription.paddle_subscription_id) {
            console.error("Active subscription is missing its Paddle ID", { userId: user.id });
            return Response.json(
              { error: "Unable to cancel subscription renewal; account was not deleted" },
              { status: 502 },
            );
          }
          try {
            const env: PaddleEnv = subscription.environment === "live" ? "live" : "sandbox";
            const { getPaddleClient } = await import("@/lib/paddle.server");
            await getPaddleClient(env).subscriptions.cancel(subscription.paddle_subscription_id, {
              effectiveFrom: "next_billing_period",
            });
          } catch (error) {
            console.error("Unable to cancel renewal before account deletion", error);
            return Response.json(
              { error: "Unable to cancel subscription renewal; account was not deleted" },
              { status: 502 },
            );
          }
        }

        const subscriptionsWithAccess = subscriptions.filter((subscription) =>
          ["active", "trialing", "past_due"].includes(subscription.status)
            ? !subscription.current_period_end || Date.parse(subscription.current_period_end) > now
            : subscription.status === "canceled" &&
              !!subscription.current_period_end &&
              Date.parse(subscription.current_period_end) > now,
        );
        if (subscriptionsWithAccess.length) {
          const accessUntil = subscriptionsWithAccess.every(
            (subscription) => subscription.current_period_end,
          )
            ? subscriptionsWithAccess
                .map((subscription) => subscription.current_period_end!)
                .sort((a, b) => Date.parse(b) - Date.parse(a))[0]
            : null;
          return Response.json({ deleted: false, accessUntil });
        }

        const { data: files, error: filesError } = await supabaseAdmin.storage
          .from("avatars")
          .list(user.id);
        if (filesError) {
          console.error("Unable to list account avatar files", filesError);
          return Response.json(
            { error: "Unable to remove account files; account was not deleted" },
            { status: 500 },
          );
        }
        if (files.length) {
          const paths = files
            .filter((file) => file.name && !file.name.startsWith("."))
            .map((file) => `${user.id}/${file.name}`);
          if (paths.length) {
            const { error } = await supabaseAdmin.storage.from("avatars").remove(paths);
            if (error) {
              console.error("Unable to remove account avatar files", error);
              return Response.json(
                { error: "Unable to remove account files; account was not deleted" },
                { status: 500 },
              );
            }
          }
        }

        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        if (deleteError) {
          console.error("Unable to delete account", deleteError);
          return Response.json({ error: "Unable to delete account" }, { status: 500 });
        }
        return Response.json({ deleted: true });
      },
    },
  },
});
