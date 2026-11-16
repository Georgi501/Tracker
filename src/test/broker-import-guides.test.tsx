import { createElement, type ComponentType, type ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Lang } from "@/lib/i18n";
import { Route as BrokersRoute } from "@/routes/brokers";
import { Route as IbkrRoute } from "@/routes/ibkr-import";
import { Route as RevolutRoute } from "@/routes/revolut-import";
import { Route as Trading212Route } from "@/routes/trading212-import";

const state = vi.hoisted(() => ({
  lang: "en" as Lang,
}));

vi.mock("@/lib/store", () => ({
  usePortfolio: () => ({
    lang: state.lang,
    user: null,
    t: (key: string) => key,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({
    options,
    useSearch: () => ({}),
  }),
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

function renderRouteComponent(route: { options: { component?: unknown } }) {
  const component = route.options.component;
  if (typeof component !== "function") {
    throw new Error("Route component is missing");
  }
  return render(createElement(component as ComponentType));
}

describe("Broker search validation and import guides", () => {
  it("validates ?broker= on /brokers for trading212, ibkr, revolut, and generic", () => {
    const validate = (
      BrokersRoute as unknown as { options: { validateSearch: (s: unknown) => unknown } }
    ).options.validateSearch;
    expect(validate({ broker: "trading212" })).toEqual({ broker: "trading212" });
    expect(validate({ broker: "ibkr" })).toEqual({ broker: "ibkr" });
    expect(validate({ broker: "revolut" })).toEqual({ broker: "revolut" });
    expect(validate({ broker: "generic" })).toEqual({ broker: "generic" });
    expect(validate({ broker: "invalid" })).toEqual({ broker: undefined });
  });

  it.each([
    [
      "Trading 212",
      Trading212Route,
      "/trading212-import",
      "/import-demo?broker=trading212",
      "/brokers?broker=trading212",
    ],
    ["IBKR", IbkrRoute, "/ibkr-import", "/import-demo?broker=ibkr", "/brokers?broker=ibkr"],
    [
      "Revolut",
      RevolutRoute,
      "/revolut-import",
      "/import-demo?broker=revolut",
      "/brokers?broker=revolut",
    ],
  ] as const)(
    "%s import guide emits canonical link, Article + FAQPage JSON-LD, and preserves ?broker= CTAs",
    (_name, route, path, expectedSampleHref, expectedBrokersHref) => {
      state.lang = "en";
      const head = (
        route as unknown as {
          options: {
            head: () => {
              links?: { rel: string; href: string }[];
              scripts?: { type: string; children: string }[];
            };
          };
        }
      ).options.head();

      expect(head.links).toContainEqual({
        rel: "canonical",
        href: `https://capispot.com${path}`,
      });
      const scriptPayloads = (head.scripts ?? []).map(
        (s) => JSON.parse(s.children) as { "@type": string; mainEntity?: unknown[] },
      );
      expect(scriptPayloads.some((p) => p["@type"] === "Article")).toBe(true);
      const faq = scriptPayloads.find((p) => p["@type"] === "FAQPage");
      expect(faq).toBeDefined();
      expect((faq?.mainEntity ?? []).length).toBeGreaterThanOrEqual(3);

      renderRouteComponent(route as unknown as { options: { component?: unknown } });
      const links = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
      expect(links).toContain(expectedSampleHref);
      expect(links).toContain(expectedBrokersHref);
    },
  );

  it.each(["en", "bg", "de", "es", "it"] as const)(
    "renders /ibkr-import and /revolut-import in %s with Flex/CSV guidance",
    (lang) => {
      state.lang = lang;
      const { unmount } = renderRouteComponent(
        IbkrRoute as unknown as { options: { component?: unknown } },
      );
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/IBKR/);
      expect(screen.getAllByText(/Flex/i).length).toBeGreaterThan(0);
      unmount();

      renderRouteComponent(RevolutRoute as unknown as { options: { component?: unknown } });
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Revolut/);
    },
  );
});
