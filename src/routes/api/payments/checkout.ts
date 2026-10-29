import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const requestSchema = z.object({ interval: z.enum(["month", "year"]) }).strict();

export const Route = createFileRoute("/api/payments/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
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
        const { data: auth, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !auth.user)
          return Response.json({ error: "Invalid session" }, { status: 401 });
        if (!auth.user.email)
          return Response.json(
            { error: "An email address is required for checkout" },
            { status: 400 },
          );

        try {
          const { createCreemCheckout } = await import("@/lib/creem.server");
          const url = await createCreemCheckout({
            userId: auth.user.id,
            email: auth.user.email,
            interval: parsed.data.interval,
          });
          return Response.json({ url });
        } catch (error) {
          console.error("Unable to create Creem checkout", error);
          return Response.json({ error: "Unable to start checkout" }, { status: 502 });
        }
      },
    },
  },
});
