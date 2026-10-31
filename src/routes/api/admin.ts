import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const emailSchema = z.string().trim().email().max(254);
const pageSchema = z.coerce.number().int().min(1).max(100_000).default(1);
const ADMIN_PAGE_SIZE = 25;
const mutationSchema = z
  .object({
    action: z.enum(["grant", "revoke"]),
    email: emailSchema,
  })
  .strict();

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

async function authenticateAdmin(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { response: json({ error: "Authentication required" }, 401) };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !auth.user) return { response: json({ error: "Invalid session" }, 401) };

  const { data: admin, error: adminError } = await supabaseAdmin
    .from("site_admins")
    .select("user_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (adminError) {
    console.error("Unable to verify site administrator", adminError);
    return { response: json({ error: "Unable to verify access" }, 500) };
  }
  if (!admin) return { response: json({ error: "Administrator access required" }, 403) };
  return { supabaseAdmin, user: auth.user };
}

function failure(error: unknown, fallback: string) {
  console.error(fallback, error);
  return json({ error: fallback }, 500);
}

export const Route = createFileRoute("/api/admin")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await authenticateAdmin(request);
        if ("response" in auth) return auth.response;

        const searchParams = new URL(request.url).searchParams;
        const emailValue = searchParams.get("email");
        const email = emailValue ? emailSchema.safeParse(emailValue) : null;
        if (emailValue && !email?.success)
          return json({ error: "Enter a valid email address" }, 400);
        const pageResult = pageSchema.safeParse(searchParams.get("page") ?? 1);
        if (!pageResult.success) return json({ error: "Invalid account page" }, 400);
        const page = pageResult.data;

        const [statsResult, accountResult, usersResult] = await Promise.all([
          auth.supabaseAdmin.rpc("admin_dashboard_stats"),
          email?.success
            ? auth.supabaseAdmin.rpc("admin_user_summary", { _email: email.data })
            : Promise.resolve({ data: [], error: null }),
          auth.supabaseAdmin.auth.admin.listUsers({ page, perPage: ADMIN_PAGE_SIZE }),
        ]);
        if (statsResult.error) return failure(statsResult.error, "Unable to load admin summary");
        if (accountResult.error)
          return failure(accountResult.error, "Unable to look up this account");
        if (usersResult.error)
          return failure(usersResult.error, "Unable to load registered accounts");
        const proResults = await Promise.all(
          usersResult.data.users.map(async (user) => {
            const result = await auth.supabaseAdmin.rpc("is_pro", {
              _user_id: user.id,
            });
            return { user, result };
          }),
        );
        const proError = proResults.find(({ result }) => result.error)?.result.error;
        if (proError) return failure(proError, "Unable to load account access status");
        const missingProStatus = proResults.some(({ result }) => result.data === null);
        if (missingProStatus)
          return failure(new Error("Missing Pro status"), "Unable to load account access status");
        const users = proResults.map(({ user, result }) => ({
          user_id: user.id,
          email: user.email ?? null,
          created_at: user.created_at,
          pro: result.data,
        }));
        return json({
          stats: statsResult.data?.[0] ?? null,
          account: accountResult.data?.[0] ?? null,
          users,
          pagination: {
            page,
            lastPage: usersResult.data.lastPage,
            total: usersResult.data.total,
          },
        });
      },
      POST: async ({ request }) => {
        const auth = await authenticateAdmin(request);
        if ("response" in auth) return auth.response;

        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }
        const parsed = mutationSchema.safeParse(payload);
        if (!parsed.success) return json({ error: "Invalid request" }, 400);

        const { data: account, error: lookupError } = await auth.supabaseAdmin.rpc(
          "admin_user_summary",
          { _email: parsed.data.email },
        );
        if (lookupError) return failure(lookupError, "Unable to look up this account");
        const target = account?.[0];
        if (!target) return json({ error: "Account not found" }, 404);

        const { error: updateError } = await auth.supabaseAdmin.rpc("admin_set_pro_access", {
          _user_id: target.user_id,
          _actor_id: auth.user.id,
          _enabled: parsed.data.action === "grant",
        });
        if (updateError) return failure(updateError, "Unable to update Pro access");

        const { data: updated, error: updatedError } = await auth.supabaseAdmin.rpc(
          "admin_user_summary",
          { _email: parsed.data.email },
        );
        if (updatedError) return failure(updatedError, "Unable to reload account status");
        return json({ account: updated?.[0] ?? null });
      },
    },
  },
});
