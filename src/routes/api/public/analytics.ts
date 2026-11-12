import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const eventSchema = z
  .object({
    sessionId: z.string().uuid(),
    visitorId: z.string().uuid().optional(),
    durationSeconds: z.number().int().min(1).max(86400).optional(),
    pagePath: z.enum(["/import-demo", "/auth"]).optional(),
    event: z.enum([
      "site_visit",
      "visit_end",
      "pricing_view",
      "signup_completed",
      "signup_confirmed",
      "first_holding_added",
      "csv_demo_view",
      "csv_demo_import_click",
      "manual_entry_started",
      "csv_import_started",
      "csv_import_completed",
      "checkout_started",
      "checkout_completed",
      "referral_link_copied",
    ]),
  })
  .strict()
  .superRefine(({ event, pagePath }, context) => {
    const expectedPath =
      event === "signup_confirmed"
        ? "/auth"
        : event === "csv_demo_view" || event === "csv_demo_import_click"
          ? "/import-demo"
          : undefined;
    if (pagePath !== expectedPath) {
      context.addIssue({
        code: "custom",
        message: "Invalid analytics page path",
        path: ["pagePath"],
      });
    }
  });

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
          ...(parsed.data.visitorId ? { _visitor_id: parsed.data.visitorId } : {}),
          ...(parsed.data.durationSeconds
            ? { _duration_seconds: parsed.data.durationSeconds }
            : {}),
          ...(parsed.data.pagePath ? { _page_path: parsed.data.pagePath } : {}),
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
