import { expect, it } from "vitest";
import {
  extractNvdaFinancedAssetPayments,
  NVDA_FINANCED_ASSET_TAG as tag,
} from "@/lib/sec-nvda-fcf";
import { extractSecAnnualHistory } from "@/lib/sec-financials";
const filing = { accession: "0001045810-26-000021", filed: "2026-02-25" };
const html = (value = "101", contextExtra = "", attrs = "") => `
<xbrli:context id="annual"><xbrli:entity><xbrli:identifier scheme="http://www.sec.gov/CIK">0001045810</xbrli:identifier>${contextExtra}</xbrli:entity><xbrli:period><xbrli:startDate>2025-01-27</xbrli:startDate><xbrli:endDate>2026-01-25</xbrli:endDate></xbrli:period></xbrli:context>
<xbrli:unit id="usd"><xbrli:measure>iso4217:USD</xbrli:measure></xbrli:unit>
<ix:nonFraction name="nvda:${tag}" contextRef="annual" unitRef="usd" scale="6" ${attrs}>${value}</ix:nonFraction>`;
const point = (val: number) => ({
  start: "2025-01-27",
  end: "2026-01-25",
  val,
  accn: filing.accession,
  filed: filing.filed,
  form: "10-K",
});
const usd = (facts: unknown[]) => ({ units: { USD: facts } });
const payload = (payments = extractNvdaFinancedAssetPayments(html(), filing)) => ({
  cik: 1045810,
  entityName: "NVIDIA",
  facts: {
    "us-gaap": {
      NetCashProvidedByUsedInOperatingActivities: usd([point(102718000000)]),
      PaymentsToAcquireProductiveAssets: usd([point(6042000000)]),
    },
    nvda: { [tag]: usd(payments) },
  },
});
const options = { asOf: "2026-11-12" };
it("extracts USD principal payments with the verified NVIDIA entity and scale", () => {
  expect(extractNvdaFinancedAssetPayments(html(), filing)).toMatchObject([
    { val: 101000000, accn: filing.accession, start: "2025-01-27", end: "2026-01-25" },
  ]);
});
it("reconciles NVIDIA FY2026 FCF with its official report", () => {
  const row = extractSecAnnualHistory(payload(), options).rows[0]!;
  expect(row.freeCashFlow).toBe(96575000000);
  expect(row.sources.freeCashFlow).toMatchObject({
    derived: true,
    accession: filing.accession,
    tags: [
      "us-gaap:NetCashProvidedByUsedInOperatingActivities",
      "us-gaap:PaymentsToAcquireProductiveAssets",
      `nvda:${tag}`,
    ],
  });
});
it("does not assume missing principal payments are zero", () => {
  expect(extractSecAnnualHistory(payload([]), options).rows[0]!.freeCashFlow).toBeNull();
});
it("rejects foreign entities, dimensional facts, other currencies and unsupported transforms", () => {
  const cases = [
    html().replace("0001045810", "0001341439"),
    html("101", "<xbrli:segment>segment</xbrli:segment>"),
    html().replace("iso4217:USD", "iso4217:EUR"),
    html("101", "", 'format="unknown"'),
    html("not-a-number"),
    html().replace('contextRef="annual"', 'contextRef="missing"'),
  ];
  for (const value of cases) expect(extractNvdaFinancedAssetPayments(value, filing)).toEqual([]);
});
it("suppresses FCF for negative, conflicting or mismatched principal payment evidence", () => {
  const payment = extractNvdaFinancedAssetPayments(html(), filing)[0]!;
  for (const payments of [
    [{ ...payment, val: -1 }],
    [{ ...payment, accn: "0001045810-25-000023" }],
    [{ ...payment, start: "2025-01-28" }],
    [payment, { ...payment, val: 102000000 }],
  ]) {
    expect(
      extractSecAnnualHistory(payload(payments), options).rows[0]?.freeCashFlow ?? null,
    ).toBeNull();
  }
});
it("labels a generic productive-assets calculation without applying NVIDIA adjustments", () => {
  const data = payload();
  data.cik = 1341439;
  expect(extractSecAnnualHistory(data, options).rows[0]).toMatchObject({
    freeCashFlow: 96676000000,
    fcfMethod: "cash-productive-assets",
  });
});
