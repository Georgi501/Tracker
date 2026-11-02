import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuoteFreshness } from "@/components/QuoteFreshness";

describe("quote freshness display", () => {
  it("shows the timestamp and source without a stale warning for recent quotes", () => {
    render(<QuoteFreshness at={new Date().toISOString()} lang="en" />);

    expect(screen.getByText("Yahoo Finance")).toBeInTheDocument();
    expect(screen.queryByText("Quote is older than 96 hours")).not.toBeInTheDocument();
  });

  it("warns when quote data is older than the shared freshness window", () => {
    const at = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    render(<QuoteFreshness at={at} lang="bg" compact />);

    expect(screen.getByText("Котировката е по-стара от 96 часа")).toBeInTheDocument();
    expect(screen.getByText("Yahoo Finance")).toBeInTheDocument();
  });

  it("does not render a timestamp for missing or invalid dates", () => {
    const { rerender } = render(<QuoteFreshness at={null} lang="en" />);
    expect(screen.queryByText("Yahoo Finance")).not.toBeInTheDocument();

    rerender(<QuoteFreshness at="invalid" lang="en" />);
    expect(screen.queryByText("Yahoo Finance")).not.toBeInTheDocument();
  });
});
