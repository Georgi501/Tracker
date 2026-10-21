import { describe, expect, it } from "vitest";
import { qualityIssues } from "@/lib/quality";
import type { Asset, Transaction } from "@/lib/portfolio";

const a = (id: string, price = 10): Asset => ({ id, name: id, symbol: id.toUpperCase(), type: "stock", sector: "", region: "", price, change24h: 0, dividendPerShare: 0, payMonths: [] });
const t = (id: string, assetId: string, kind: Transaction["kind"], quantity: number, date: string, price = 10): Transaction => ({ id, assetId, kind, quantity, price, date });

describe("qualityIssues", () => {
  it("flags exact duplicate transactions", () => {
    const r = qualityIssues([a("x")], [t("1", "x", "buy", 2, "2024-01-01"), t("2", "x", "buy", 2, "2024-01-01")], "2025-01-01");
    expect(r).toContainEqual({ kind: "duplicate", symbol: "X", date: "2024-01-01", count: 2 });
  });
  it("flags selling more than held", () => {
    const r = qualityIssues([a("x")], [t("1", "x", "buy", 1, "2024-01-01"), t("2", "x", "sell", 3, "2024-02-01")], "2025-01-01");
    expect(r.some((i) => i.kind === "oversell")).toBe(true);
  });
  it("flags future dates and held assets without a quote", () => {
    const r = qualityIssues([a("x", Number.NaN)], [t("1", "x", "buy", 1, "2030-01-01")], "2025-01-01");
    expect(r.map((i) => i.kind).sort()).toEqual(["future", "noQuote"]);
  });
  it("returns nothing for clean data", () => {
    expect(qualityIssues([a("x")], [t("1", "x", "buy", 1, "2024-01-01")], "2025-01-01")).toEqual([]);
  });
});
