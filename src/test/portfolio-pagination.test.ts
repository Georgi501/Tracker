import { expect, it, vi } from "vitest";
import { readAllPortfolioRows } from "@/lib/portfolio-pagination";
const rows = Array.from({ length: 1101 }, (_, i) => ({ id: `tx-${String(i).padStart(5, "0")}` }));
it("continues from the returned row count when the server cap is smaller than the requested range", async () => {
  const page = vi.fn(async (from: number, to: number) => ({
    data: rows.slice(from, Math.min(to + 1, from + 300)),
    count: rows.length,
    error: null,
  }));
  // The former one-request load received only 300 rows even though 1,101 exist.
  expect((await page(0, 499)).data).toHaveLength(300);
  page.mockClear();
  const result = await readAllPortfolioRows(page);
  expect(result.data).toEqual(rows);
  expect(new Set(result.data.map((row) => row.id)).size).toBe(rows.length);
  expect(page.mock.calls.map(([from]) => from)).toEqual([0, 300, 600, 900]);
});
it("rejects an empty intermediate page rather than accepting a partial history", async () => {
  const page = vi
    .fn()
    .mockResolvedValueOnce({ data: [rows[0]], count: 2, error: null })
    .mockResolvedValueOnce({ data: [], count: 2, error: null });
  await expect(readAllPortfolioRows(page)).rejects.toThrow("incomplete");
});
it("rejects duplicate IDs across page boundaries", async () => {
  const page = vi
    .fn()
    .mockResolvedValueOnce({ data: [rows[0]], count: 2, error: null })
    .mockResolvedValueOnce({ data: [rows[0]], count: 2, error: null });
  await expect(readAllPortfolioRows(page)).rejects.toThrow("repeated IDs");
});
it("rejects changing totals instead of committing an inconsistent read", async () => {
  const page = vi
    .fn()
    .mockResolvedValueOnce({ data: [rows[0]], count: 2, error: null })
    .mockResolvedValueOnce({ data: [rows[1]], count: 3, error: null });
  await expect(readAllPortfolioRows(page)).rejects.toThrow("changed while loading");
});
it("requires an exact count even for a short successful page", async () => {
  await expect(
    readAllPortfolioRows(async () => ({ data: [rows[0]!], count: null, error: null })),
  ).rejects.toThrow("completeness");
});
it("propagates page failures and never returns the already accumulated prefix", async () => {
  const page = vi
    .fn()
    .mockResolvedValueOnce({ data: [rows[0]], count: 2, error: null })
    .mockResolvedValueOnce({ data: null, count: null, error: { message: "Page two offline" } });
  await expect(readAllPortfolioRows(page)).rejects.toThrow("Page two offline");
});
it("accepts a verified empty portfolio", async () => {
  expect(
    (await readAllPortfolioRows(async () => ({ data: [], count: 0, error: null }))).data,
  ).toEqual([]);
});
