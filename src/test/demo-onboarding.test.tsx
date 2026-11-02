import { createElement, type ComponentType, type ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/demo";

const state = vi.hoisted(() => ({ signedIn: false }));

vi.mock("@/lib/store", () => ({
  pct: (value: number) => `${value}%`,
  usePortfolio: () => ({
    lang: "en",
    user: state.signedIn ? { id: "test-user" } : null,
    t: (key: string) => key,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({ options }),
  Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => (
    <a className={className} href={to}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);
beforeEach(() => {
  state.signedIn = false;
});

function getDemoPage() {
  const component = Route.options.component;
  if (!isComponent(component)) {
    throw new Error("The demo route does not define a page component.");
  }
  return createElement(component);
}

function isComponent(value: unknown): value is ComponentType {
  return typeof value === "function";
}

describe("sample portfolio onboarding", () => {
  it("invites guests to create an account", () => {
    render(getDemoPage());

    expect(screen.getByRole("link", { name: /create your free portfolio/i })).toHaveAttribute(
      "href",
      "/auth",
    );
  });

  it("takes signed-in users to their holdings instead of sign-in", () => {
    state.signedIn = true;
    render(getDemoPage());

    expect(screen.getByRole("link", { name: /open your portfolio/i })).toHaveAttribute(
      "href",
      "/holdings",
    );
  });
});
