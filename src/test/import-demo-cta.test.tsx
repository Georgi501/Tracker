import { createElement, type ComponentType, type ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { safeAuthContinuation } from "@/lib/auth-i18n";
import { Route } from "@/routes/import-demo";

const state = vi.hoisted(() => ({
  lang: "en",
  signedIn: false,
  broker: "generic" as string | undefined,
}));

vi.mock("@/lib/store", () => ({
  usePortfolio: () => ({
    lang: state.lang,
    user: state.signedIn ? { id: "test-user" } : null,
    t: (key: string) => (key === "signUp" ? "Create account" : key),
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({
    options,
    useSearch: () => ({ broker: state.broker }),
  }),
  useNavigate: () => vi.fn(),
  Link: ({
    children,
    to,
    search,
    className,
  }: {
    children: ReactNode;
    to: string;
    search?: Record<string, string | undefined>;
    className?: string;
  }) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(search ?? {})) {
      if (value !== undefined) params.set(key, value);
    }
    return (
      <a className={className} href={`${to}${params.size ? `?${params}` : ""}`}>
        {children}
      </a>
    );
  },
}));

afterEach(cleanup);
beforeEach(() => {
  state.lang = "en";
  state.signedIn = false;
  state.broker = "generic";
});

function getImportDemoPage() {
  const component = Route.options.component;
  if (typeof component !== "function") {
    throw new Error("The import demo route does not define a page component.");
  }
  return createElement(component as ComponentType);
}

describe("CSV demo calls to action", () => {
  it.each([
    ["en", "See an example portfolio"],
    ["bg", "Виж примерно портфолио"],
    ["de", "Beispielportfolio ansehen"],
    ["es", "Ver una cartera de ejemplo"],
    ["it", "Vedi un portafoglio di esempio"],
  ])("links to the sample portfolio in %s", (lang, label) => {
    state.lang = lang;
    render(getImportDemoPage());

    expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", "/demo");
  });

  it("keeps the signup CTA linked to the existing generic CSV flow", () => {
    render(getImportDemoPage());

    expect(
      screen.getByRole("link", { name: "Create account · Import your own CSV" }),
    ).toHaveAttribute("href", "/auth?mode=signup&next=%2Fbrokers");
  });

  it("keeps signed-in users on the broker import page", () => {
    state.signedIn = true;
    render(getImportDemoPage());

    expect(screen.getByRole("link", { name: "Import your own CSV" })).toHaveAttribute(
      "href",
      "/brokers",
    );
  });

  it.each(["trading212", "ibkr", "revolut"] as const)(
    "preserves ?broker=%s in both signup and signed-in CTAs",
    (broker) => {
      state.broker = broker;
      state.signedIn = false;
      const { unmount } = render(getImportDemoPage());
      expect(
        screen.getByRole("link", { name: "Create account · Import your own CSV" }),
      ).toHaveAttribute("href", `/auth?mode=signup&next=%2Fbrokers%3Fbroker%3D${broker}`);
      unmount();

      state.signedIn = true;
      render(getImportDemoPage());
      expect(screen.getByRole("link", { name: "Import your own CSV" })).toHaveAttribute(
        "href",
        `/brokers?broker=${broker}`,
      );
    },
  );

  it("preserves valid ?broker= search parameters in safeAuthContinuation", () => {
    expect(safeAuthContinuation("/brokers")).toBe("/brokers");
    expect(safeAuthContinuation("/brokers?broker=trading212")).toBe("/brokers?broker=trading212");
    expect(safeAuthContinuation("/brokers?broker=ibkr")).toBe("/brokers?broker=ibkr");
    expect(safeAuthContinuation("/brokers?broker=revolut")).toBe("/brokers?broker=revolut");
    expect(safeAuthContinuation("/brokers?broker=generic")).toBe("/brokers?broker=generic");
    expect(safeAuthContinuation("/brokers?broker=unknown")).toBeNull();
    expect(safeAuthContinuation("/brokers?broker=ibkr&extra=1")).toBeNull();
  });
});
