import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DcfData } from "@/lib/market.functions";
import { DcfCalculator } from "@/components/DcfCalculator";

const state = vi.hoisted(() => ({
  data: null as unknown,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: state.data,
    isLoading: state.isLoading,
    isError: state.isError,
    refetch: state.refetch,
  }),
}));

vi.mock("@tanstack/react-start", () => ({
  useServerFn: () => vi.fn(),
}));

vi.mock("@/lib/store", () => ({
  usePortfolio: () => ({
    lang: "en",
    holdings: [{ asset: { type: "stock", symbol: "ACME" } }],
  }),
}));

vi.mock("@/lib/market.functions", () => ({
  marketDcf: vi.fn(),
  searchMarket: vi.fn(),
}));

function makeDcfData(overrides: Partial<DcfData> = {}): DcfData {
  return {
    symbol: "ACME",
    name: "Acme Inc.",
    quoteType: "EQUITY",
    price: 100,
    priceAsOf: new Date().toISOString(),
    currency: "USD",
    finCurrency: "USD",
    fcf: 1_000_000_000,
    cash: 500_000_000,
    debt: 200_000_000,
    shares: 100_000_000,
    revenueGrowth: 0.08,
    earningsGrowth: 0.1,
    fetchedAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  state.data = makeDcfData();
  state.isLoading = false;
  state.isError = false;
  state.refetch.mockReset();
});

afterEach(cleanup);

describe("DCF calculator data safeguards", () => {
  it("can be pinned to a company without showing the ticker search", () => {
    render(<DcfCalculator fixedSymbol="AAPL" />);

    expect(screen.queryByPlaceholderText("Ticker, e.g. AAPL")).not.toBeInTheDocument();
  });

  it("shows a transparent estimate and sensitivity table for complete matching-currency data", () => {
    render(<DcfCalculator />);

    expect(screen.getByText("DCF estimate")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: /sensitivity analysis/i })).toBeInTheDocument();
    expect(screen.getByText(/Yahoo Finance/)).toBeInTheDocument();
    expect(screen.getByText(/reported revenue growth as a proxy/i)).toBeInTheDocument();
    expect(screen.getByText(/Reported free cash flow:/i)).toBeInTheDocument();
  });

  it("withholds the valuation when a required financial input is missing", () => {
    state.data = makeDcfData({ cash: null });
    render(<DcfCalculator />);

    expect(screen.getByText(/required financial inputs are missing/i)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("does not apply the company DCF model to ETFs", () => {
    state.data = makeDcfData({ quoteType: "ETF" });
    render(<DcfCalculator />);

    expect(screen.getByText(/for individual listed companies, not ETFs/i)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("withholds the valuation when financial and quote currencies differ", () => {
    state.data = makeDcfData({ finCurrency: "EUR" });
    render(<DcfCalculator />);

    expect(screen.getByText(/different or unknown currencies/i)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("hides the price comparison when the quote is stale", () => {
    state.data = makeDcfData({
      priceAsOf: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    });
    render(<DcfCalculator />);

    expect(
      screen.getByText(/quote is older than four days; comparison is hidden/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Undervalued by|Overvalued by/)).not.toBeInTheDocument();
  });

  it("shows the intrinsic estimate when no market quote is available", () => {
    state.data = makeDcfData({ price: null });
    render(<DcfCalculator />);

    expect(screen.getByRole("table", { name: /sensitivity analysis/i })).toBeInTheDocument();
    expect(
      screen.getByText(/no usable timestamped market quote is available/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Undervalued by|Overvalued by/)).not.toBeInTheDocument();
  });

  it("surfaces provider errors and lets the user retry", () => {
    state.isError = true;
    render(<DcfCalculator />);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(state.refetch).toHaveBeenCalledOnce();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Financial data could not be loaded. Please try again.",
    );
  });
});
