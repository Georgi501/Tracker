import { RATE_LIMITED_PATHS } from "@/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const USER_PRO_ID = "22222222-2222-4222-8222-222222222222";
const USER_FREE_ID = "33333333-3333-4333-8333-333333333333";

const authState = vi.hoisted(() => ({
  mode: "admin" as "unauth" | "nonadmin" | "admin",
  rpcCalls: [] as { fn: string; args: Record<string, unknown> }[],
  atomicError: null as { message: string } | null,
  subMutations: 0,
}));

function makeSupabaseAdminMock() {
  const users = [
    {
      id: ADMIN_ID,
      email: "admin@example.com",
      created_at: "2026-10-01T00:00:00Z",
      last_sign_in_at: "2026-11-18T10:00:00Z",
    },
    {
      id: USER_PRO_ID,
      email: "pro@example.com",
      created_at: "2026-11-01T00:00:00Z",
      last_sign_in_at: "2026-11-17T10:00:00Z",
    },
    {
      id: USER_FREE_ID,
      email: "free@example.com",
      created_at: "2026-11-10T00:00:00Z",
      last_sign_in_at: null,
    },
  ];

  return {
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({
          data: { users, lastPage: 1, total: 2 },
          error: null,
        }),
        getUserById: vi.fn().mockImplementation(async (id: string) => ({
          data: { user: users.find((u) => u.id === id) ?? null },
          error: null,
        })),
      },
    },
    rpc: vi.fn().mockImplementation(async (fn: string, args: Record<string, unknown> = {}) => {
      authState.rpcCalls.push({ fn, args });
      if (fn === "admin_dashboard_stats") {
        return {
          data: [{ total_users: 2, active_subscriptions: 1, pro_accounts: 1 }],
          error: null,
        };
      }
      if (fn === "is_pro_internal") {
        return {
          data: args["_user_id"] === USER_PRO_ID || args["_user_id"] === ADMIN_ID,
          error: null,
        };
      }
      if (fn === "admin_user_summary") {
        const match = users.find((u) => u.email === args["_email"]);
        return {
          data: match ? [{ user_id: match.id, email: match.email }] : [],
          error: null,
        };
      }
      if (fn === "admin_set_pro_access_with_audit") {
        if (authState.atomicError) return { data: null, error: authState.atomicError };
        return { data: args["_enabled"], error: null };
      }
      return { data: null, error: null };
    }),
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            in: async () => ({
              data: [
                { id: USER_PRO_ID, is_public: true },
                { id: USER_FREE_ID, is_public: false },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === "subscriptions") {
        return {
          select: () => ({
            in: () => ({
              order: async () => ({
                data: [
                  {
                    user_id: USER_PRO_ID,
                    status: "active",
                    current_period_end: "2027-01-01T00:00:00Z",
                    updated_at: "2026-11-01T00:00:00Z",
                  },
                ],
                error: null,
              }),
            }),
          }),
          update: () => {
            authState.subMutations += 1;
            return {};
          },
          delete: () => {
            authState.subMutations += 1;
            return {};
          },
        };
      }
      if (table === "pro_access_grants") {
        return {
          select: (_cols: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return {
                is: () => ({
                  gte: () => ({
                    lte: async () => ({ count: 0, error: null }),
                  }),
                  then: (cb: (val: { count: number; error: null }) => void) =>
                    Promise.resolve(cb({ count: 1, error: null })),
                }),
              };
            }
            return {
              in: () => ({
                is: async () => ({
                  data: [
                    {
                      user_id: USER_PRO_ID,
                      granted_by: ADMIN_ID,
                      created_at: "2026-11-05T00:00:00Z",
                      expires_at: null,
                    },
                    {
                      user_id: USER_FREE_ID,
                      granted_by: ADMIN_ID,
                      created_at: "2026-11-01T00:00:00Z",
                      // Expired temporary grant should not count as active
                      expires_at: "2020-01-01T00:00:00Z",
                    },
                  ],
                  error: null,
                }),
              }),
            };
          },
        };
      }
      if (table === "site_admins") {
        return {
          select: () => ({
            in: async () => ({ data: [{ user_id: ADMIN_ID }], error: null }),
            eq: (_col: string, val: string) => ({
              maybeSingle: async () => ({
                data: val === ADMIN_ID ? { user_id: ADMIN_ID } : null,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "admin_audit_logs") {
        return {
          select: () => ({
            order: () => ({
              limit: async () => ({ data: [], error: null }),
            }),
          }),
        };
      }
      return {};
    }),
  };
}

vi.mock("@/integrations/supabase/admin-auth.server", () => ({
  authenticateAdmin: vi.fn(async () => {
    if (authState.mode === "unauth") {
      return { response: Response.json({ error: "Authentication required" }, { status: 401 }) };
    }
    if (authState.mode === "nonadmin") {
      return {
        response: Response.json({ error: "Administrator access required" }, { status: 403 }),
      };
    }
    return {
      supabaseAdmin: makeSupabaseAdminMock(),
      user: { id: ADMIN_ID },
    };
  }),
}));

import { handleAdminGet, handleAdminPost } from "@/routes/api/admin";

describe("admin panel API security and functionality", () => {
  beforeEach(() => {
    authState.mode = "admin";
    authState.rpcCalls = [];
    authState.atomicError = null;
    authState.subMutations = 0;
  });

  it("rate limits POST /api/admin", () => {
    expect(RATE_LIMITED_PATHS).toContain("/api/admin");
  });

  it("returns 401 for unauthenticated requests", async () => {
    authState.mode = "unauth";
    const resGet = await handleAdminGet(new Request("https://capispot.com/api/admin"));
    const resPost = await handleAdminPost(
      new Request("https://capispot.com/api/admin", { method: "POST" }),
    );
    expect(resGet.status).toBe(401);
    expect(resPost.status).toBe(401);
  });

  it("returns 403 for authenticated non-admin users", async () => {
    authState.mode = "nonadmin";
    const resGet = await handleAdminGet(new Request("https://capispot.com/api/admin"));
    const resPost = await handleAdminPost(
      new Request("https://capispot.com/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "grant", email: "free@example.com" }),
      }),
    );
    expect(resGet.status).toBe(403);
    expect(resPost.status).toBe(403);
  });

  it("lists enriched users, supports UUID lookup, plan filter, and ignores expired grants", async () => {
    const res = await handleAdminGet(
      new Request(`https://capispot.com/api/admin?page=1&plan=free&q=${USER_FREE_ID}`),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      users: { user_id: string; has_admin_grant: boolean }[];
      account: { user_id: string; is_public: boolean | null } | null;
    };
    expect(body.users).toHaveLength(1);
    expect(body.users[0]?.user_id).toBe(USER_FREE_ID);
    expect(body.users[0]?.has_admin_grant).toBe(false);
    expect(body.account?.user_id).toBe(USER_FREE_ID);
    expect(body.account?.is_public).toBe(false);
  });

  it("grants temporary Pro with future expiration via single atomic RPC", async () => {
    const future = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const res = await handleAdminPost(
      new Request("https://capispot.com/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "grant", userId: USER_FREE_ID, expiresAt: future }),
      }),
    );
    expect(res.status).toBe(200);
    const atomicCall = authState.rpcCalls.find((c) => c.fn === "admin_set_pro_access_with_audit");
    expect(atomicCall?.args).toEqual({
      _user_id: USER_FREE_ID,
      _actor_id: ADMIN_ID,
      _enabled: true,
      _expires_at: future,
    });
  });

  it("revokes manual Pro without touching paid subscriptions and blocks owner revocation", async () => {
    const revokePro = await handleAdminPost(
      new Request("https://capispot.com/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", userId: USER_PRO_ID }),
      }),
    );
    expect(revokePro.status).toBe(200);
    expect(authState.subMutations).toBe(0);
    const atomicCall = authState.rpcCalls.find((c) => c.fn === "admin_set_pro_access_with_audit");
    expect(atomicCall?.args).toEqual({
      _user_id: USER_PRO_ID,
      _actor_id: ADMIN_ID,
      _enabled: false,
      _expires_at: null,
    });

    const revokeOwner = await handleAdminPost(
      new Request("https://capispot.com/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", userId: ADMIN_ID }),
      }),
    );
    expect(revokeOwner.status).toBe(403);
  });

  it("rejects invalid inputs and past expiration dates with 400", async () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const resPast = await handleAdminPost(
      new Request("https://capispot.com/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "grant", userId: USER_FREE_ID, expiresAt: past }),
      }),
    );
    const resBadPlan = await handleAdminGet(
      new Request("https://capispot.com/api/admin?plan=invalid"),
    );
    const resBadAction = await handleAdminPost(
      new Request("https://capispot.com/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_all", userId: USER_FREE_ID }),
      }),
    );
    expect(resPast.status).toBe(400);
    expect(resBadPlan.status).toBe(400);
    expect(resBadAction.status).toBe(400);
  });

  it("fails closed with 500 when atomic grant/audit RPC fails and rejects spoofed actorId", async () => {
    const resSpoof = await handleAdminPost(
      new Request("https://capispot.com/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grant",
          userId: USER_FREE_ID,
          actorId: USER_FREE_ID,
        }),
      }),
    );
    expect(resSpoof.status).toBe(400);

    authState.atomicError = { message: "audit log insert failed" };
    const resFail = await handleAdminPost(
      new Request("https://capispot.com/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "grant", userId: USER_FREE_ID }),
      }),
    );
    expect(resFail.status).toBe(500);
  });

  it("supports partial email search for admins, rejects >120 char queries, and still blocks non-admins", async () => {
    const resPartial = await handleAdminGet(
      new Request("https://capispot.com/api/admin?q=free"),
    );
    expect(resPartial.status).toBe(200);
    const body = (await resPartial.json()) as {
      users: { email: string | null }[];
      account: { email: string | null } | null;
    };
    expect(body.users.map((u) => u.email)).toEqual(["free@example.com"]);
    expect(body.account?.email).toBe("free@example.com");

    const resTooLong = await handleAdminGet(
      new Request(`https://capispot.com/api/admin?q=${"a".repeat(121)}`),
    );
    expect(resTooLong.status).toBe(400);

    authState.mode = "nonadmin";
    const resNonAdmin = await handleAdminGet(
      new Request("https://capispot.com/api/admin?q=free"),
    );
    expect(resNonAdmin.status).toBe(403);
  });
});
