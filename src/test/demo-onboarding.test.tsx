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

  it("shows a registration-free demo CTA on the first screen", () => {
    render(getDemoPage());

    expect(screen.getByRole("link", { name: /try the demo without an account/i })).toHaveAttribute(
      "href",
      "/demo#portfolio-preview",
    );
  });

  it("calculates cost basis and gain from the same sample holdings", () => {
    render(getDemoPage());

    expect(screen.getByText("Sample cost basis")).toBeInTheDocument();
    expect(screen.getByText("$13,670")).toBeInTheDocument();
    expect(screen.getByText("+$3,315")).toBeInTheDocument();
    expect(screen.getByText("+24.3%")).toBeInTheDocument();

    const microsoft = screen.getByRole("row", { name: /MSFT/ });
    expect(microsoft).toHaveTextContent("$290");
    expect(microsoft).toHaveTextContent("$960");
    expect(microsoft).toHaveTextContent("+41.4%");
  });

  it("shows sample portfolio history and dividends before Pro previews", () => {
    render(getDemoPage());

    const history = screen.getByRole("heading", { name: "Portfolio value over time" });
    const dividends = screen.getByRole("heading", { name: "Example dividends" });
    const proPreview = screen.getByRole("heading", { name: "Explore the Pro preview" });
    expect(
      history.compareDocumentPosition(proPreview) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      dividends.compareDocumentPosition(proPreview) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
