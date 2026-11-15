import type { ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PortfolioProvider } from "@/lib/PortfolioProvider";
import { ProGate } from "@/components/ProFeatures";
import { usePortfolio, type State } from "@/lib/store";

const mock = vi.hoisted(() => ({
  userId: "owner-a",
  authChanged: null as null | ((event: string, session: { user: { id: string } }) => void),
  snapshot: vi.fn(),
  access: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  useRouterState: () => "/holdings",
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/components/AppShell", () => ({
  Card: ({ children }: { children: ReactNode }) => <section>{children}</section>,
}));
vi.mock("@/lib/history.functions", () => ({ convertImport: vi.fn() }));
vi.mock("@/lib/quotes.functions", () => ({ getQuotes: vi.fn() }));
vi.mock("@/lib/market.functions", () => ({ getExchangeRate: async () => ({ fx: null }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (fn: typeof mock.authChanged) => {
        mock.authChanged = fn;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      getSession: async () => ({ data: { session: { user: { id: mock.userId } } }, error: null }),
    },
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        maybeSingle: async () => ({ data: null, error: null }),
      };
      return q;
    },
    rpc: async (name: string, args?: { _user_id: string }) => {
      if (name === "portfolio_snapshot") return mock.snapshot();
      if (name === "is_pro") return mock.access(args?._user_id);
      return { data: false, error: null };
    },
  },
}));

function snapshot(owner = "owner-a", quantity = 2) {
  return {
    data: {
      assets: [
        {
          id: owner,
          user_id: owner,
          symbol: "USD",
          name: owner,
          type: "cash",
          sector: "Other",
          region: "Global",
          manual_price: null,
          dividend_per_share: 0,
          pay_months: [],
          bond_coupon_rate: null,
          bond_maturity_date: null,
          bond_face_value: null,
        },
      ],
      transactions: [
        {
          id: `trade-${owner}`,
          asset_id: owner,
          kind: "buy",
          quantity,
          price: 1,
          fee: 0,
          date: "2025-01-01",
          broker_id: null,
        },
      ],
      brokers: [],
      broker_transfers: [],
      corporate_actions: [],
      asset_valuations: [],
    },
    error: null,
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
let current: State;
function Probe() {
  current = usePortfolio();
  return (
    <>
      <p data-testid="portfolio-value">{current.holdings.reduce((s, h) => s + h.value, 0)}</p>
      {current.dataError && <p role="alert">Portfolio refresh failed</p>}
      <ProGate title="Research" desc="Pro research" preview={<span>Locked preview</span>}>
        <button>Run Pro research</button>
      </ProGate>
    </>
  );
}
async function ready() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PortfolioProvider>
        <Probe />
      </PortfolioProvider>
    </QueryClientProvider>,
  );
  await screen.findByRole("button", { name: "Run Pro research" });
  await waitFor(() => expect(current.portfolioReady).toBe(true));
}
beforeEach(() => {
  localStorage.clear();
  mock.userId = "owner-a";
  mock.snapshot.mockReset().mockResolvedValue(snapshot());
  mock.access.mockReset().mockResolvedValue({ data: true, error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("revokes the visible Pro controls on confirmed Free even when the snapshot fails", async () => {
  await ready();
  const complete = current.transactions;
  mock.access.mockResolvedValue({ data: false, error: null });
  mock.snapshot.mockRejectedValue(new Error("Snapshot offline"));
  await act(async () => current.reload());
  expect(current.transactions).toBe(complete);
  expect(screen.getByTestId("portfolio-value")).toHaveTextContent("2");
  expect(current.accessReady).toBe(true);
  expect(current.isPro).toBe(false);
  expect(screen.getByRole("alert")).toHaveTextContent("Portfolio refresh failed");
  expect(screen.queryByRole("button", { name: "Run Pro research" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /unlock|upgrade/i })).toHaveAttribute("href", "/pricing");
});
it("commits a fresh access decision without waiting for the financial snapshot", async () => {
  await ready();
  const pending = deferred<ReturnType<typeof snapshot>>();
  mock.snapshot.mockReturnValueOnce(pending.promise);
  mock.access.mockResolvedValue({ data: false, error: null });
  let reload!: Promise<void>;
  act(() => {
    reload = current.reload();
  });
  try {
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Run Pro research" })).not.toBeInTheDocument(),
    );
    expect(current.accessReady).toBe(true);
  } finally {
    await act(async () => {
      pending.resolve(snapshot());
      await reload;
    });
  }
});
it("retains valid Pro controls and complete data when only the snapshot fails", async () => {
  await ready();
  const complete = current.transactions;
  mock.snapshot.mockRejectedValue(new Error("Snapshot offline"));
  await act(async () => current.reload());
  expect(current.transactions).toBe(complete);
  expect(current.accessReady).toBe(true);
  expect(screen.getByRole("button", { name: "Run Pro research" })).toBeVisible();
  expect(screen.getByRole("alert")).toBeVisible();
});
it.each(["returned", "thrown", "invalid"])(
  "locks Pro and distinguishes unverified access after a %s access failure, then retries",
  async (mode) => {
    await ready();
    if (mode === "thrown") mock.access.mockRejectedValue(new Error("Access offline"));
    else
      mock.access.mockResolvedValue({
        data: mode === "invalid" ? null : true,
        error: mode === "returned" ? { message: "Access offline" } : null,
      });
    mock.snapshot.mockResolvedValue(snapshot("owner-a", 7));
    await act(async () => current.reload());
    expect(current.portfolioReady).toBe(true);
    expect(current.transactions[0]?.quantity).toBe(7);
    expect(current.accessReady).toBe(false);
    expect(current.isPro).toBe(false);
    expect(screen.queryByRole("button", { name: "Run Pro research" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /unlock|upgrade/i })).not.toBeInTheDocument();
    expect(screen.getByText(/unable to verify access/i)).toBeVisible();
    mock.access.mockResolvedValue({ data: true, error: null });
    fireEvent.click(screen.getByRole("button", { name: /retry access/i }));
    await screen.findByRole("button", { name: "Run Pro research" });
    expect(current.dataError).toBe(false);
    expect(screen.getByTestId("portfolio-value")).toHaveTextContent("7");
  },
);
it.each([false, true])(
  "ignores an old account's delayed access result (failure=%s)",
  async (failed) => {
    await ready();
    const oldAccess = deferred<{ data: boolean; error: { message: string } | null }>();
    const oldSnapshot = deferred<ReturnType<typeof snapshot>>();
    mock.access.mockReturnValueOnce(oldAccess.promise);
    mock.snapshot.mockReturnValueOnce(oldSnapshot.promise);
    let reload!: Promise<void>;
    act(() => {
      reload = current.reload();
    });
    mock.userId = "owner-b";
    mock.access.mockResolvedValue({ data: false, error: null });
    mock.snapshot.mockResolvedValue(snapshot("owner-b", 11));
    await act(async () => {
      mock.authChanged?.("SIGNED_IN", { user: { id: "owner-b" } });
    });
    await waitFor(() => expect(current.transactions[0]?.assetId).toBe("owner-b"));
    await act(async () => {
      oldAccess.resolve({ data: true, error: failed ? { message: "Old access failed" } : null });
      oldSnapshot.resolve(snapshot());
      await reload;
    });
    expect(current.user?.id).toBe("owner-b");
    expect(current.accessReady).toBe(true);
    expect(current.isPro).toBe(false);
    expect(current.dataError).toBe(false);
    expect(screen.getByTestId("portfolio-value")).toHaveTextContent("11");
    expect(screen.queryByRole("button", { name: "Run Pro research" })).not.toBeInTheDocument();
  },
);
