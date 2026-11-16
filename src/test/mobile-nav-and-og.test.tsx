import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MobileBottomNavigation } from "@/components/MobileBottomNavigation";
import { languages } from "@/lib/i18n";
import { isMobileNavRouteActive } from "@/lib/mobile-nav";
import { handleOgRequest } from "@/routes/api/og";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: unknown) => opts,
  Link: ({
    to,
    children,
    className,
    ...rest
  }: {
    to: string;
    children: ReactNode;
    className?: string;
    "aria-current"?: "page" | undefined;
  }) => (
    <a href={to} className={className} aria-current={rest["aria-current"]}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

describe("Dynamic Edge Open Graph route (/api/og)", () => {
  it("renders an escaped SVG asset card with caching headers", async () => {
    const res = handleOgRequest(
      new Request(
        "https://capispot.com/api/og?type=asset&symbol=AAPL&name=Apple%20%3Cscript%3E&sector=Tech%20%26%20AI",
      ),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml; charset=utf-8");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=3600, s-maxage=86400");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");

    const svg = await res.text();
    expect(svg).toContain("<svg");
    expect(svg).toContain("AAPL");
    expect(svg).toContain("Apple &lt;script&gt;");
    expect(svg).toContain("Tech &amp; AI");
    expect(svg).not.toContain("<script>");
  });

  it("falls back to clean defaults when asset parameters are omitted", async () => {
    const res = handleOgRequest(new Request("https://capispot.com/api/og?type=asset"));
    const svg = await res.text();
    expect(svg).toContain("CAPISPOT");
    expect(svg).toContain("Verified Market &amp; Financial Overview");
    expect(svg).toContain("Equities &amp; ETFs");
  });

  it("renders a privacy-safe snapshot allocation card with normalized percentages only", async () => {
    const res = handleOgRequest(
      new Request("https://capispot.com/api/og?type=snapshot&weights=stock:60,etf:30,cash:10"),
    );
    const svg = await res.text();
    expect(svg).toContain("Portfolio Allocation Snapshot");
    expect(svg).toContain("Stocks");
    expect(svg).toContain("60%");
    expect(svg).toContain("ETFs");
    expect(svg).toContain("30%");
    expect(svg).toContain("Cash");
    expect(svg).toContain("10%");
    expect(svg).toContain("Percentages only");
  });
});

describe("Mobile standalone bottom navigation", () => {
  it.each(languages)(
    "renders all 5 primary routes with >= 44px touch targets in $name",
    ({ code }) => {
      render(<MobileBottomNavigation lang={code} pathname="/holdings" label="Quick navigation" />);
      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(5);
      expect(links.map((el) => el.getAttribute("href"))).toEqual([
        "/",
        "/holdings",
        "/analytics",
        "/markets",
        "/advisor",
      ]);
      for (const link of links) {
        expect(link.className).toContain("min-h-11");
      }
      expect(links[1]).toHaveAttribute("aria-current", "page");
      expect(links[0]).not.toHaveAttribute("aria-current");
    },
  );

  it("marks Markets active on /asset/$symbol detail pages and Dashboard active only on /", () => {
    expect(isMobileNavRouteActive("/", "/")).toBe(true);
    expect(isMobileNavRouteActive("/holdings", "/")).toBe(false);
    expect(isMobileNavRouteActive("/asset/NVDA", "/markets")).toBe(true);
    expect(isMobileNavRouteActive("/advisor/thread-1", "/advisor")).toBe(true);
  });
});
