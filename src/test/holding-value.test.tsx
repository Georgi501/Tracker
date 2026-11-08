import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { afterEach } from "vitest";
import { HoldingValue } from "@/components/HoldingValue";
import type { Asset } from "@/lib/portfolio";

function asset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: "asset-1",
    name: "Example Corp",
    symbol: "EXM",
    type: "stock",
    sector: "Technology",
    region: "North America",
    price: 100,
    change24h: 0,
    dividendPerShare: 0,
    payMonths: [],
    quoteCurrency: "USD",
    quoteNativePrice: 100,
    quoteAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderValue({
  asset: holdingAsset = asset(),
  quantity = 10,
  valueUsd = quantity * holdingAsset.price,
  currency = "EUR",
  eurPerUsd = 0.9,
  displayValue = "€900.00",
}: {
  asset?: Asset;
  quantity?: number;
  valueUsd?: number;
  currency?: "USD" | "EUR";
  eurPerUsd?: number | null;
  displayValue?: string;
} = {}) {
  const view = render(
    <HoldingValue
      asset={holdingAsset}
      quantity={quantity}
      valueUsd={valueUsd}
      currency={currency}
      liveFx={
        eurPerUsd === null
          ? null
          : {
              eurPerUsd,
              at: new Date().toISOString(),
              source: "Yahoo Finance",
              providerUnavailable: false,
            }
      }
      displayValue={displayValue}
      lang="en"
      t={(key) => key}
    />,
  );
  fireEvent.click(screen.getByText("holdingValueExplain"));
  return view;
}

afterEach(cleanup);

describe("holding current value explanation", () => {
  it("shows USD-to-EUR conversion in the correct direction and the matching result", () => {
    renderValue();

    expect(screen.getByText("1 USD = 0.9 EUR")).toBeInTheDocument();
    expect(screen.getAllByText("€900.00")).toHaveLength(2);
  });

  it("shows quantity, unit price, and total when the portfolio currency is USD", () => {
    renderValue({
      quantity: 10,
      currency: "USD",
      eurPerUsd: null,
      displayValue: "$1,000.00",
    });

    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("100 USD")).toBeInTheDocument();
    expect(screen.getAllByText("$1,000.00")).toHaveLength(3);
    expect(screen.queryByText("holdingValuePortfolioConversion")).not.toBeInTheDocument();
  });

  it("shows the conversion from a foreign quote currency into USD", () => {
    renderValue({
      asset: asset({ quoteCurrency: "EUR", quoteNativePrice: 90, price: 100 }),
    });

    expect(screen.getByText("1 EUR = 1.111111111111 USD")).toBeInTheDocument();
  });

  it("preserves fractional quantities in the explanation", () => {
    renderValue({ quantity: 1.25, valueUsd: 125, displayValue: "€112.50" });

    expect(screen.getByText("1.25")).toBeInTheDocument();
    expect(screen.getAllByText("€112.50")).toHaveLength(2);
  });

  it("closes the explanation with Escape", () => {
    renderValue();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("marks old quotes as stale and reports missing timestamps and sources", () => {
    const staleView = renderValue({
      asset: asset({ quoteAt: new Date(Date.now() - 5 * 86400000).toISOString() }),
    });
    expect(screen.getByText("holdingValueStale")).toBeInTheDocument();
    expect(screen.getByText("Yahoo Finance")).toBeInTheDocument();
    staleView.unmount();

    const withoutTimestamp = asset();
    delete withoutTimestamp.quoteAt;
    renderValue({ asset: withoutTimestamp });
    expect(screen.getAllByText("holdingValueTimestampMissing").length).toBeGreaterThan(0);
    expect(screen.getByText("holdingValueSourceMissing")).toBeInTheDocument();
  });

  it("explains an unavailable quote and an unavailable portfolio FX rate", () => {
    const withoutQuote = asset({ price: Number.NaN });
    delete withoutQuote.quoteNativePrice;
    const missingQuoteView = renderValue({
      asset: withoutQuote,
      valueUsd: Number.NaN,
      displayValue: "—",
    });
    expect(screen.getByText("holdingValueMissingPrice")).toBeInTheDocument();
    missingQuoteView.unmount();

    renderValue({ eurPerUsd: null, displayValue: "—" });
    expect(screen.getAllByText("holdingValueMissingFx").length).toBeGreaterThan(0);
  });
});
