import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

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
          .select("provider_customer_id,environment,status,current_period_end")
          .eq("user_id", auth.user.id)
          .in("status", ["active", "trialing", "past_due", "canceled"]);
        if (error) {
          console.error("Unable to load subscription for customer portal", error);
          return Response.json({ error: "Unable to load subscription" }, { status: 500 });
        }
        const now = Date.now();
        const subscription = rows.find(
          (row) =>
            row.provider_customer_id &&
            (!row.current_period_end || Date.parse(row.current_period_end) > now),
        );
        if (!subscription?.provider_customer_id)
          return Response.json(
            { error: "No active Creem subscription was found" },
            { status: 404 },
          );

        try {
          if (subscription.environment !== "live" && subscription.environment !== "sandbox")
            throw new Error("Unsupported Creem environment");
          const { createCreemBillingLink } = await import("@/lib/creem.server");
          const url = await createCreemBillingLink(
            subscription.environment === "live" ? "prod" : "test",
            subscription.provider_customer_id,
          );
          return Response.json({ url });
        } catch (error) {
          console.error("Unable to create Creem customer portal session", error);
          return Response.json({ error: "Unable to open billing portal" }, { status: 502 });
        }
      },
    },
  },
});
