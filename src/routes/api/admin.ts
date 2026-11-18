import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const emailSchema = z.string().trim().email().max(254);
const uuidSchema = z.string().trim().uuid();
const searchQuerySchema = z.string().trim().min(1).max(120);
const pageSchema = z.coerce.number().int().min(1).max(100_000).default(1);
const planFilterSchema = z.enum(["all", "free", "pro", "granted"]).default("all");
const ADMIN_PAGE_SIZE = 25;

const mutationSchema = z
  .object({
    action: z.enum(["grant", "revoke"]),
    email: emailSchema.optional(),
    userId: uuidSchema.optional(),
    expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .strict()
  .refine((data) => Boolean(data.email || data.userId), {
    message: "Provide email or userId",
  });

export type AdminUserSummary = {
  user_id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  pro: boolean;
  is_public: boolean | null;
  subscription_status: string | null;
  current_period_end: string | null;
  has_admin_grant: boolean;
  grant_source: "subscription" | "manual_grant" | "none";
  grant_expires_at: string | null;
  granted_by: string | null;
  granted_at: string | null;
  is_site_admin: boolean;
};

export type AdminAuditEntry = {
  id: string;
  actor_id: string | null;
  target_user_id: string | null;
  action: "grant" | "revoke";
  expires_at: string | null;
  created_at: string;
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

async function authenticateAdmin(request: Request) {
  const { authenticateAdmin: verify } = await import("@/integrations/supabase/admin-auth.server");
  return verify(request);
}

function failure(error: unknown, fallback: string) {
  console.error(fallback, error);
  return json({ error: fallback }, 500);
}

function hasActivePaidSubscription(status: string | null, periodEnd: string | null): boolean {
  if (!status) return false;
  const notExpired = !periodEnd || Date.parse(periodEnd) > Date.now();
  if (status === "active" || status === "trialing" || status === "past_due") return notExpired;
  if (status === "canceled") return Boolean(periodEnd && Date.parse(periodEnd) > Date.now());
  return false;
}

function isMissingColumnOrTable(error: unknown): boolean {
  const msg =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error ?? "");
  return (
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("42703") ||
    msg.includes("42P01")
  );
}

type AdminDb = NonNullable<
  Exclude<Awaited<ReturnType<typeof authenticateAdmin>>, { response: Response }>
>["supabaseAdmin"];

async function enrichUsers(
  db: AdminDb,
  rawUsers: {
    id: string;
    email?: string | null;
    created_at: string;
    last_sign_in_at?: string | null;
  }[],
): Promise<{ users: AdminUserSummary[]; error?: unknown }> {
  if (!rawUsers.length) return { users: [] };
  const ids = rawUsers.map((u) => u.id);

  const [proResults, profilesRes, subsRes, adminsRes] = await Promise.all([
    Promise.all(
      rawUsers.map(async (user) => ({
        user,
        result: await db.rpc("is_pro_internal", { _user_id: user.id }),
      })),
    ),
    db.from("profiles").select("id, is_public").in("id", ids),
    db
      .from("subscriptions")
      .select("user_id, status, current_period_end, updated_at")
      .in("user_id", ids)
      .order("updated_at", { ascending: false }),
    db.from("site_admins").select("user_id").in("user_id", ids),
  ]);

  const proError = proResults.find(({ result }) => result.error)?.result.error;
  if (proError) return { users: [], error: proError };
  if (proResults.some(({ result }) => result.data === null)) {
    return { users: [], error: new Error("Missing Pro status") };
  }

  // Try selecting expires_at; fall back gracefully if migration 0036 is not yet applied.
  let grantsData: {
    user_id: string;
    granted_by: string;
    created_at: string;
    expires_at?: string | null;
  }[] = [];
  const grantsWithExpiry = await (
    db.from("pro_access_grants") as unknown as {
      select: (cols: string) => {
        in: (
          col: string,
          vals: string[],
        ) => {
          is: (
            col: string,
            val: null,
          ) => PromiseLike<{ data: typeof grantsData | null; error: unknown }>;
        };
      };
    }
  )
    .select("user_id, granted_by, created_at, expires_at")
    .in("user_id", ids)
    .is("revoked_at", null);

  if (grantsWithExpiry.error && isMissingColumnOrTable(grantsWithExpiry.error)) {
    const legacyGrants = await db
      .from("pro_access_grants")
      .select("user_id, granted_by, created_at")
      .in("user_id", ids)
      .is("revoked_at", null);
    grantsData = legacyGrants.data ?? [];
  } else {
    grantsData = grantsWithExpiry.data ?? [];
  }

  const profileMap = new Map<string, boolean>();
  for (const row of profilesRes.data ?? []) {
    profileMap.set(row.id, Boolean(row.is_public));
  }

  const subMap = new Map<string, { status: string; current_period_end: string | null }>();
  for (const row of subsRes.data ?? []) {
    if (!subMap.has(row.user_id)) {
      subMap.set(row.user_id, { status: row.status, current_period_end: row.current_period_end });
    }
  }

  const grantMap = new Map<
    string,
    { granted_by: string; created_at: string; expires_at: string | null }
  >();
  for (const row of grantsData) {
    const exp = row.expires_at ?? null;
    if (exp && Date.parse(exp) <= Date.now()) continue;
    grantMap.set(row.user_id, {
      granted_by: row.granted_by,
      created_at: row.created_at,
      expires_at: exp,
    });
  }

  const adminSet = new Set((adminsRes.data ?? []).map((r) => r.user_id));

  const users: AdminUserSummary[] = proResults.map(({ user, result }) => {
    const sub = subMap.get(user.id) ?? null;
    const grant = grantMap.get(user.id) ?? null;
    const paidActive = hasActivePaidSubscription(
      sub?.status ?? null,
      sub?.current_period_end ?? null,
    );
    const hasAdminGrant = Boolean(grant);
    const grantSource: AdminUserSummary["grant_source"] = paidActive
      ? "subscription"
      : hasAdminGrant
        ? "manual_grant"
        : "none";

    return {
      user_id: user.id,
      email: user.email ?? null,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at ?? null,
      pro: Boolean(result.data),
      is_public: profileMap.has(user.id) ? (profileMap.get(user.id) ?? null) : null,
      subscription_status: sub?.status ?? null,
      current_period_end: sub?.current_period_end ?? null,
      has_admin_grant: hasAdminGrant,
      grant_source: grantSource,
      grant_expires_at: grant?.expires_at ?? null,
      granted_by: grant?.granted_by ?? null,
      granted_at: grant?.created_at ?? null,
      is_site_admin: adminSet.has(user.id),
    };
  });

  return { users };
}

export async function handleAdminGet(request: Request): Promise<Response> {
  const auth = await authenticateAdmin(request);
  if ("response" in auth) return auth.response;

  const searchParams = new URL(request.url).searchParams;
  const rawQuery = (searchParams.get("q") ?? searchParams.get("email") ?? "").trim();
  const selectedUserId = searchParams.get("userId")?.trim() || null;

  if (selectedUserId && !uuidSchema.safeParse(selectedUserId).success) {
    return json({ error: "Invalid userId" }, 400);
  }
  if (rawQuery && !searchQuerySchema.safeParse(rawQuery).success) {
    return json({ error: "Search query must be between 1 and 120 characters" }, 400);
  }

  const pageResult = pageSchema.safeParse(searchParams.get("page") ?? 1);
  if (!pageResult.success) return json({ error: "Invalid account page" }, 400);
  const page = pageResult.data;

  const planResult = planFilterSchema.safeParse(searchParams.get("plan") ?? "all");
  if (!planResult.success) return json({ error: "Invalid plan filter" }, 400);
  const plan = planResult.data;

  const [statsResult, usersResult, manualGrantsCountRes] = await Promise.all([
    auth.supabaseAdmin.rpc("admin_dashboard_stats"),
    auth.supabaseAdmin.auth.admin.listUsers({ page, perPage: ADMIN_PAGE_SIZE }),
    auth.supabaseAdmin
      .from("pro_access_grants")
      .select("id", { count: "exact", head: true })
      .is("revoked_at", null),
  ]);

  if (statsResult.error) return failure(statsResult.error, "Unable to load admin summary");
  if (usersResult.error) return failure(usersResult.error, "Unable to load registered accounts");

  const enriched = await enrichUsers(auth.supabaseAdmin, usersResult.data.users);
  if (enriched.error) return failure(enriched.error, "Unable to load account access status");

  const needle = rawQuery.toLowerCase();
  const filteredUsers = enriched.users.filter((u) => {
    const planOk =
      plan === "free"
        ? !u.pro
        : plan === "pro"
          ? u.pro
          : plan === "granted"
            ? u.has_admin_grant
            : true;
    if (!planOk) return false;
    if (!needle) return true;
    return (
      Boolean(u.email?.toLowerCase().includes(needle)) || u.user_id.toLowerCase().includes(needle)
    );
  });

  // Look up searched or selected account
  let account: AdminUserSummary | null = null;
  const isUuidQuery = Boolean(rawQuery && uuidSchema.safeParse(rawQuery).success);
  const isEmailQuery = Boolean(rawQuery && emailSchema.safeParse(rawQuery).success);
  const lookupId = selectedUserId ?? (isUuidQuery ? rawQuery : null);
  if (lookupId) {
    const byId = await auth.supabaseAdmin.auth.admin.getUserById(lookupId);
    if (!byId.error && byId.data.user) {
      const one = await enrichUsers(auth.supabaseAdmin, [byId.data.user]);
      account = one.users[0] ?? null;
    }
  } else if (isEmailQuery) {
    const summaryRes = await auth.supabaseAdmin.rpc("admin_user_summary", { _email: rawQuery });
    if (summaryRes.error) return failure(summaryRes.error, "Unable to look up this account");
    const found = summaryRes.data?.[0];
    if (found) {
      const byId = await auth.supabaseAdmin.auth.admin.getUserById(found.user_id);
      if (!byId.error && byId.data.user) {
        const one = await enrichUsers(auth.supabaseAdmin, [byId.data.user]);
        account = one.users[0] ?? null;
      }
    }
  } else if (rawQuery && filteredUsers.length === 1) {
    account = filteredUsers[0] ?? null;
  }

  // Optional audit trail & expiring temporary grants (graceful if migration 0036 not yet applied)
  let recentAuditLogs: AdminAuditEntry[] = [];
  let expiringGrantsCount = 0;
  try {
    const auditRes = await (
      auth.supabaseAdmin as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            order: (
              col: string,
              opts: { ascending: boolean },
            ) => {
              limit: (n: number) => PromiseLike<{ data: AdminAuditEntry[] | null; error: unknown }>;
            };
          };
        };
      }
    )
      .from("admin_audit_logs")
      .select("id, actor_id, target_user_id, action, expires_at, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    if (!auditRes.error && auditRes.data) recentAuditLogs = auditRes.data;

    const nowIso = new Date().toISOString();
    const soonIso = new Date(Date.now() + 14 * 86_400_000).toISOString();
    const expRes = await (
      auth.supabaseAdmin.from("pro_access_grants") as unknown as {
        select: (
          c: string,
          o: { count: "exact"; head: true },
        ) => {
          is: (
            c: string,
            v: null,
          ) => {
            gte: (
              c: string,
              v: string,
            ) => {
              lte: (c: string, v: string) => PromiseLike<{ count: number | null; error: unknown }>;
            };
          };
        };
      }
    )
      .select("id", { count: "exact", head: true })
      .is("revoked_at", null)
      .gte("expires_at", nowIso)
      .lte("expires_at", soonIso);
    if (!expRes.error) expiringGrantsCount = expRes.count ?? 0;
  } catch {
    // Graceful when migration 0036 is not yet applied
  }

  const baseStats = statsResult.data?.[0] ?? null;
  const stats = baseStats
    ? {
        ...baseStats,
        free_accounts: Math.max(0, Number(baseStats.total_users) - Number(baseStats.pro_accounts)),
        manual_grants: manualGrantsCountRes.error ? 0 : (manualGrantsCountRes.count ?? 0),
        expiring_grants: expiringGrantsCount,
      }
    : null;

  return json({
    stats,
    account,
    users: filteredUsers,
    recentAuditLogs,
    pagination: {
      page,
      lastPage: usersResult.data.lastPage,
      total: usersResult.data.total,
    },
  });
}

export async function handleAdminPost(request: Request): Promise<Response> {
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

  const expiresAt = parsed.data.expiresAt ?? null;
  if (parsed.data.action === "grant" && expiresAt && Date.parse(expiresAt) <= Date.now()) {
    return json({ error: "Expiration date must be in the future" }, 400);
  }

  let targetUser: {
    id: string;
    email?: string | null;
    created_at: string;
    last_sign_in_at?: string | null;
  } | null = null;
  if (parsed.data.userId) {
    const byId = await auth.supabaseAdmin.auth.admin.getUserById(parsed.data.userId);
    if (!byId.error && byId.data.user) targetUser = byId.data.user;
  } else if (parsed.data.email) {
    const lookupRes = await auth.supabaseAdmin.rpc("admin_user_summary", {
      _email: parsed.data.email,
    });
    if (lookupRes.error) return failure(lookupRes.error, "Unable to look up this account");
    const found = lookupRes.data?.[0];
    if (found) {
      const byId = await auth.supabaseAdmin.auth.admin.getUserById(found.user_id);
      if (!byId.error && byId.data.user) targetUser = byId.data.user;
    }
  }

  if (!targetUser) return json({ error: "Account not found" }, 404);

  if (parsed.data.action === "revoke") {
    const adminCheck = await auth.supabaseAdmin
      .from("site_admins")
      .select("user_id")
      .eq("user_id", targetUser.id)
      .maybeSingle();
    if (!adminCheck.error && adminCheck.data) {
      return json({ error: "Owner Pro access cannot be revoked" }, 403);
    }
  }

  const { error: atomicError } = await (
    auth.supabaseAdmin as unknown as {
      rpc: (
        fn: string,
        args: {
          _user_id: string;
          _actor_id: string;
          _enabled: boolean;
          _expires_at: string | null;
        },
      ) => PromiseLike<{ error: unknown }>;
    }
  ).rpc("admin_set_pro_access_with_audit", {
    _user_id: targetUser.id,
    _actor_id: auth.user.id,
    _enabled: parsed.data.action === "grant",
    _expires_at: parsed.data.action === "grant" ? expiresAt : null,
  });

  if (atomicError) {
    return failure(atomicError, "Unable to update Pro access");
  }

  const enriched = await enrichUsers(auth.supabaseAdmin, [targetUser]);
  if (enriched.error) return failure(enriched.error, "Unable to reload account status");
  return json({ account: enriched.users[0] ?? null });
}

export const Route = createFileRoute("/api/admin")({
  server: {
    handlers: {
      GET: ({ request }) => handleAdminGet(request),
      POST: ({ request }) => handleAdminPost(request),
    },
  },
});
