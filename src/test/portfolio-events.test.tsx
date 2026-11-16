import { ConfirmedDividendCalendar } from "@/components/ConfirmedDividendCalendar";
import { eventPresentation } from "@/lib/event-presentation";
import type { DividendInfo, SecFilingEvent } from "@/lib/dividends.functions";
import { eventsCopy } from "@/lib/events-i18n";
import { languages } from "@/lib/i18n";
import type { Holding } from "@/lib/portfolio";
import { buildConfirmedDividendCalendar, buildSmartPortfolioEvents } from "@/lib/portfolio-events";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/AppShell", () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
afterEach(cleanup);

const holding = (symbol: string, quantity: number, type: "stock" | "etf" = "stock") =>
  ({ asset: { symbol, name: `${symbol} Inc`, type }, quantity }) as Pick<
    Holding,
    "asset" | "quantity"
  >;
const toUsd = (amount: number, currency: string | null) =>
  currency === "USD" ? amount : currency === "EUR" ? amount * 1.1 : Number.NaN;
const info = (over: Partial<DividendInfo> & { symbol: string }): DividendInfo => ({
  currency: "USD",
  paid: [],
  exDate: null,
  payDate: null,
  ...over,
});

describe("confirmed dividend calendar", () => {
  const holdings = [
    holding("AAA", 10),
    holding("BBB", 4, "etf"),
    holding("CCC", 5),
    holding("ZZZ", 0),
  ];
  const events = [
    info({
      symbol: "AAA",
      exDate: "2026-12-10",
      payDate: "2026-12-20",
      paid: [
        { date: "2026-03-01", amount: 0.2 },
        { date: "2026-09-01", amount: 0.25 },
      ],
    }),
    info({
      symbol: "BBB",
      currency: "EUR",
      exDate: "2027-01-05",
      paid: [{ date: "2026-10-01", amount: 1 }],
    }),
    info({
      symbol: "CCC",
      currency: "JPY",
      payDate: "2026-12-30",
      paid: [{ date: "2026-06-01", amount: 5 }],
    }),
    info({ symbol: "ZZZ", exDate: "2026-12-12", paid: [{ date: "2026-06-01", amount: 1 }] }),
    info({ symbol: "AAA2" }),
  ];

  it("groups confirmed events by month using only the last confirmed payout, never estimates", () => {
    const months = buildConfirmedDividendCalendar(holdings, events, toUsd);
    expect(months.map((m) => m.monthKey)).toEqual(["2026-12", "2027-01"]);
    const dec = months[0]!;
    expect(dec.items.map((i) => i.symbol)).toEqual(["AAA", "CCC"]);
    expect(dec.items[0]).toMatchObject({
      date: "2026-12-20",
      kind: "payDate",
      companionDate: "2026-12-10",
      perShareUsd: 0.25,
      totalUsd: 2.5,
    });
    // Unsupported provider currency: amount stays unavailable, never fabricated.
    expect(dec.items[1]).toMatchObject({ perShareUsd: null, totalUsd: null });
    expect(dec.monthTotalUsd).toBe(2.5);
    expect(months[1]!.items[0]).toMatchObject({ kind: "exDate", symbol: "BBB" });
    expect(months[1]!.items[0]!.totalUsd).toBeCloseTo(4.4);
  });

  it("omits holdings with no confirmed dates or no position", () => {
    const flat = buildConfirmedDividendCalendar(holdings, events, toUsd).flatMap((m) => m.items);
    expect(flat.some((i) => i.symbol === "ZZZ")).toBe(false);
  });

  it("renders amounts in the display currency formatter and an unavailable state", () => {
    const months = buildConfirmedDividendCalendar(holdings, events, toUsd);
    render(
      <ConfirmedDividendCalendar
        months={months}
        lang="en"
        money={(usd) => `€${(usd * 0.9).toFixed(2)}`}
      />,
    );
    expect(screen.getAllByText("€2.25").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Amount unavailable")).toBeInTheDocument();
    expect(screen.getAllByText(/Last confirmed \/ share/).length).toBeGreaterThan(0);
  });

  it("shows the empty state without fabricated rows", () => {
    render(<ConfirmedDividendCalendar months={[]} lang="bg" money={() => ""} />);
    expect(screen.getByText(eventsCopy.bg.calendarEmpty)).toBeInTheDocument();
  });
});

describe("smart portfolio event feed", () => {
  const holdings = [holding("AAA", 10), holding("BBB", 2), holding("ETF1", 3, "etf")];
  const sec = (symbol: string, filed: string): SecFilingEvent => ({
    symbol,
    periodEnd: "2026-06-30",
    filed,
    filingUrl: `https://www.sec.gov/Archives/edgar/data/1/${symbol}.htm`,
  });

  it("keeps only owned ex-dividend dates within the 7-day window", () => {
    const result = buildSmartPortfolioEvents({
      holdings,
      asOfDate: "2026-11-16",
      toUsd,
      secFilings: [],
      dividendEvents: [
        info({ symbol: "AAA", exDate: "2026-11-16", paid: [{ date: "2026-08-01", amount: 0.5 }] }),
        info({ symbol: "BBB", exDate: "2026-11-23" }),
        info({ symbol: "ETF1", exDate: "2026-11-24" }),
        info({ symbol: "NOTOWNED", exDate: "2026-11-18" }),
        info({ symbol: "AAA", exDate: "2026-11-15" }),
      ],
    });
    const ex = result.filter((e) => e.kind === "ex_dividend_7d");
    expect(ex.map((e) => [e.symbol, e.kind === "ex_dividend_7d" ? e.daysUntil : -1])).toEqual([
      ["AAA", 0],
      ["BBB", 7],
    ]);
    expect(ex[0]).toMatchObject({ perShareUsd: 0.5, totalUsd: 5 });
    expect(ex[1]).toMatchObject({ perShareUsd: null, totalUsd: null });
  });

  it("includes only recent 10-K filings from held US stocks", () => {
    const result = buildSmartPortfolioEvents({
      holdings,
      asOfDate: "2026-11-16",
      dividendEvents: [],
      secFilings: [
        sec("AAA", "2026-11-10"),
        sec("BBB", "2026-08-01"),
        sec("ETF1", "2026-11-10"),
        sec("OTHER", "2026-11-10"),
        { ...sec("AAA", "2026-11-12"), filingUrl: "javascript:alert(1)" },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ kind: "sec_10k_filed", symbol: "AAA", daysSinceFiled: 6 });
  });

  it("orders ex-dividend events before filings and localizes every event in all languages", () => {
    const result = buildSmartPortfolioEvents({
      holdings,
      asOfDate: "2026-11-16",
      toUsd,
      dividendEvents: [
        info({ symbol: "BBB", exDate: "2026-11-17", paid: [{ date: "2026-05-01", amount: 1 }] }),
      ],
      secFilings: [sec("AAA", "2026-11-14")],
    });
    expect(result.map((e) => e.kind)).toEqual(["ex_dividend_7d", "sec_10k_filed"]);
    for (const { code } of languages) {
      const [ex, filing] = result.map((e) => eventPresentation(e, code, (usd) => `$${usd}`));
      expect(ex!.title).toContain("BBB");
      expect(ex!.body).toContain("$1");
      expect(ex!.body).toContain(eventsCopy[code].tomorrow);
      expect(filing!.href).toMatch(/^https:\/\/www\.sec\.gov\//);
      expect(filing!.title).toContain("AAA");
    }
  });
});
