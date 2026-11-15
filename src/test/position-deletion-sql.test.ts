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
async function snapshot() {
  const result: Record<string, unknown> = {};
  for (const table of ["assets", "transactions", "corporate_actions", "asset_valuations"])
    result[table] = (
      await db.query(`SELECT to_jsonb(r) AS row FROM public.${table} r ORDER BY id`)
    ).rows;
  return result;
}
const operation = "88888888-8888-4888-8888-888888888888";
async function remove() {
  return (
    await db.query<{ receipt: unknown }>("SELECT public.delete_position($1,$2) AS receipt", [
      asset,
      operation,
    ])
  ).rows[0]!.receipt;
}
async function restore() {
  return (
    await db.query<{ receipt: unknown }>("SELECT public.restore_position($1) AS receipt", [
      operation,
    ])
  ).rows[0]!.receipt;
}
it("Undo restores the complete position including confirmed splits and dated valuations", async () => {
  const before = await snapshot();
  expect(await remove()).toMatchObject({
    operationId: operation,
    assetId: asset,
    state: "deleted",
  });
  expect(await snapshot()).toEqual({
    assets: [],
    transactions: [],
    corporate_actions: [],
    asset_valuations: [],
  });
  await restore();
  expect(await snapshot()).toEqual(before);
  expect((await db.query("SELECT snapshot FROM public.position_deletions")).rows).toEqual([
    { snapshot: null },
  ]);
});
it("a failure after snapshot creation rolls back the entire deletion", async () => {
  const before = await snapshot();
  await db.exec(`CREATE OR REPLACE FUNCTION public.reject_asset_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'INJECTED_DELETE_FAILURE'; END $$;
    CREATE TRIGGER fail_asset_delete BEFORE DELETE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.reject_asset_delete();`);
  await expect(remove()).rejects.toThrow("INJECTED_DELETE_FAILURE");
  expect(await snapshot()).toEqual(before);
  expect((await db.query("SELECT * FROM public.position_deletions")).rows).toEqual([]);
  await db.exec("DROP TRIGGER fail_asset_delete ON public.assets");
  await remove();
  await restore();
  expect(await snapshot()).toEqual(before);
});
it("repeated delete and Undo requests never duplicate records or delete a restored position", async () => {
  const before = await snapshot();
  await remove();
  await remove();
  await restore();
  await restore();
  expect(await remove()).toMatchObject({
    operationId: operation,
    assetId: asset,
    state: "restored",
  });
  expect(await snapshot()).toEqual(before);
});
it("a restore failure after inserting the parent and transactions rolls everything back and can be retried", async () => {
  const before = await snapshot();
  await remove();
  await db.exec(`CREATE OR REPLACE FUNCTION public.reject_valuation_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'INJECTED_RESTORE_FAILURE'; END $$;
    CREATE TRIGGER fail_valuation_insert BEFORE INSERT ON public.asset_valuations FOR EACH ROW EXECUTE FUNCTION public.reject_valuation_insert();`);
  await expect(restore()).rejects.toThrow("INJECTED_RESTORE_FAILURE");
  expect(await snapshot()).toEqual({
    assets: [],
    transactions: [],
    corporate_actions: [],
    asset_valuations: [],
  });
  expect(
    (await db.query("SELECT restored_at IS NULL AS pending FROM public.position_deletions")).rows,
  ).toEqual([{ pending: true }]);
  await db.exec("DROP TRIGGER fail_valuation_insert ON public.asset_valuations");
  await restore();
  expect(await snapshot()).toEqual(before);
});
it("only the authenticated owner can delete or restore; snapshots cannot be read or forged", async () => {
  const before = await snapshot();
  const other = "22222222-2222-4222-8222-222222222222";
  await db.exec(
    `SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${other}',false);`,
  );
  await expect(remove()).rejects.toThrow("POSITION_NOT_FOUND");
  await db.exec(`SELECT set_config('request.jwt.claim.sub','${owner}',false)`);
  await remove();
  await expect(db.query("SELECT * FROM public.position_deletions")).rejects.toThrow(
    "permission denied",
  );
  await expect(db.query("UPDATE public.position_deletions SET snapshot='{}'")).rejects.toThrow(
    "permission denied",
  );
  await db.exec(`SELECT set_config('request.jwt.claim.sub','${other}',false)`);
  await expect(restore()).rejects.toThrow("POSITION_OPERATION_UNAVAILABLE");
  await expect(remove()).rejects.toThrow("POSITION_OPERATION_UNAVAILABLE");
  await db.exec(`SELECT set_config('request.jwt.claim.sub','${owner}',false)`);
  await restore();
  expect(await snapshot()).toEqual(before);
  await db.exec("SET ROLE anon");
  await expect(remove()).rejects.toThrow("permission denied");
});
it("blocks positions with broker transfers without deleting any related data", async () => {
  const before = await snapshot();
  await db.exec(`INSERT INTO public.brokers(id,user_id,name) VALUES ('77777777-7777-4777-8777-777777777777','${owner}','One'),('99999999-9999-4999-8999-999999999999','${owner}','Two') ON CONFLICT DO NOTHING;
    INSERT INTO public.broker_transfers(user_id,asset_id,from_broker_id,to_broker_id,quantity) VALUES ('${owner}','${asset}','77777777-7777-4777-8777-777777777777','99999999-9999-4999-8999-999999999999',1);`);
  await expect(remove()).rejects.toThrow("POSITION_HAS_TRANSFERS");
  expect(await snapshot()).toEqual(before);
  expect((await db.query("SELECT * FROM public.broker_transfers")).rows).toHaveLength(1);
});
it("does not overwrite a replacement position on Undo and remains retryable", async () => {
  const before = await snapshot();
  await remove();
  await db.exec(
    `INSERT INTO public.assets(user_id,symbol,name) VALUES ('${owner}','TEST','Replacement');`,
  );
  await expect(restore()).rejects.toThrow("duplicate key");
  expect((await db.query("SELECT name FROM public.assets")).rows).toEqual([
    { name: "Replacement" },
  ]);
  await db.exec("DELETE FROM public.assets WHERE name='Replacement'");
  await restore();
  expect(await snapshot()).toEqual(before);
});
it("rolls back children already deleted by the cascade when a later child deletion fails", async () => {
  const before = await snapshot();
  await db.exec(`CREATE OR REPLACE FUNCTION public.reject_child_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
    IF EXISTS (SELECT 1 FROM public.transactions WHERE asset_id=OLD.asset_id) THEN RAISE EXCEPTION 'CASCADE_NOT_STARTED'; END IF;
    RAISE EXCEPTION 'INJECTED_CHILD_DELETE_FAILURE'; END $$;
    CREATE TRIGGER fail_child_delete BEFORE DELETE ON public.asset_valuations FOR EACH ROW EXECUTE FUNCTION public.reject_child_delete();`);
  await expect(remove()).rejects.toThrow("INJECTED_CHILD_DELETE_FAILURE");
  expect(await snapshot()).toEqual(before);
  expect((await db.query("SELECT * FROM public.position_deletions")).rows).toEqual([]);
});
it("refuses to cascade-delete malformed references owned by another user", async () => {
  await db.exec(`UPDATE public.transactions SET user_id='22222222-2222-4222-8222-222222222222'`);
  const before = await snapshot();
  await expect(remove()).rejects.toThrow("POSITION_INVALID_RELATED_OWNER");
  expect(await snapshot()).toEqual(before);
});

it("restores every transaction above the usual API row limit", async () => {
  await db.exec(
    `INSERT INTO public.transactions(user_id,asset_id,kind,quantity,price,date) SELECT '${owner}','${asset}','buy',1,100,'2025-01-01' FROM generate_series(1,1100);`,
  );
  const before = await snapshot();
  await remove();
  await restore();
  expect(await snapshot()).toEqual(before);
});
it("a missing broker aborts Undo without a partial parent and preserves the recovery snapshot", async () => {
  await remove();
  await db.exec("DELETE FROM public.brokers WHERE id='77777777-7777-4777-8777-777777777777'");
  await expect(restore()).rejects.toThrow("POSITION_BROKER_UNAVAILABLE");
  expect(await snapshot()).toEqual({
    assets: [],
    transactions: [],
    corporate_actions: [],
    asset_valuations: [],
  });
  expect(
    (await db.query("SELECT snapshot IS NOT NULL AS recoverable FROM public.position_deletions"))
      .rows,
  ).toEqual([{ recoverable: true }]);
});
it("rejects calls without an authenticated user even when execution is granted", async () => {
  await db.exec("SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','',false)");
  await expect(remove()).rejects.toThrow("POSITION_AUTH_OR_INPUT_INVALID");
  await expect(restore()).rejects.toThrow("POSITION_AUTH_OR_INPUT_INVALID");
});

async function expire() {
  await db.exec(
    "SET ROLE postgres; UPDATE public.position_deletions SET expires_at=clock_timestamp()-interval '1 second'",
  );
}
async function purge() {
  return (
    await db.query<{ count: number }>("SELECT public.purge_expired_position_deletions() AS count")
  ).rows[0]!.count;
}
it("recovers the owner's pending Undo list with a 24-hour deadline and no financial payload", async () => {
  await remove();
  const deadline = (
    await db.query<{ hours: number }>(
      "SELECT extract(epoch FROM (expires_at-created_at))/3600 AS hours FROM public.position_deletions",
    )
  ).rows[0]!;
  expect(Number(deadline.hours)).toBe(24);
  await db.exec("SET ROLE authenticated");
  const listed = (
    await db.query<{ items: Record<string, unknown>[] }>(
      "SELECT public.list_position_deletions() AS items",
    )
  ).rows[0]!.items;
  expect(listed).toHaveLength(1);
  expect(listed[0]).toMatchObject({
    operationId: operation,
    assetId: asset,
    symbol: "TEST",
    state: "deleted",
    expiresAt: expect.any(String),
    serverNow: expect.any(String),
  });
  expect(Object.keys(listed[0]!).sort()).toEqual(
    ["operationId", "assetId", "symbol", "state", "expiresAt", "serverNow"].sort(),
  );
  await db.exec(
    "SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false)",
  );
  expect(
    (await db.query<{ items: unknown[] }>("SELECT public.list_position_deletions() AS items"))
      .rows[0]!.items,
  ).toEqual([]);
});
it("refuses expired Undo at the server and clears the snapshot even before the scheduler runs", async () => {
  await remove();
  await expire();
  expect(await restore()).toMatchObject({ state: "expired", operationId: operation });
  expect(await snapshot()).toEqual({
    assets: [],
    transactions: [],
    corporate_actions: [],
    asset_valuations: [],
  });
  expect(
    (
      await db.query(
        "SELECT snapshot, purged_at IS NOT NULL AS purged FROM public.position_deletions",
      )
    ).rows,
  ).toEqual([{ snapshot: null, purged: true }]);
  expect(await restore()).toMatchObject({ state: "expired" });
  expect(await remove()).toMatchObject({ state: "expired" });
});
it("purges only expired copies automatically and keeps idempotency receipts", async () => {
  await remove();
  expect(await purge()).toBe(0);
  await expire();
  await db.exec("SET ROLE service_role");
  expect(await purge()).toBe(1);
  expect(await purge()).toBe(0);
  await db.exec("SET ROLE postgres");
  expect((await db.query("SELECT snapshot FROM public.position_deletions")).rows).toEqual([
    { snapshot: null },
  ]);
  expect(await restore()).toMatchObject({ state: "expired" });
});
it("does not grant users or anonymous clients the cleanup or receipt formatter functions", async () => {
  await db.exec("SET ROLE authenticated");
  await expect(purge()).rejects.toThrow("permission denied");
  await expect(
    db.query("SELECT public.position_deletion_receipt(NULL::public.position_deletions)"),
  ).rejects.toThrow("permission denied");
  await db.exec("SET ROLE anon");
  await expect(db.query("SELECT public.list_position_deletions()")).rejects.toThrow(
    "permission denied",
  );
  await expect(purge()).rejects.toThrow("permission denied");
});
it("checks the wall clock after locks rather than the transaction start time", async () => {
  await remove();
  await db.exec(
    "BEGIN; UPDATE public.position_deletions SET expires_at=transaction_timestamp()+interval '10 milliseconds'; SELECT pg_sleep(0.03)",
  );
  expect(await restore()).toMatchObject({ state: "expired" });
  await db.exec("COMMIT");
});
// PGlite serializes commands on one connection. Both scheduling orders are covered;
// true row-lock contention across PostgREST sessions remains a staging check.
it.each(["undo-first", "cleanup-first"])(
  "Undo and cleanup submitted together preserve an unexpired position: %s",
  async (order) => {
    const before = await snapshot();
    await remove();
    if (order === "undo-first") await Promise.all([restore(), purge()]);
    else await Promise.all([purge(), restore()]);
    expect(await snapshot()).toEqual(before);
    await restore();
    expect(await snapshot()).toEqual(before);
  },
);
it.each(["undo-first", "cleanup-first"])(
  "Undo and cleanup submitted together never restore an expired position: %s",
  async (order) => {
    await remove();
    await expire();
    if (order === "undo-first") await Promise.all([restore(), purge()]);
    else await Promise.all([purge(), restore()]);
    expect(await restore()).toMatchObject({ state: "expired" });
    expect(await snapshot()).toEqual({
      assets: [],
      transactions: [],
      corporate_actions: [],
      asset_valuations: [],
    });
    expect((await db.query("SELECT snapshot FROM public.position_deletions")).rows).toEqual([
      { snapshot: null },
    ]);
  },
);
