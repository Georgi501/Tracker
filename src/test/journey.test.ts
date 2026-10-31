import { describe, expect, it } from "vitest";
import {
  assetSummary,
  reviewDue,
  snapshotCsv,
  snapshotWeights,
  timelineByMonth,
} from "@/lib/journey";
import type { Holding, Transaction } from "@/lib/portfolio";

const tx = (
  id: string,
  kind: Transaction["kind"],
  q: number,
  p: number,
  date: string,
  assetId = "a",
): Transaction => ({ id, assetId, kind, quantity: q, price: p, date });

describe("journey", () => {
  it("sums buys, sells and dividends for one asset", () => {
    const s = assetSummary(
      [
        tx("1", "buy", 2, 100, "2024-01-05"),
        tx("2", "sell", 1, 150, "2024-03-01"),
        tx("3", "dividend", 1, 4, "2024-02-01"),
        tx("4", "buy", 9, 9, "2023-01-01", "b"),
      ],
      "a",
    );
    expect(s).toEqual({
      bought: 200,
      sold: 150,
      dividends: 4,
      buys: 1,
      sells: 1,
      firstDate: "2024-01-05",
    });
  });
  it("groups the timeline by month, newest first", () => {
    const g = timelineByMonth([
      tx("1", "buy", 1, 1, "2024-01-05"),
      tx("2", "buy", 1, 1, "2024-03-01"),
      tx("3", "buy", 1, 1, "2024-01-20"),
    ]);
    expect(g.map((x) => x.month)).toEqual(["2024-03", "2024-01"]);
    expect(g[1]!.items.map((x) => x.id)).toEqual(["3", "1"]);
  });
  it("snapshot shares only class percentages and skips unpriced holdings", () => {
    const h = (type: string, value: number) => ({ asset: { type }, value }) as unknown as Holding;
    expect(snapshotWeights([h("stock", 75), h("etf", 25), h("crypto", Number.NaN)])).toEqual([
      { cls: "stock", pct: 75 },
      { cls: "etf", pct: 25 },
    ]);
  });
  it("exports only class percentages in the shareable CSV", () => {
    const csv = snapshotCsv(
      [
        { cls: "stock", pct: 75 },
        { cls: "etf", pct: 25 },
      ],
      "2025-01-02",
    );
    expect(csv).toBe(
      "as_of,asset_class,allocation_percent\n2025-01-02,stock,75\n2025-01-02,etf,25",
    );
    expect(csv).not.toMatch(/AAPL|1000|account/i);
  });
  it("review is due on or after the review date", () => {
    expect(reviewDue("2026-10-20", "2026-10-20")).toBe(true);
    expect(reviewDue("2026-10-21", "2026-10-20")).toBe(false);
    expect(reviewDue(null)).toBe(false);
  });
});
