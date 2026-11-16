import { compareEtfProfiles } from "@/lib/etf-overlap";
import { EtfOverlapPage } from "@/routes/etf-overlap";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/store", () => ({
  usePortfolio: () => ({ lang: "en" }),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: unknown) => opts,
  Link: ({
    to,
    children,
    className,
  }: {
    to: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

describe("ETF overlap & look-through calculator", () => {
  it("computes verified overlap scores and ignores unknown tickers", () => {
    const identical = compareEtfProfiles(["VOO", "VUAA"]);
    expect(identical).not.toBeNull();
    expect(identical!.sectorOverlap).toBeCloseTo(1, 5);
    expect(identical!.regionOverlap).toBeCloseTo(1, 5);

    const mixed = compareEtfProfiles(["VOO", "QQQ"]);
    expect(mixed).not.toBeNull();
    expect(mixed!.sectorOverlap).toBeGreaterThan(0.6);
    expect(mixed!.sectorOverlap).toBeLessThan(0.9);
    expect(mixed!.regionOverlap).toBeCloseTo(0.97, 2);

    const three = compareEtfProfiles(["VOO", "VWCE", "QQQ"]);
    expect(three?.symbols).toEqual(["VOO", "VWCE", "QQQ"]);

    expect(compareEtfProfiles(["UNKNOWN_TICKER", "ALSO_UNKNOWN"])).toBeNull();
  });

  it("renders interactively with presets, 3rd ETF toggle, and localized CTA", () => {
    render(<EtfOverlapPage />);
    expect(
      screen.getByRole("heading", { name: "ETF Overlap & Exposure Calculator" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "VWCE vs IWDA" }));
    expect(screen.getByRole("button", { name: "VWCE vs IWDA" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: /Add 3rd ETF/i }));
    expect(screen.getByLabelText("ETF 3")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Create free account/i })).toHaveAttribute(
      "href",
      "/auth",
    );
    expect(screen.getByRole("link", { name: /Explore broker imports/i })).toHaveAttribute(
      "href",
      "/brokers",
    );
  });
});
