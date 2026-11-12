import { describe, expect, it, vi } from "vitest";
import { createSecFinancialService } from "@/lib/sec-financials.server";
const now = () => Date.parse("2026-11-12T12:00:00Z");
const point = (end: string, val: number) => ({
  start: `${Number(end.slice(0, 4)) - 1}-06-01`,
  end,
  val,
  accn: "0001341439-26-000001",
  form: "10-K",
  filed: "2026-06-22",
});
const payload = {
  cik: 1341439,
  entityName: "Oracle",
  facts: {
    "us-gaap": {
      Revenues: { units: { USD: [point("2025-05-31", 80), point("2026-05-31", 100)] } },
      EarningsPerShareDiluted: {
        units: { "USD/shares": [point("2025-05-31", 2), point("2026-05-31", 3)] },
      },
    },
  },
};
const mapping = { "0": { cik_str: 1341439, ticker: "ORCL", title: "Oracle" } };
function setup() {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(
      async (input) =>
        new Response(JSON.stringify(String(input).includes("company_tickers") ? mapping : payload)),
    );
  return { fetcher, annual: createSecFinancialService({ fetcher, now, wait: async () => {} }) };
}
describe("SEC annual production provider", () => {
  it("resolves identity from SEC, keeps reported values and suppresses unreconciled EPS history", async () => {
    const { annual, fetcher } = setup();
    const result = await annual("orcl");
    expect(result).toMatchObject({
      source: "SEC EDGAR",
      currency: "USD",
      epsHistoryUnavailable: true,
    });
    expect(result!.rows.map((row) => row.dilutedEps)).toEqual([null, 3]);
    expect(result!.rows.map((row) => row.revenue)).toEqual([80, 100]);
    expect(result!.filings["2026-05-31"]).toContain("sec.gov/Archives/edgar/data/1341439/");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("coalesces concurrent requests and caches only public company history", async () => {
    const { annual, fetcher } = setup();
    await Promise.all([annual("ORCL"), annual("ORCL"), annual("orcl")]);
    await annual("ORCL");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("returns unsupported for unknown tickers without querying another company's facts", async () => {
    const { annual, fetcher } = setup();
    expect(await annual("VOD.L")).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("propagates SEC outages and retries after failures instead of silently switching providers", async () => {
    const { fetcher } = setup();
    fetcher.mockResolvedValueOnce(new Response("", { status: 503 }));
    const annual = createSecFinancialService({ fetcher, now, wait: async () => {} });
    await expect(annual("ORCL")).rejects.toThrow("503");
    expect((await annual("ORCL"))!.source).toBe("SEC EDGAR");
  });
  it("rejects mismatched CIK identities", async () => {
    const { fetcher } = setup();
    fetcher.mockImplementation(
      async (input) =>
        new Response(
          JSON.stringify(
            String(input).includes("company_tickers") ? mapping : { ...payload, cik: 320193 },
          ),
        ),
    );
    const annual = createSecFinancialService({ fetcher, now, wait: async () => {} });
    await expect(annual("ORCL")).rejects.toThrow("identity mismatch");
  });
});
