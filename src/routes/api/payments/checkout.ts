import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const requestSchema = z
  .object({
    interval: z.enum(["month", "year"]),
    promo: z
      .string()
      .regex(/^[A-Za-z0-9_-]{3,32}$/)
      .optional(),
  })
  .strict();

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
          const base = {
            userId: auth.user.id,
            email: auth.user.email,
            interval: parsed.data.interval,
          };
          // The promo applies to the yearly plan only; an expired or invalid code falls back to full price.
          const promo = parsed.data.interval === "year" ? parsed.data.promo : undefined;
          let url: string;
          try {
            url = await createCreemCheckout({ ...base, discountCode: promo });
          } catch (error) {
            if (!promo) throw error;
            console.warn("Creem rejected the promo code; continuing without it", error);
            url = await createCreemCheckout(base);
          }
          return Response.json({ url });
        } catch (error) {
          console.error("Unable to create Creem checkout", error);
          return Response.json({ error: "Unable to start checkout" }, { status: 502 });
        }
      },
    },
  },
});
