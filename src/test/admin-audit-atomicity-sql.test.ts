import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";

async function setupDb() {
  const db = new PGlite();
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;

    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    INSERT INTO auth.users (id) VALUES ('${ADMIN_ID}'), ('${USER_ID}');

    CREATE TABLE public.site_admins (user_id uuid PRIMARY KEY);
    INSERT INTO public.site_admins (user_id) VALUES ('${ADMIN_ID}');

    CREATE TABLE public.subscriptions (
      user_id uuid NOT NULL,
      status text NOT NULL,
      current_period_end timestamptz
    );
    CREATE TABLE public.pro_entitlement_grants (
      user_id uuid NOT NULL,
      starts_at timestamptz NOT NULL,
      ends_at timestamptz NOT NULL
    );
    CREATE TABLE public.pro_access_grants (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      granted_by uuid NOT NULL REFERENCES auth.users(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      revoked_at timestamptz,
      revoked_by uuid REFERENCES auth.users(id)
    );
    CREATE UNIQUE INDEX pro_access_grants_one_active_per_user
      ON public.pro_access_grants (user_id)
      WHERE revoked_at IS NULL;
  `);

  const migrationSql = readFileSync(
    resolve(process.cwd(), "drizzle/migrations/0036_admin_pro_grants_and_audit.sql"),
    "utf8",
  );
  await db.exec(migrationSql);
  return db;
}

describe("0036 admin_set_pro_access_with_audit PostgreSQL atomicity", () => {
  it("rolls back pro_access_grants if admin_audit_logs insert fails", async () => {
    const db = await setupDb();

    // Force audit log inserts to fail
    await db.exec(`
      CREATE OR REPLACE FUNCTION public.fail_audit_insert()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'simulated audit log failure';
      END $$;
      CREATE TRIGGER trg_fail_audit
        BEFORE INSERT ON public.admin_audit_logs
        FOR EACH ROW EXECUTE FUNCTION public.fail_audit_insert();
    `);

    await expect(
      db.exec(`
        SELECT public.admin_set_pro_access_with_audit(
          '${USER_ID}',
          '${ADMIN_ID}',
          true,
          now() + interval '7 days'
        );
      `),
    ).rejects.toThrow(/simulated audit log failure/);

    const grants = await db.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM public.pro_access_grants WHERE user_id = '${USER_ID}';`,
    );
    const audits = await db.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM public.admin_audit_logs WHERE target_user_id = '${USER_ID}';`,
    );
    expect(Number(grants.rows[0]?.count)).toBe(0);
    expect(Number(audits.rows[0]?.count)).toBe(0);
  });

  it("commits temporary 7-day grant + audit log atomically, respects expiry, and revokes cleanly", async () => {
    const db = await setupDb();

    await db.exec(`
      SELECT public.admin_set_pro_access_with_audit(
        '${USER_ID}',
        '${ADMIN_ID}',
        true,
        now() + interval '7 days'
      );
    `);
    const activeCheck = await db.query<{ pro: boolean }>(
      `SELECT public.is_pro_internal('${USER_ID}') AS pro;`,
    );
    expect(activeCheck.rows[0]?.pro).toBe(true);

    // Simulate expired temporary grant
    await db.exec(`
      UPDATE public.pro_access_grants
      SET created_at = now() - interval '10 days',
          expires_at = now() - interval '1 day'
      WHERE user_id = '${USER_ID}' AND revoked_at IS NULL;
    `);
    const expiredCheck = await db.query<{ pro: boolean }>(
      `SELECT public.is_pro_internal('${USER_ID}') AS pro;`,
    );
    expect(expiredCheck.rows[0]?.pro).toBe(false);

    // Converting expired grant to permanent clears expires_at and restores Pro
    await db.exec(`
      SELECT public.admin_set_pro_access_with_audit('${USER_ID}', '${ADMIN_ID}', true, NULL);
    `);
    const permCheck = await db.query<{ pro: boolean }>(
      `SELECT public.is_pro_internal('${USER_ID}') AS pro;`,
    );
    expect(permCheck.rows[0]?.pro).toBe(true);

    // Revoke writes audit entry and removes Pro
    await db.exec(`
      SELECT public.admin_set_pro_access_with_audit('${USER_ID}', '${ADMIN_ID}', false, NULL);
    `);
    const revokedCheck = await db.query<{ pro: boolean }>(
      `SELECT public.is_pro_internal('${USER_ID}') AS pro;`,
    );
    const auditRows = await db.query<{ action: string }>(
      `SELECT action FROM public.admin_audit_logs WHERE target_user_id = '${USER_ID}' ORDER BY created_at;`,
    );
    expect(revokedCheck.rows[0]?.pro).toBe(false);
    expect(auditRows.rows.map((r) => r.action)).toEqual(["grant", "grant", "revoke"]);
  });

  it("retains audit logs with NULL target_user_id when target user is deleted, and blocks anon/authenticated RPC execution", async () => {
    const db = await setupDb();

    // Ordinary authenticated or anon roles cannot execute the privileged RPC directly
    await db.exec("BEGIN; SET LOCAL ROLE authenticated;");
    await expect(
      db.exec(
        `SELECT public.admin_set_pro_access_with_audit('${USER_ID}', '${ADMIN_ID}', true, NULL);`,
      ),
    ).rejects.toThrow(/permission denied/i);
    await db.exec("ROLLBACK;");

    await db.exec("BEGIN; SET LOCAL ROLE anon;");
    await expect(
      db.exec(
        `SELECT public.admin_set_pro_access_with_audit('${USER_ID}', '${ADMIN_ID}', true, NULL);`,
      ),
    ).rejects.toThrow(/permission denied/i);
    await db.exec("ROLLBACK;");

    // Grant as admin, then delete target user -> pro_access_grants cascades, audit row is retained with target_user_id = NULL
    await db.exec(`
      SELECT public.admin_set_pro_access_with_audit('${USER_ID}', '${ADMIN_ID}', true, NULL);
      DELETE FROM auth.users WHERE id = '${USER_ID}';
    `);

    const retained = await db.query<{
      actor_id: string | null;
      target_user_id: string | null;
      action: string;
    }>(`SELECT actor_id, target_user_id, action FROM public.admin_audit_logs;`);

    expect(retained.rows).toHaveLength(1);
    expect(retained.rows[0]).toEqual({
      actor_id: ADMIN_ID,
      target_user_id: null,
      action: "grant",
    });
  });
});
