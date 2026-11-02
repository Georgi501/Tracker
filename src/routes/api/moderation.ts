import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

const actionSchema = z
  .object({
    action: z.enum(["hide", "unhide", "delete", "dismiss"]),
    postId: z.string().uuid(),
  })
  .strict();

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

async function guard(request: Request) {
  const { authenticateAdmin } = await import("@/integrations/supabase/admin-auth.server");
  return authenticateAdmin(request);
}

export const Route = createFileRoute("/api/moderation")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await guard(request);
        if ("response" in auth) return auth.response;
        const db = auth.supabaseAdmin as unknown as SupabaseClient;
        const { data: reports, error } = await db
          .from("wall_reports")
          .select("post_id, created_at")
          .order("created_at", { ascending: false })
          .limit(500);
        if (error) {
          console.error("Unable to load reports", error);
          return json({ error: "Unable to load reports" }, 500);
        }
        const counts = new Map<string, { count: number; last: string }>();
        for (const r of reports ?? []) {
          const c = counts.get(r.post_id);
          counts.set(r.post_id, { count: (c?.count ?? 0) + 1, last: c?.last ?? r.created_at });
        }
        const ids = [...counts.keys()];
        if (!ids.length) return json({ items: [] });
        const { data: posts, error: postsError } = await db
          .from("wall_posts")
          .select("id, user_id, body, mood, created_at, hidden_at")
          .in("id", ids);
        if (postsError) {
          console.error("Unable to load reported posts", postsError);
          return json({ error: "Unable to load reported posts" }, 500);
        }
        const authorIds = [...new Set((posts ?? []).map((p) => p.user_id))];
        const { data: profiles } = await db
          .from("profiles")
          .select("id, display_name")
          .in("id", authorIds);
        const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
        const items = (posts ?? [])
          .map((p) => ({
            ...p,
            author: names.get(p.user_id) ?? null,
            reports: counts.get(p.id)?.count ?? 0,
            last_report: counts.get(p.id)?.last ?? p.created_at,
          }))
          .sort((a, b) => b.last_report.localeCompare(a.last_report));
        return json({ items });
      },
      POST: async ({ request }) => {
        const auth = await guard(request);
        if ("response" in auth) return auth.response;
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }
        const parsed = actionSchema.safeParse(payload);
        if (!parsed.success) return json({ error: "Invalid request" }, 400);
        const { action, postId } = parsed.data;
        const db = auth.supabaseAdmin as unknown as SupabaseClient;
        const result =
          action === "hide"
            ? await db
                .from("wall_posts")
                .update({ hidden_at: new Date().toISOString() })
                .eq("id", postId)
            : action === "unhide"
              ? await db.from("wall_posts").update({ hidden_at: null }).eq("id", postId)
              : action === "delete"
                ? await db.from("wall_posts").delete().eq("id", postId)
                : await db.from("wall_reports").delete().eq("post_id", postId);
        if (result.error) {
          console.error("Moderation action failed", result.error);
          return json({ error: "Unable to apply this action" }, 500);
        }
        return json({ ok: true });
      },
    },
  },
});
