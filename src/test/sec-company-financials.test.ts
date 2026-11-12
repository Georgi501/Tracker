import { expect, it } from "vitest";
import fixtures from "./fixtures/sec-company-financials.json";
import { extractSecAnnualHistory } from "@/lib/sec-financials";
import { extractSecInlinePayments } from "@/lib/sec-inline-payments";

// Reduced entity-wide annual SEC facts captured 2026-11-12; provenance lives in each fixture.
it.each(fixtures)(
  "retains reported values and safe FCF coverage for $symbol",
  ({ symbol, payload, asOf, expected }) => {
    const row = extractSecAnnualHistory(payload, { asOf }).rows.at(-1)!;
    expect(row).toMatchObject(expected);
    if (row.freeCashFlow !== null)
      expect(row.fcfMethod).toBe(symbol === "META" ? "meta-reconciled" : "cash-ppe");
    if (symbol === "AMZN") expect(row.freeCashFlow).toBeNull(); // Proceeds must be verified from the 10-K.
    if (symbol === "JPM") expect(row.grossProfit).toBeNull(); // No fabricated bank gross profit or capex.
  },
);
const accession = "0001018724-26-000004";
const point = (val: number) => ({
  start: "2025-01-01",
  end: "2025-12-31",
  val,
  accn: accession,
  filed: "2026-02-06",
  form: "10-K",
});
const usd = (...points: unknown[]) => ({ units: { USD: points } });
const amzn = (proceeds: unknown[]) => ({
  cik: 1018724,
  entityName: "Amazon",
  facts: {
    "us-gaap": {
      NetCashProvidedByUsedInOperatingActivities: usd(point(139514000000)),
      PaymentsToAcquireProductiveAssets: usd(point(131819000000)),
      FinanceLeasePrincipalPayments: usd(point(1557000000)),
    },
    amzn: { ProceedsFromPropertyPlantAndEquipmentSalesAndIncentives: usd(...proceeds) },
  },
});
it("reconciles Amazon FCF with net cash capex without incorrectly subtracting lease payments", () => {
  const row = extractSecAnnualHistory(amzn([point(3499000000)]), { asOf: "2026-11-12" }).rows[0]!;
  expect(row.freeCashFlow).toBe(11194000000);
  expect(row.fcfMethod).toBe("amzn-reconciled");
});
it("never fills a missing Amazon proceeds component with zero or combines different filings", () => {
  for (const proceeds of [
    [],
    [{ ...point(3499000000), accn: "0001018724-25-000004" }],
    [point(-1)],
  ])
    expect(
      extractSecAnnualHistory(amzn(proceeds), { asOf: "2026-11-12" }).rows[0]!.freeCashFlow,
    ).toBeNull();
});
it("requires Meta lease principal even when CFO and capex exist", () => {
  const data = amzn([]);
  data.cik = 1326801;
  data.facts["us-gaap"] = {
    NetCashProvidedByUsedInOperatingActivities: usd(point(115800000000)),
    PaymentsToAcquireProductiveAssets: usd(point(69691000000)),
    FinanceLeasePrincipalPayments: usd(point(2524000000)),
  };
  expect(extractSecAnnualHistory(data, { asOf: "2026-11-12" }).rows[0]!.freeCashFlow).toBeNull(); // Productive assets do not replace audited PP&E component.
});
it("reads only an explicitly named company extension from matching CIK and USD contexts", () => {
  const tag = "amzn:ProceedsFromPropertyPlantAndEquipmentSalesAndIncentives";
  const html = `<xbrli:context id="annual"><xbrli:entity><xbrli:identifier scheme="http://www.sec.gov/CIK">0001018724</xbrli:identifier></xbrli:entity><xbrli:period><xbrli:startDate>2025-01-01</xbrli:startDate><xbrli:endDate>2025-12-31</xbrli:endDate></xbrli:period></xbrli:context><xbrli:unit id="usd"><xbrli:measure>iso4217:USD</xbrli:measure></xbrli:unit><ix:nonFraction name="${tag}" unitRef="usd" contextRef="annual" scale="6" format="ixt:num-dot-decimal">3,499</ix:nonFraction>`;
  const filing = { accession, filed: "2026-02-06", cik: 1018724, tag };
  expect(extractSecInlinePayments(html, filing)[0]?.val).toBe(3499000000);
  expect(extractSecInlinePayments(html, { ...filing, cik: 1045810 })).toEqual([]);
  expect(extractSecInlinePayments(html, { ...filing, tag: "amzn:UnverifiedTag" })).toEqual([]);
});
