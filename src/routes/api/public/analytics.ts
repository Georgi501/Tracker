import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const eventSchema = z
  .object({
    sessionId: z.string().uuid(),
    event: z.enum([
      "pricing_view",
      "signup_completed",
      "first_holding_added",
      "manual_entry_started",
      "csv_import_started",
      "csv_import_completed",
      "checkout_started",
      "checkout_completed",
      "referral_link_copied",
    ]),
  })
  .strict();

export const Route = createFileRoute("/api/public/analytics")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const parsed = eventSchema.safeParse(payload);
        if (!parsed.success)
          return Response.json({ error: "Invalid analytics event" }, { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("record_analytics_event", {
          _session_id: parsed.data.sessionId,
          _event_name: parsed.data.event,
        });
        if (error) {
          console.error("Unable to record analytics event", error);
          return Response.json({ error: "Unable to record analytics event" }, { status: 500 });
        }
        return Response.json({ recorded: data }, { status: data ? 202 : 429 });
      },
    },
  },
});
