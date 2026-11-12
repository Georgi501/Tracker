import { Route } from "@/routes/demo";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  cloneElement,
  createElement,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({
      children,
    }: {
      children: ReactElement<{ width?: number; height?: number }>;
    }) => cloneElement(children, { width: 480, height: 208 }),
  };
});

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

    expect(screen.getByRole("link", { name: /inspect performance/i })).toHaveAttribute(
      "href",
      "#demo-performance",
    );
  });

  it("calculates cost basis and gain from the same sample holdings", () => {
    render(getDemoPage());

    fireEvent.click(screen.getByRole("button", { name: "Show detailed metrics" }));
    expect(screen.getByText("$3,315")).toBeInTheDocument();

    const microsoft = screen.getByRole("row", { name: /MSFT/ });
    expect(microsoft).toHaveTextContent("$290.00");
    expect(microsoft).toHaveTextContent("$960.00");
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
