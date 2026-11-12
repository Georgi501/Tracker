import { describe, expect, it } from "vitest";
import { extractSecAnnualHistory } from "@/lib/sec-financials";

const accn = "0001341439-26-000001";
const fact = (overrides: Record<string, unknown> = {}) => ({
  start: "2025-06-01",
  end: "2026-05-31",
  val: 100,
  accn,
  form: "10-K",
  filed: "2026-06-22",
  fy: 2026,
  fp: "FY",
  ...overrides,
});
const company = (tags: Record<string, unknown>) => ({
  cik: 1341439,
  entityName: "Oracle",
  facts: { "us-gaap": tags },
});
const usd = (...points: unknown[]) => ({ units: { USD: points } });
const options = { asOf: "2026-11-12", years: 10 };

describe("SEC annual prototype", () => {
  it("keeps zero and negative reports, ignores quarters and future filings", () => {
    const result = extractSecAnnualHistory(
      company({
        Revenues: usd(fact({ val: 0 }), fact({ start: "2026-03-01", val: 42, form: "10-Q" })),
        NetIncomeLoss: usd(fact({ val: -12 }), fact({ val: 999, filed: "2027-01-01" })),
      }),
      options,
    );
    expect(result.rows[0]).toMatchObject({ revenue: 0, netIncome: -12, costOfRevenue: null });
  });
  it("labels comparative facts by their actual fiscal dates, not the filing fiscal year", () => {
    const result = extractSecAnnualHistory(
      company({ Revenues: usd(fact(), fact({ start: "2024-06-01", end: "2025-05-31", val: 80 })) }),
      options,
    );
    expect(result.rows.map((row) => row.date)).toEqual(["2025-05-31", "2026-05-31"]);
  });
  it("uses latest filed restatements and exposes accession and tags", () => {
    const result = extractSecAnnualHistory(
      company({
        Revenues: usd(
          fact({ val: 50 }),
          fact({ val: 60, filed: "2026-07-01", form: "10-K/A", accn: "0001341439-26-000002" }),
        ),
      }),
      options,
    );
    expect(result.rows[0]!.revenue).toBe(60);
    expect(result.rows[0]!.sources.revenue).toMatchObject({
      accession: "0001341439-26-000002",
      tags: ["us-gaap:Revenues"],
      derived: false,
    });
  });
  it("derives FCF only from same-filing annual CFO and capex and marks it calculated", () => {
    const result = extractSecAnnualHistory(
      company({
        NetCashProvidedByUsedInOperatingActivities: usd(fact({ val: 10 })),
        PaymentsToAcquirePropertyPlantAndEquipment: usd(fact({ val: 30 })),
      }),
      options,
    );
    expect(result.rows[0]!.freeCashFlow).toBe(-20);
    expect(result.rows[0]!.sources.freeCashFlow?.derived).toBe(true);
  });
  it("does not derive FCF across different filings or from negative capex", () => {
    for (const capex of [fact({ accn: "0001341439-25-000001" }), fact({ val: -1 })]) {
      const result = extractSecAnnualHistory(
        company({
          NetCashProvidedByUsedInOperatingActivities: usd(fact()),
          PaymentsToAcquirePropertyPlantAndEquipment: usd(capex),
        }),
        options,
      );
      expect(result.rows[0]!.freeCashFlow).toBeNull();
    }
  });
  it("rejects conflicting aliases and ambiguous annual periods rather than guessing", () => {
    const conflict = extractSecAnnualHistory(
      company({
        Revenues: usd(fact()),
        RevenueFromContractWithCustomerExcludingAssessedTax: usd(fact({ val: 50 })),
      }),
      options,
    );
    expect(conflict.rows[0]!.revenue).toBeNull();
    expect(conflict.issues).toHaveLength(1);
    const ambiguous = extractSecAnnualHistory(
      company({ Revenues: usd(fact(), fact({ start: "2025-06-02" })) }),
      options,
    );
    expect(ambiguous.rows).toEqual([]);
    expect(ambiguous.issues).toHaveLength(1);
  });
  it("keeps USD EPS units separate and does not invent missing bank metrics", () => {
    const result = extractSecAnnualHistory(
      company({
        RevenuesNetOfInterestExpense: usd(fact({ val: 200 })),
        EarningsPerShareDiluted: {
          units: { "USD/shares": [fact({ val: 2 })], USD: [fact({ val: 999 })] },
        },
      }),
      options,
    );
    expect(result.rows[0]).toMatchObject({
      revenue: 200,
      dilutedEps: 2,
      grossProfit: null,
      freeCashFlow: null,
    });
  });
  it("supports 53-week fiscal years and retains gaps in a ten-year window", () => {
    const result = extractSecAnnualHistory(
      company({
        Revenues: usd(
          fact({ start: "2022-09-25", end: "2023-09-30" }),
          fact({ start: "2013-09-29", end: "2014-09-27" }),
          fact({ start: "2012-09-30", end: "2013-09-28" }),
        ),
      }),
      options,
    );
    expect(result.rows.map((row) => row.date)).toEqual(["2014-09-27", "2023-09-30"]);
  });
  it("rejects invalid as-of dates and excludes transition periods", () => {
    expect(() => extractSecAnnualHistory(company({}), { asOf: "2026-02-30" })).toThrow();
    const result = extractSecAnnualHistory(
      company({ Revenues: usd(fact({ start: "2026-01-01" })) }),
      options,
    );
    expect(result.rows).toEqual([]);
  });
});
