import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";

const owner = "11111111-1111-4111-8111-111111111111";
const asset = "33333333-3333-4333-8333-333333333333";
let db: PGlite;
const migration = (name: string) => readFile(`drizzle/migrations/${name}`, "utf8");
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated;
  `);
  for (const name of [
    "0000_portfolio_schema.sql",
    "0015_transaction_fees_and_bonds.sql",
    "0016_direct_broker_connections.sql",
    "0017_reviewable_splits_and_asset_valuations.sql",
    "0026_remove_broker_limit.sql",
    "0029_broker_transfers.sql",
    "0032_csv_transaction_execution_time.sql",
    "0033_atomic_position_deletion.sql",
  ])
    await db.exec(await migration(name));
  await db.exec(
    await readFile("supabase/migrations/20261113122247_portfolio_snapshot.sql", "utf8"),
  );
  await db.exec(`INSERT INTO auth.users(id,email) VALUES ('${owner}', 'owner@example.test');`);
}, 30000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.exec(`SET ROLE postgres; DROP TRIGGER IF EXISTS fail_asset_delete ON public.assets; DROP TRIGGER IF EXISTS fail_child_delete ON public.asset_valuations; TRUNCATE public.assets CASCADE; TRUNCATE public.position_deletions;
    SELECT set_config('request.jwt.claim.sub', '${owner}', false);
    INSERT INTO public.brokers(id,user_id,name) VALUES ('77777777-7777-4777-8777-777777777777','11111111-1111-4111-8111-111111111111','Primary') ON CONFLICT DO NOTHING;
    INSERT INTO public.assets(id,user_id,symbol,name,type,manual_price) VALUES ('${asset}','${owner}','TEST','Test position','bond',80);
    INSERT INTO public.transactions(id,user_id,asset_id,kind,quantity,price,fee,date,source_transaction_id,source_executed_at,broker_id) VALUES ('44444444-4444-4444-8444-444444444444','${owner}','${asset}','buy',10,100,2,'2025-01-01','source-1','2025-01-01 12:30:00','77777777-7777-4777-8777-777777777777');
    INSERT INTO public.corporate_actions(id,user_id,asset_id,event_date,numerator,denominator) VALUES ('55555555-5555-4555-8555-555555555555','${owner}','${asset}','2025-02-01',2,1);
    INSERT INTO public.asset_valuations(id,user_id,asset_id,valuation_date,price_usd,note) VALUES ('66666666-6666-4666-8666-666666666666','${owner}','${asset}','2025-03-01',80,'Confirmed appraisal');`);
});

type Snapshot = {
  transactions: { id: string; quantity: number }[];
  assets: { id: string }[];
  corporate_actions: { id: string }[];
  asset_valuations: { id: string }[];
};
async function readSnapshot() {
  return (await db.query<{ snapshot: Snapshot }>("SELECT public.portfolio_snapshot() AS snapshot"))
    .rows[0]!.snapshot;
}
it("returns complete ordered financial inputs with original IDs and owner RLS", async () => {
  await db.exec("SET ROLE authenticated");
  const snapshot = await readSnapshot();
  expect(snapshot.assets.map((r) => r.id)).toEqual([asset]);
  expect(snapshot.transactions.map((r) => r.id)).toEqual(["44444444-4444-4444-8444-444444444444"]);
  expect(snapshot.corporate_actions.map((r) => r.id)).toEqual([
    "55555555-5555-4555-8555-555555555555",
  ]);
  expect(snapshot.asset_valuations.map((r) => r.id)).toEqual([
    "66666666-6666-4666-8666-666666666666",
  ]);
  await db.exec(
    "SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false)",
  );
  for (const rows of Object.values(await readSnapshot())) expect(rows).toEqual([]);
});
it("rejects anonymous execution and exposes no owner argument", async () => {
  await db.exec("SET ROLE anon");
  await expect(readSnapshot()).rejects.toThrow(/permission denied/);
  await db.exec("SET ROLE postgres");
  const fn = (
    await db.query<{ provolatile: string; prosecdef: boolean; pronargs: number }>(
      "SELECT provolatile,prosecdef,pronargs FROM pg_proc WHERE oid='public.portfolio_snapshot()'::regprocedure",
    )
  ).rows[0]!;
  expect(fn).toMatchObject({ provolatile: "s", prosecdef: false, pronargs: 0 });
});
it("replaces the mixed 1119 history with complete 1115 and 1121 snapshots", async () => {
  await db.exec(`TRUNCATE public.transactions;
 INSERT INTO public.transactions(id,user_id,asset_id,kind,quantity,price,date,created_at)
 SELECT ('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'${owner}','${asset}','buy',
 CASE i WHEN 1 THEN 7 WHEN 501 THEN 9 ELSE 1 END,1,'2025-01-01','2025-01-01T12:00:00Z' FROM generate_series(1,1101) i;
 SET ROLE authenticated;`);
  const before = await readSnapshot();
  await db.exec(`BEGIN;
 DELETE FROM public.transactions WHERE id='00000000-0000-4000-8000-000000000001';
 INSERT INTO public.transactions(id,user_id,asset_id,kind,quantity,price,date,created_at) VALUES ('ffffffff-ffff-4fff-8fff-ffffffffffff','${owner}','${asset}','buy',13,1,'2025-01-01','2025-01-01T12:00:00Z');COMMIT;`);
  const after = await readSnapshot();
  expect(before.transactions.reduce((s, t) => s + Number(t.quantity), 0)).toBe(1115);
  expect(after.transactions.reduce((s, t) => s + Number(t.quantity), 0)).toBe(1121);
  expect(before.transactions).toHaveLength(1101);
  expect(after.transactions).toHaveLength(1101);
  expect(new Set(after.transactions.map((t) => t.id)).size).toBe(1101);
  expect(after.transactions.some((t) => t.id === "00000000-0000-4000-8000-000000000501")).toBe(
    true,
  );
  expect(after.transactions.some((t) => t.id === "00000000-0000-4000-8000-000000000001")).toBe(
    false,
  );
});
