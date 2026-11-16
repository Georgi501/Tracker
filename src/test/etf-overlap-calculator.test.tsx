import { compareEtfProfiles, resolveEtfExposureProfile } from "@/lib/etf-overlap";
import { EtfOverlapPage, resolveInitialEtfPair } from "@/routes/etf-overlap";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/store", () => ({
  usePortfolio: () => ({ lang: "en" }),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: unknown) => opts,
  Link: ({
    to,
    search,
    onClick,
    children,
    className,
    ...rest
  }: {
    to: string;
    search?: Record<string, string>;
    onClick?: () => void;
    children: React.ReactNode;
    className?: string;
    "aria-current"?: "page";
  }) => {
    const query = search ? `?${new URLSearchParams(search).toString()}` : "";
    return (
      <a
        href={`${to}${query}`}
        className={className}
        onClick={(e) => {
          e.preventDefault();
          onClick?.();
        }}
        {...rest}
      >
        {children}
      </a>
    );
  },
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

    const vwcePreset = screen.getByRole("link", { name: "VWCE vs IWDA" });
    expect(vwcePreset).toHaveAttribute("href", "/etf-overlap?etfs=VWCE%2CIWDA");
    fireEvent.click(vwcePreset);
    expect(vwcePreset).toHaveAttribute("aria-current", "page");

    fireEvent.click(screen.getByRole("button", { name: /Add 3rd ETF/i }));
    expect(screen.getByLabelText("ETF 3")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Create free account/i })).toHaveAttribute(
      "href",
      "/auth?mode=signup",
    );
    expect(screen.getByRole("link", { name: /Explore broker imports/i })).toHaveAttribute(
      "href",
      "/brokers",
    );
  });

  it("pre-selects a supported ?etf=<SYMBOL> alongside a non-duplicate comparison ETF", () => {
    expect(resolveInitialEtfPair("vwce")).toEqual(["VWCE", "IWDA"]);
    expect(resolveInitialEtfPair("VOO")).toEqual(["VOO", "QQQ"]);
    expect(resolveInitialEtfPair("CSPX")).toEqual(["CSPX", "VOO"]);
    expect(resolveInitialEtfPair("UNKNOWN")).toEqual(["VOO", "QQQ"]);

    expect(resolveEtfExposureProfile("VWCE")?.symbol).toBe("VWCE");
    expect(resolveEtfExposureProfile("AAPL")).toBeNull();

    render(<EtfOverlapPage initialEtf="VWCE" />);
    expect((screen.getByLabelText("ETF 1") as HTMLSelectElement).value).toBe("VWCE");
    expect((screen.getByLabelText("ETF 2") as HTMLSelectElement).value).toBe("IWDA");
  });

  it("supports ?etfs=2-3 comma-separated ETFs for crawlable comparison pairs", () => {
    expect(resolveInitialEtfPair(undefined, "VOO,VWCE,QQQ")).toEqual(["VOO", "VWCE", "QQQ"]);
    expect(resolveInitialEtfPair(undefined, "cspx,iwda,INVALID")).toEqual(["CSPX", "IWDA"]);

    render(<EtfOverlapPage initialEtfs="VOO,VWCE,QQQ" />);
    expect((screen.getByLabelText("ETF 1") as HTMLSelectElement).value).toBe("VOO");
    expect((screen.getByLabelText("ETF 2") as HTMLSelectElement).value).toBe("VWCE");
    expect((screen.getByLabelText("ETF 3") as HTMLSelectElement).value).toBe("QQQ");
  });
});
