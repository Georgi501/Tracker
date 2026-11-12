import { buildPortfolioHistory, type HistoryAsset } from "@/lib/history";
import { attributionForRange, dailyAttribution } from "@/lib/performance-attribution";
import type { CorporateAction, Transaction } from "@/lib/portfolio";
import { describe, expect, it } from "vitest";
const eur = [
  { date: "2026-01-01", close: 1.1 },
  { date: "2026-01-02", close: 1.2 },
  { date: "2026-01-03", close: 1.3 },
];
const assets: HistoryAsset[] = [
  {
    id: "a",
    type: "stock",
    currency: "EUR",
    prices: [
      { date: "2026-01-01", close: 100 },
      { date: "2026-01-02", close: 110 },
      { date: "2026-01-03", close: 120 },
    ],
  },
];
const buy: Transaction = {
  id: "1",
  assetId: "a",
  kind: "buy",
  quantity: 2,
  price: 110,
  date: "2026-01-01",
};
function run(
  txs: Transaction[],
  currency: "USD" | "EUR" = "USD",
  a = assets,
  splits: CorporateAction[] = [],
) {
  const h = buildPortfolioHistory(a, txs, "2026-01-01", "2026-01-03", currency, eur, [], splits);
  return dailyAttribution(a, txs, h.points, currency, eur, [], splits);
}
describe("verified arithmetic performance attribution", () => {
  it("separates native price changes, FX, recorded dividends and fees", () => {
    const r = run([
      buy,
      { ...buy, id: "d", kind: "dividend", quantity: 1, price: 4, fee: 0.5, date: "2026-01-02" },
    ])!;
    expect(r[0]!.price).toBeCloseTo(22);
    expect(r[0]!.fx).toBeCloseTo(22);
    expect(r[0]!.dividends).toBe(4);
    expect(r[0]!.fees).toBe(-0.5);
    expect(r[0]!.total).toBeCloseTo(47.5);
  });
  it.each([
    ["buy", 1, 120, 56],
    ["sell", 1, 130, 42],
  ] as const)(
    "reconciles %s execution price without treating its cash flow as profit",
    (kind, quantity, price, expected) => {
      const r = run([
        buy,
        { ...buy, id: "trade", kind, quantity, price, fee: 1, date: "2026-01-02" },
      ])!;
      expect(r[0]!.price + r[0]!.fx).toBeCloseTo(expected);
      expect(r[0]!.total).toBeCloseTo(expected - 1);
      expect(r[0]!.closing - r[0]!.opening - r[0]!.flow).toBeCloseTo(expected);
    },
  );
  it("uses dated reporting-currency conversion and does not invent FX for same-currency holdings", () => {
    const r = run([buy], "EUR")!;
    expect(r[0]!.price).toBeCloseTo(20);
    expect(r[0]!.fx).toBeCloseTo(0);
  });
  it("reconciles USD securities in an EUR reporting portfolio", () => {
    const a = assets.map((a) => ({ ...a, currency: "USD" }));
    const r = run([buy], "EUR", a)!;
    expect(r[0]!.fx).not.toBe(0);
    expect(r[0]!.price + r[0]!.fx).toBeCloseTo(r[0]!.closing - r[0]!.opening);
  });
  it("filters the requested timeframe using a closing-value baseline", () => {
    const days = run([buy])!;
    const result = attributionForRange(days, Date.parse("2026-01-03"), Date.parse("2026-01-04"))!;
    expect(result.total).toBeCloseTo(days[1]!.total);
    expect(result.start).toBe(Date.parse("2026-01-02"));
    expect(attributionForRange(days, 0, 1)).toBeNull();
  });
  it("withholds an unreconciled result instead of using a residual as a fabricated component", () => {
    const h = buildPortfolioHistory(assets, [buy], "2026-01-01", "2026-01-03", "USD", eur, []);
    h.points[1]!.v += 100;
    expect(dailyAttribution(assets, [buy], h.points, "USD", eur, [])).toBeNull();
  });
  it("withholds unsupported or missing exchange history", () => {
    expect(
      run(
        [buy],
        "USD",
        assets.map((a) => ({ ...a, currency: "JPY" })),
      ),
    ).toBeNull();
  });
  it("honors approved split-adjusted transaction replay", () => {
    const split = [{ assetId: "a", date: "2026-01-02", numerator: 2, denominator: 1 }];
    const a = assets.map((a) => ({
      ...a,
      currency: "USD",
      prices: [
        { date: "2026-01-01", close: 50 },
        { date: "2026-01-02", close: 55 },
        { date: "2026-01-03", close: 60 },
      ],
    }));
    const r = run([{ ...buy, quantity: 1, price: 100 }], "USD", a, split)!;
    expect(r[0]!.total).toBeCloseTo(10);
  });
  it("rejects invalid stored amounts", () => {
    expect(run([{ ...buy, fee: NaN }])).toBeNull();
  });
});
