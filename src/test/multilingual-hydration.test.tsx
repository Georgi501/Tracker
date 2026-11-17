import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PortfolioProvider } from "@/lib/PortfolioProvider";
import { dictionaries, type Lang } from "@/lib/i18n";
import { usePortfolio } from "@/lib/store";

const mock = vi.hoisted(() => ({
  pathname: "/",
  search: {} as Record<string, unknown>,
}));

vi.mock("@tanstack/react-router", () => ({
  useRouterState: ({
    select,
  }: {
    select: (state: { location: { pathname: string; search: Record<string, unknown> } }) => unknown;
  }) => select({ location: { pathname: mock.pathname, search: mock.search } }),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/history.functions", () => ({ convertImport: vi.fn() }));
vi.mock("@/lib/quotes.functions", () => ({ getQuotes: vi.fn() }));
vi.mock("@/lib/market.functions", () => ({ getExchangeRate: async () => ({ fx: null }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: async () => ({ data: { session: null }, error: null }),
    },
  },
}));

function Probe() {
  const p = usePortfolio();
  return (
    <div>
      <span data-testid="lang">{p.lang}</span>
      <span data-testid="nav-label">{p.t("dashboard")}</span>
    </div>
  );
}

function renderWithRouterState() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <PortfolioProvider>
        <Probe />
      </PortfolioProvider>
    </QueryClientProvider>,
  );
}

describe("multilingual hydration and URL ?lang= precedence", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "en";
    mock.pathname = "/";
    mock.search = {};
  });

  afterEach(() => {
    cleanup();
  });

  it.each(["en", "bg", "de", "es", "it"] as Lang[])(
    "preserves explicit ?lang=%s over previously saved localStorage preference",
    async (targetLang) => {
      const savedLang: Lang = targetLang === "en" ? "bg" : "en";
      localStorage.setItem(
        "folio-state-v2",
        JSON.stringify({ lang: savedLang, currency: "EUR", theme: "dark" }),
      );
      mock.search = { lang: targetLang };

      renderWithRouterState();

      await waitFor(() => {
        expect(screen.getByTestId("lang").textContent).toBe(targetLang);
      });
      expect(document.documentElement.lang).toBe(targetLang);
      expect(screen.getByTestId("nav-label").textContent).toBe(dictionaries[targetLang].dashboard);
    },
  );

  it("falls back to localStorage preference when ?lang= is invalid or absent", async () => {
    localStorage.setItem(
      "folio-state-v2",
      JSON.stringify({ lang: "de", currency: "EUR", theme: "dark" }),
    );
    mock.search = { lang: "fr" };

    renderWithRouterState();

    await waitFor(() => {
      expect(screen.getByTestId("lang").textContent).toBe("de");
    });
    expect(document.documentElement.lang).toBe("de");
    expect(screen.getByTestId("nav-label").textContent).toBe(dictionaries.de.dashboard);
  });

  it("defaults to en when neither ?lang= nor localStorage preference exists", async () => {
    mock.search = {};

    renderWithRouterState();

    await waitFor(() => {
      expect(screen.getByTestId("lang").textContent).toBe("en");
    });
    expect(document.documentElement.lang).toBe("en");
  });

  it("updates language when navigating to a route with a new ?lang= param", async () => {
    mock.search = { lang: "bg" };
    const { rerender } = renderWithRouterState();

    await waitFor(() => {
      expect(document.documentElement.lang).toBe("bg");
    });

    mock.pathname = "/demo";
    mock.search = { lang: "it" };
    const queryClient = new QueryClient();
    rerender(
      <QueryClientProvider client={queryClient}>
        <PortfolioProvider>
          <Probe />
        </PortfolioProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("lang").textContent).toBe("it");
    });
    expect(document.documentElement.lang).toBe("it");
    expect(screen.getByTestId("nav-label").textContent).toBe(dictionaries.it.dashboard);
  });
});
