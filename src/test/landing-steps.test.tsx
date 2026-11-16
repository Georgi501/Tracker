import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LandingSteps } from "@/components/LandingSections";
import { languages, type Lang } from "@/lib/i18n";

const state = vi.hoisted(() => ({ lang: "bg" as Lang }));

vi.mock("@/lib/store", () => ({
  usePortfolio: () => ({ lang: state.lang }),
}));

vi.mock("@/components/AppShell", () => ({
  Card: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

describe("landing steps", () => {
  it.each([
    ["bg", "Започни в три стъпки", /CSV от брокер е безплатен/],
    ["en", "Get started in three steps", /Broker CSV imports are free/],
  ] as const)(
    "highlights free CSV import and 3 step cards in %s",
    (lang, title, freeImportText) => {
      state.lang = lang;
      render(<LandingSteps />);

      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
      expect(screen.getByText(freeImportText)).toBeInTheDocument();
      expect(screen.getAllByRole("listitem")).toHaveLength(3);
    },
  );

  it.each(languages)(
    "renders tactile guide pills and interactive step links across all destinations in $name",
    ({ code }) => {
      state.lang = code;
      render(<LandingSteps />);

      const links = screen.getAllByRole("link");
      expect(links.map((link) => link.getAttribute("href"))).toEqual([
        "/trading212-import",
        "/ibkr-import",
        "/revolut-import",
        "/import-demo",
        "/demo",
        "/etf-overlap",
      ]);
      const guideLinks = links.slice(0, 3);
      for (const link of guideLinks) {
        expect(link.className).toContain("min-h-10");
        expect(link.className).toContain("rounded-full");
      }
      const stepLinks = links.slice(3);
      for (const link of stepLinks) {
        expect(link.className).toContain("focus-visible:ring-2");
        expect(link.className).toContain("hover:border-primary/50");
      }
    },
  );
});
