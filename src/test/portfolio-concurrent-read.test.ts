import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { readAllPortfolioRows } from "@/lib/portfolio-pagination";

type Trade = { id: string; asset_id: string; date: string; created_at: string; quantity: number };
let db: PGlite;
const id = (value: number) => `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE TABLE assets(id uuid PRIMARY KEY,symbol text NOT NULL);
    CREATE TABLE transactions(id uuid PRIMARY KEY,asset_id uuid NOT NULL REFERENCES assets(id),date date NOT NULL,created_at timestamptz NOT NULL,quantity integer NOT NULL);
    INSERT INTO assets SELECT ('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'TEST'||i FROM generate_series(1,61) i;`);
}, 30000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.exec(`TRUNCATE transactions;
    INSERT INTO transactions SELECT ('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,
      ('00000000-0000-4000-8000-'||lpad((1+(i-1)%61)::text,12,'0'))::uuid,
      '2025-01-01','2025-01-01T12:00:00Z',CASE i WHEN 1 THEN 7 WHEN 501 THEN 9 ELSE 1 END
      FROM generate_series(1,1101) i;`);
});
async function readPage(from: number, to: number) {
  const data = (
    await db.query<Trade>(
      "SELECT id,asset_id,date::text,created_at::text,quantity FROM transactions ORDER BY date,created_at,id OFFSET $1 LIMIT $2",
      [from, to - from + 1],
    )
  ).rows;
  const count = Number(
    (await db.query<{ count: number }>("SELECT count(*) AS count FROM transactions")).rows[0]!
      .count,
  );
  return { data, count, error: null };
}
const quantity = (trades: Trade[]) => trades.reduce((sum, row) => sum + row.quantity, 0);
it("loads the stable 1101-trade, 61-asset PostgreSQL fixture exactly once", async () => {
  const actual = await readPage(0, 2000);
  const loaded = await readAllPortfolioRows(readPage);
  expect((await db.query("SELECT * FROM assets")).rows).toHaveLength(61);
  expect(loaded.data).toEqual(actual.data);
  expect(loaded.data).toHaveLength(1101);
  expect(new Set(loaded.data.map((row) => row.id)).size).toBe(1101);
});
it("reproduces the legacy live-pagination failure for same-count delete+append", async () => {
  const before = await readPage(0, 2000);
  let calls = 0;
  const loaded = await readAllPortfolioRows(async (from, to) => {
    if (calls++ === 1) {
      // Mutations occur between HTTP-equivalent page requests, not within one snapshot.
      await db.query("DELETE FROM transactions WHERE id=$1", [id(1)]);
      await db.query(
        "INSERT INTO transactions VALUES ($1,$2,'2025-01-01','2025-01-01T12:00:00Z',13)",
        [id(2000), id(1)],
      );
    }
    return readPage(from, to);
  });
  const after = await readPage(0, 2000);
  expect(loaded.error).toBeNull(); // Legacy pagination accepts it; financial paths now use portfolio_snapshot.
  expect(before.count).toBe(1101);
  expect(after.count).toBe(1101);
  expect(loaded.data).toHaveLength(1101);
  expect(new Set(loaded.data.map((row) => row.id)).size).toBe(1101);
  const loadedIds = new Set(loaded.data.map((row) => row.id));
  const actualIds = new Set(after.data.map((row) => row.id));
  expect(after.data.filter((row) => !loadedIds.has(row.id)).map((row) => row.id)).toEqual([
    id(501),
  ]);
  expect(loaded.data.filter((row) => !actualIds.has(row.id)).map((row) => row.id)).toEqual([id(1)]);
  expect(loadedIds.has(id(2000))).toBe(true);
  expect(quantity(before.data)).toBe(1115);
  expect(quantity(loaded.data)).toBe(1119);
  expect(quantity(after.data)).toBe(1121);
});
it("rejects the opposite offset shift when it produces a repeated boundary ID", async () => {
  let calls = 0;
  await expect(
    readAllPortfolioRows(async (from, to) => {
      if (calls++ === 1) {
        await db.query("DELETE FROM transactions WHERE id=$1", [id(1101)]);
        await db.query(
          "INSERT INTO transactions VALUES ($1,$2,'2025-01-01','2025-01-01T12:00:00Z',13)",
          [id(0), id(1)],
        );
      }
      return readPage(from, to);
    }),
  ).rejects.toThrow("repeated IDs");
});
