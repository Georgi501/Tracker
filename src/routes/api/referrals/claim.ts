import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const claimSchema = z.object({ code: z.string().regex(/^[a-fA-F0-9]{16}$/) }).strict();

export const Route = createFileRoute("/api/referrals/claim")({
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
        const parsed = claimSchema.safeParse(payload);
        if (!parsed.success)
          return Response.json({ error: "Invalid referral code" }, { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !auth.user)
          return Response.json({ error: "Invalid session" }, { status: 401 });

        const { data, error } = await supabaseAdmin.rpc("claim_referral_code", {
          _user_id: auth.user.id,
          _code: parsed.data.code,
        });
        if (error) {
          console.error("Unable to claim referral", error);
          return Response.json({ error: "Unable to claim referral" }, { status: 500 });
        }
        return Response.json({ linked: data });
      },
    },
  },
});
