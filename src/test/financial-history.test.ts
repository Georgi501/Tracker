import { describe, expect, it, vi } from "vitest";
import { fetchAnnualFinancialHistory, parseAnnualFinancials } from "@/lib/financial-history.server";

const point = (asOfDate: string, raw: number, currencyCode = "USD") => ({
  asOfDate,
  periodType: "12M",
  currencyCode,
  reportedValue: { raw },
});
const payload = (points: unknown[]) => ({
  timeseries: { error: null, result: [{ annualTotalRevenue: points }] },
});

describe("Yahoo annual history", () => {
  it("keeps reported zero, dates values by asOfDate, and leaves unreported metrics null", () => {
    const result = parseAnnualFinancials(
      payload([point("2022-05-31", 0), point("2023-05-31", 42)]),
    );
    expect(result.currency).toBe("USD");
    expect(result.rows.map((row) => [row.date, row.revenue, row.freeCashFlow])).toEqual([
      ["2022-05-31", 0, null],
      ["2023-05-31", 42, null],
    ]);
  });
  it("recovers an older report with an earlier end date without filling missing years", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const end = Number(new URL(String(input)).searchParams.get("period2"));
      const points =
        end > Date.parse("2023-01-01") / 1000
          ? [point("2026-05-31", 67)]
          : end > Date.parse("2021-01-01") / 1000
            ? [point("2022-05-31", 42)]
            : [];
      return new Response(JSON.stringify(payload(points)));
    });
    const result = await fetchAnnualFinancialHistory(
      "ORCL",
      new Date("2015-11-12"),
      new Date("2026-11-12"),
      fetcher,
    );
    expect(result.rows.map((row) => row.date)).toEqual(["2022-05-31", "2026-05-31"]);
    expect(fetcher).toHaveBeenCalledTimes(3);
    const windows = fetcher.mock.calls.map(([input]) => {
      const url = new URL(String(input));
      return [url.searchParams.get("period1"), url.searchParams.get("period2")];
    });
    expect(windows[0]![0]).toBe(windows[1]![1]);
    expect(windows[1]![0]).toBe(windows[2]![1]);
  });
  it("rejects provider errors and mixed reporting currencies", () => {
    expect(() =>
      parseAnnualFinancials({ timeseries: { error: { code: "Unauthorized" } } }),
    ).toThrow();
    expect(() =>
      parseAnnualFinancials(payload([point("2022-05-31", 1), point("2023-05-31", 2, "EUR")])),
    ).toThrow("Mixed");
  });
  it("does not turn a failed older request into a successful partial history", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(payload([point("2026-05-31", 67)]))))
      .mockResolvedValueOnce(new Response("", { status: 503 }));
    await expect(
      fetchAnnualFinancialHistory("ORCL", new Date("2015-11-12"), new Date("2026-11-12"), fetcher),
    ).rejects.toThrow("503");
  });
});
