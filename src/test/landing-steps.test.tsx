import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LandingSteps } from "@/components/LandingSections";

const state = vi.hoisted(() => ({ lang: "bg" }));

vi.mock("@/lib/store", () => ({
  usePortfolio: () => ({ lang: state.lang }),
}));

vi.mock("@/components/AppShell", () => ({
  Card: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

afterEach(cleanup);

describe("landing steps", () => {
  it.each([
    ["bg", "Започни в три стъпки", /CSV от брокер е безплатен/],
    ["en", "Get started in three steps", /Broker CSV imports are free/],
  ])("highlights free CSV import in %s", (lang, title, freeImportText) => {
    state.lang = lang;
    render(<LandingSteps />);

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.getByText(freeImportText)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});
