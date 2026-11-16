import {
  buildAllocationShareParams,
  ShareAllocationButton,
} from "@/components/ShareAllocationModal";
import type { Holding } from "@/lib/portfolio";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const SAMPLE_HOLDINGS: Holding[] = [
  {
    asset: {
      id: "a1",
      symbol: "AAPL",
      name: "Apple Inc.",
      type: "stock",
      sector: "Technology",
      region: "North America",
      price: 200,
      change24h: 0.2,
      dividendPerShare: 0,
      payMonths: [],
    },
    quantity: 42.5,
    avgCost: 164.7,
    costBasis: 7000,
    value: 5500,
    pnl: 500,
    pnlPct: 10,
    dayChange: 10,
  },
  {
    asset: {
      id: "a2",
      symbol: "VWCE",
      name: "Vanguard FTSE All-World",
      type: "etf",
      sector: "Broad Market",
      region: "Global",
      price: 120,
      change24h: 0.15,
      dividendPerShare: 0,
      payMonths: [],
    },
    quantity: 25,
    avgCost: 112,
    costBasis: 2800,
    value: 3000,
    pnl: 200,
    pnlPct: 7.1,
    dayChange: 5,
  },
  {
    asset: {
      id: "a3",
      symbol: "BTC-USD",
      name: "Bitcoin",
      type: "crypto",
      sector: "Crypto",
      region: "Global",
      price: 75000,
      change24h: 0,
      dividendPerShare: 0,
      payMonths: [],
    },
    quantity: 0.02,
    avgCost: 60000,
    costBasis: 1200,
    value: 1500,
    pnl: 300,
    pnlPct: 25,
    dayChange: 0,
  },
];

describe("privacy-safe allocation share card", () => {
  it("builds percentage-only weights without balances, tickers, or user identifiers", () => {
    const result = buildAllocationShareParams(SAMPLE_HOLDINGS);
    expect(result).not.toBeNull();
    expect(result!.items).toEqual([
      { key: "stock", pct: 55 },
      { key: "etf", pct: 30 },
      { key: "crypto", pct: 15 },
    ]);
    expect(result!.weightsParam).toBe("stock:55.0,etf:30.0,crypto:15.0");
    expect(result!.ogPath).toBe(
      "/api/og?type=snapshot&weights=stock%3A55.0%2Cetf%3A30.0%2Ccrypto%3A15.0",
    );

    for (const sensitive of ["AAPL", "VWCE", "BTC", "5500", "3000", "42.5", "USD", "EUR"]) {
      expect(result!.ogPath).not.toContain(sensitive);
    }
  });

  it("opens the preview modal and copies the shareable link", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<ShareAllocationButton holdings={SAMPLE_HOLDINGS} lang="en" />);
    fireEvent.click(screen.getByRole("button", { name: /Share allocation/i }));

    expect(screen.getByText(/Percentages only/i)).toBeInTheDocument();
    const img = screen.getByRole("img", { name: /Share my allocation card/i });
    expect(img).toHaveAttribute(
      "src",
      "/api/og?type=snapshot&weights=stock%3A55.0%2Cetf%3A30.0%2Ccrypto%3A15.0",
    );

    fireEvent.click(screen.getByRole("button", { name: /Copy shareable card link/i }));
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/og?type=snapshot&weights=stock%3A55.0%2Cetf%3A30.0%2Ccrypto%3A15.0",
      ),
    );
  });
});
