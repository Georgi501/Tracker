import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProGate } from "@/components/ProFeatures";

const state = vi.hoisted(() => ({ isPro: false }));

vi.mock("@/lib/store", () => ({
  pct: (value: number) => `${value}%`,
  usePortfolio: () => ({ lang: "en", isPro: state.isPro }),
}));

vi.mock("@/components/AppShell", () => ({
  Card: ({ children, className }: { children: ReactNode; className?: string }) => (
    <section className={className}>{children}</section>
  ),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    hash,
    className,
  }: {
    children: ReactNode;
    to: string;
    hash?: string;
    className?: string;
  }) => (
    <a className={className} href={`${to}${hash ? `#${hash}` : ""}`}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);
beforeEach(() => {
  state.isPro = false;
});

function renderGate(unlocked = false) {
  return render(
    <ProGate
      title="Advanced analysis"
      desc="A Pro feature description"
      preview={<div>Abstract preview</div>}
      unlocked={unlocked}
    >
      <p>Private portfolio metrics</p>
    </ProGate>,
  );
}

describe("Pro feature access by account tier", () => {
  it.each(["guest", "free"])("%s users see the locked preview, not Pro content", () => {
    renderGate();

    expect(screen.getByText("Abstract preview")).toBeInTheDocument();
    expect(screen.queryByText("Private portfolio metrics")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Unlock with Pro" })).toHaveAttribute(
      "href",
      "/pricing#plan-comparison",
    );
  });

  it("Pro users see the feature content instead of the upgrade gate", () => {
    state.isPro = true;
    renderGate();

    expect(screen.getByText("Private portfolio metrics")).toBeInTheDocument();
    expect(screen.queryByText("Abstract preview")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Unlock with Pro" })).not.toBeInTheDocument();
  });

  it("shows feature content when access is explicitly unlocked", () => {
    renderGate(true);

    expect(screen.getByText("Private portfolio metrics")).toBeInTheDocument();
    expect(screen.queryByText("Abstract preview")).not.toBeInTheDocument();
    expect(screen.queryByText("PRO")).not.toBeInTheDocument();
  });
});
