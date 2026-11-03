import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProCompanyResearch } from "@/components/ProCompanyResearch";

const state = vi.hoisted(() => ({
  stats: vi.fn(),
  research: vi.fn(),
  details: vi.fn(),
  search: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
  useServerFn: (fn: unknown) => fn,
}));

vi.mock("@/lib/market.functions", () => ({
  marketStats: state.stats,
  marketCompanyResearch: state.research,
  marketDetails: state.details,
  searchMarket: state.search,
}));

vi.mock("@/components/ProFeatures", () => ({
  ProGate: ({ children }: { children: ReactNode }) => <>{children}</>,
  BarsSilhouette: () => <div>Preview</div>,
}));

function makeStats(symbol: string) {
  return {
    quoteAt: new Date().toISOString(),
    marketState: "REGULAR",
    currentPrice: 120,
    previousClose: 119,
    open: 119,
    dayLow: 118,
    dayHigh: 121,
    low52: 80,
    high52: 140,
    marketCap: 1_000_000_000,
    enterpriseValue: 1_100_000_000,
    trailingPe: symbol === "AAPL" ? 60 : 20,
    forwardPe: symbol === "AAPL" ? 45 : 18,
    priceToSales: 4,
    priceToBook: 5,
    pegRatio: 1.5,
    beta: 1,
    pe: 60,
    eps: 2,
    forwardEps: 3,
    cash: 100_000_000,
    totalDebt: 200_000_000,
    currentRatio: 1.2,
    quickRatio: 1,
    targetLow: 130,
    target: 150,
    targetHigh: 180,
    recommendation: "buy",
    returnOnEquity: 0.2,
    debtToEquity: 40,
    operatingMargins: 0.3,
    profitMargins: 0.25,
    revenueGrowth: 0.1,
    earningsGrowth: 0.12,
    earningsDate: null,
    dividendRate: 1,
    dividendYield: 0.01,
    currency: "USD",
  };
}

beforeEach(() => {
  state.stats.mockImplementation(({ data }: { data: { symbol: string } }) =>
    Promise.resolve(makeStats(data.symbol)),
  );
  state.research.mockResolvedValue({
    retrievedAt: new Date().toISOString(),
    recommendations: [],
    estimates: [],
    earningsHistory: [],
    ownership: {
      insiderPercent: null,
      institutionalPercent: null,
      institutionsCount: null,
      institutions: [],
      insiders: [],
    },
  });
  state.details.mockResolvedValue({
    closes: [
      { t: Date.now() - 3 * 86400000, c: 100, o: null, h: null, l: null },
      { t: Date.now() - 2 * 86400000, c: 110, o: null, h: null, l: null },
      { t: Date.now() - 86400000, c: 120, o: null, h: null, l: null },
    ],
    lastPrice: 120,
    lastPriceAt: new Date().toISOString(),
    dailyChangePct: null,
    low: 80,
    high: 140,
    currency: "USD",
    unavailable: false,
  });
  state.search.mockResolvedValue({
    assets: [
      { symbol: "MSFT", name: "Microsoft Corporation", type: "stock" },
      { symbol: "NVDA", name: "NVIDIA Corporation", type: "stock" },
    ],
    news: [],
    unavailable: false,
  });
});

afterEach(cleanup);

function renderResearch() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProCompanyResearch symbol="AAPL" lang="en" unlocked />
    </QueryClientProvider>,
  );
}

describe("company valuation comparisons", () => {
  it("shows a real 12-month historical-price and analyst-target-range chart", async () => {
    renderResearch();

    expect(await screen.findByRole("img", { name: /Share price.*past year/i })).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: /Analyst target range · next 12 months: \$130.*\$180.*Average target: \$150/,
      }),
    ).toBeInTheDocument();
  });

  it("lets users choose peers and computes the peer average without the current company", async () => {
    renderResearch();

    fireEvent.change(await screen.findByRole("textbox", { name: "Search company or ticker" }), {
      target: { value: "Microsoft" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.click(await screen.findByRole("button", { name: /Microsoft Corporation/ }));

    await waitFor(() => {
      expect(screen.getByText("P/E ratio vs selected peers")).toBeInTheDocument();
    });
    const peerPanel = screen
      .getByRole("heading", { name: "P/E ratio vs selected peers" })
      .closest("section");
    expect(peerPanel).not.toBeNull();
    const peerContent = within(peerPanel!);
    expect(peerContent.getAllByText("AAPL")).toHaveLength(2);
    expect(peerContent.getByText("MSFT")).toBeInTheDocument();
    const average = peerContent.getByText("Peer average");
    expect(average.parentElement?.textContent).toContain("20×");
    expect(
      peerContent
        .getAllByText("AAPL")
        .some((ticker) => ticker.closest(".grid")?.textContent?.includes("60×")),
    ).toBe(true);
    expect(state.stats).toHaveBeenCalledWith({ data: { symbol: "MSFT" } });
  });
});
