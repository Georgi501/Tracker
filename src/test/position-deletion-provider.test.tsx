import type { ReactNode } from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PortfolioProvider } from "@/lib/PortfolioProvider";
import { quoteCoverage } from "@/lib/data-status";
import { DataStatus } from "@/components/DataStatus";
import { usePortfolio, type State } from "@/lib/store";
const owner = "11111111-1111-4111-8111-111111111111";
const asset = "33333333-3333-4333-8333-333333333333";
const operation = "88888888-8888-4888-8888-888888888888";
const mock = vi.hoisted(() => ({
  rows: {} as Record<string, unknown>,
  pageLimit: 1000,
  pageErrorAt: null as number | null,
  pages: [] as { table: string; from: number; orders: string[] }[],
  snapshot: vi.fn(),
  race: false,
  mutation: vi.fn(),
  quotes: vi.fn(),
  fx: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({ useRouterState: () => "/holdings" }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/history.functions", () => ({ convertImport: vi.fn() }));
vi.mock("@/lib/quotes.functions", () => ({ getQuotes: mock.quotes }));
vi.mock("@/lib/market.functions", () => ({ getExchangeRate: mock.fx }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: async () => ({
        data: { session: { user: { id: "11111111-1111-4111-8111-111111111111" } } },
        error: null,
      }),
    },
    from: (table: string) => {
      let from = 0,
        to = Infinity;
      const orders: string[] = [];
      const query = {
        select: () => query,
        order: (column: string) => {
          orders.push(column);
          return query;
        },
        range: (start: number, end: number) => {
          from = start;
          to = end;
          return query;
        },
        eq: () => query,
        maybeSingle: () => query,
        then: (resolve: (value: unknown) => unknown) => {
          if (mock.race && table === "transactions" && from >= 500) {
            mock.race = false;
            const rows = mock.rows[table] as Record<string, unknown>[];
            mock.rows[table] = [...rows.slice(1), { ...rows[0], id: "tx-9999", quantity: 13 }];
          }
          const value = mock.rows[table] ?? (table === "profiles" ? null : []);
          if (!Array.isArray(value))
            return Promise.resolve({ data: value, error: null, count: null }).then(resolve);
          mock.pages.push({ table, from, orders: [...orders] });
          if (table === "transactions" && mock.pageErrorAt !== null && from >= mock.pageErrorAt)
            return Promise.resolve({
              data: null,
              error: { message: "Second page unavailable" },
              count: null,
            }).then(resolve);
          const sorted = [...value] as Record<string, unknown>[];
          sorted.sort((a, b) => {
            for (const key of orders) {
              const av = String(a[key] ?? ""),
                bv = String(b[key] ?? "");
              if (av !== bv) return av.localeCompare(bv);
            }
            return 0;
          });
          const size = Math.min(mock.pageLimit, to - from + 1);
          return Promise.resolve({
            data: sorted.slice(from, from + size),
            error: null,
            count: sorted.length,
          }).then(resolve);
        },
      };
      return query;
    },
    rpc: async (name: string, args: unknown) =>
      name === "portfolio_snapshot"
        ? mock.snapshot.getMockImplementation()
          ? mock.snapshot()
          : mock.pageErrorAt !== null
            ? { data: null, error: { message: "Snapshot unavailable" } }
            : {
                data: Object.fromEntries(
                  [
                    "assets",
                    "transactions",
                    "brokers",
                    "broker_transfers",
                    "corporate_actions",
                    "asset_valuations",
                  ].map((table) => [table, structuredClone(mock.rows[table] ?? [])]),
                ),
                error: null,
              }
        : name === "is_pro" || name === "is_site_admin"
          ? { data: false, error: null }
          : mock.mutation(name, args),
  },
}));
let current: State;
function Probe() {
  current = usePortfolio();
  return <p data-testid="count">{current.assets.length}</p>;
}
function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <PortfolioProvider>{children}</PortfolioProvider>
    </QueryClientProvider>
  );
}
afterEach(cleanup);
beforeEach(() => {
  localStorage.clear();
  mock.snapshot.mockReset();
  mock.race = false;
  mock.pageLimit = 1000;
  mock.pageErrorAt = null;
  mock.pages = [];
  mock.rows = {
    assets: [
      {
        id: asset,
        symbol: "TEST",
        name: "Test",
        type: "stock",
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
        id: "tx",
        asset_id: asset,
        broker_id: null,
        kind: "buy",
        quantity: 10,
        price: 100,
        fee: 2,
        date: "2025-01-01",
        source_transaction_id: "source-1",
        source_executed_at: "2025-01-01 12:30:00",
      },
    ],
    corporate_actions: [
      { id: "split-1", asset_id: asset, event_date: "2025-02-01", numerator: 2, denominator: 1 },
    ],
    asset_valuations: [
      {
        id: "valuation",
        asset_id: asset,
        valuation_date: "2025-03-01",
        price_usd: 80,
        note: "Appraisal",
      },
    ],
    brokers: [],
    broker_transfers: [],
    profiles: null,
  };
  mock.fx.mockReset().mockResolvedValue({ fx: null });
  mock.quotes.mockReset().mockResolvedValue({ quotes: {}, missing: ["TEST"] });
  mock.mutation.mockReset();
});
async function ready() {
  render(<Probe />, { wrapper: Wrapper });
  await screen.findByTestId("count");
  await waitFor(() => {
    expect(current.user?.id).toBe(owner);
    expect(current.portfolioReady).toBe(true);
    expect(current.dataUpdatedAt).not.toBeNull();
  });
}
it("reconciles actual server state after a committed deletion loses its response", async () => {
  await ready();
  mock.mutation.mockImplementationOnce(async () => {
    mock.rows["assets"] = [];
    mock.rows["transactions"] = [];
    mock.rows["corporate_actions"] = [];
    mock.rows["asset_valuations"] = [];
    throw new Error("Response lost");
  });
  await act(async () => {
    await expect(current.deletePosition(asset, operation)).rejects.toThrow("Response lost");
  });
  expect(screen.getByTestId("count")).toHaveTextContent("0");
  expect(current.transactions).toEqual([]);
  expect(current.corporateActions).toEqual([]);
  expect(current.manualValuations).toEqual([]);
  expect(current.dataError).toBe(false);
  expect(mock.mutation).toHaveBeenCalledWith("delete_position", {
    p_asset_id: asset,
    p_operation_id: operation,
  });
});
it("keeps the whole current position visible after a rolled-back delete", async () => {
  await ready();
  mock.mutation.mockResolvedValueOnce({ data: null, error: { message: "Delete rolled back" } });
  await act(async () => {
    await expect(current.deletePosition(asset, operation)).rejects.toThrow("Delete rolled back");
  });
  expect(screen.getByTestId("count")).toHaveTextContent("1");
  expect(current.transactions).toHaveLength(1);
  expect(current.corporateActions).toHaveLength(1);
  expect(current.manualValuations).toHaveLength(1);
});
it("does not resurrect a deleted asset when a pre-delete quote response arrives late", async () => {
  let resolve!: (value: unknown) => void;
  mock.quotes.mockReturnValueOnce(
    new Promise((yes) => {
      resolve = yes;
    }),
  );
  await ready();
  mock.mutation.mockImplementationOnce(async () => {
    mock.rows["assets"] = [];
    mock.rows["transactions"] = [];
    mock.rows["corporate_actions"] = [];
    mock.rows["asset_valuations"] = [];
    return {
      data: {
        operationId: operation,
        assetId: asset,
        state: "deleted",
        symbol: "TEST",
        expiresAt: "2026-11-14T00:00:00Z",
        serverNow: "2026-11-13T00:00:00Z",
      },
      error: null,
    };
  });
  await act(async () => {
    await current.deletePosition(asset, operation);
  });
  await act(async () =>
    resolve({
      quotes: { TEST: { price: 80, currency: "USD", nativePrice: 80, at: "2026-11-13T00:00:00Z" } },
      missing: [],
    }),
  );
  expect(current.assets).toEqual([]);
  expect(current.transactions).toEqual([]);
});
it("reloads restored splits and valuations and preserves transaction identity fields", async () => {
  await ready();
  mock.mutation.mockResolvedValueOnce({
    data: {
      operationId: operation,
      assetId: asset,
      state: "restored",
      symbol: "TEST",
      expiresAt: "2026-11-14T00:00:00Z",
      serverNow: "2026-11-13T00:00:00Z",
    },
    error: null,
  });
  await act(async () => {
    await current.restorePosition(asset, operation);
  });
  expect(mock.mutation).toHaveBeenCalledWith("restore_position", { p_operation_id: operation });
  expect(current.corporateActions[0]).toMatchObject({
    assetId: asset,
    numerator: 2,
    denominator: 1,
  });
  expect(current.manualValuations[0]).toMatchObject({
    assetId: asset,
    priceUsd: 80,
    note: "Appraisal",
  });
  expect(current.transactions[0]).toMatchObject({
    sourceTransactionId: "source-1",
    sourceExecutedAt: "2025-01-01 12:30:00",
    fee: 2,
  });
});

function transactions(count: number, quantity = 1) {
  return Array.from({ length: count }, (_, i) => ({
    id: `tx-${String(i).padStart(4, "0")}`,
    asset_id: asset,
    broker_id: null,
    kind: "buy",
    quantity,
    price: 100,
    fee: 0,
    date: "2025-01-01",
    created_at: "2025-01-01T12:00:00Z",
  }));
}
it("loads the complete snapshot with identical dates and timestamps", async () => {
  mock.pageLimit = 2;
  const rows = transactions(5);
  mock.rows["transactions"] = rows;
  await ready();
  expect(current.transactions.map((row) => row["id"])).toEqual(rows.map((row) => row["id"]));
  expect(new Set(current.transactions.map((row) => row["id"])).size).toBe(5);
  expect(
    mock.pages.filter((page) => page.table === "transactions").map((page) => page.from),
  ).toEqual([]);
});
it("never marks a failed first snapshot load as a ready partial portfolio", async () => {
  mock.pageLimit = 2;
  mock.pageErrorAt = 2;
  mock.rows["transactions"] = transactions(5);
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  render(<Probe />, { wrapper: Wrapper });
  await waitFor(() => expect(current.dataError).toBe(true));
  expect(current.portfolioReady).toBe(false);
  expect(current.transactions).toEqual([]);
  expect(current.holdings).toEqual([]);
  log.mockRestore();
});
it("keeps the previous complete data when the snapshot fails and supports a full retry", async () => {
  mock.pageLimit = 2;
  mock.rows["transactions"] = transactions(2);
  await ready();
  const previous = current.transactions;
  mock.rows["transactions"] = transactions(5, 9);
  mock.pageErrorAt = 2;
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  await act(async () => current.reload());
  expect(current.dataError).toBe(true);
  expect(current.transactions).toBe(previous);
  expect(current.portfolioReady).toBe(true);
  expect(current.accessReady).toBe(true);
  mock.pageErrorAt = null;
  await act(async () => current.reload());
  expect(current.dataError).toBe(false);
  expect(current.transactions).toHaveLength(5);
  expect(current.transactions.every((row) => row.quantity === 9)).toBe(true);
  log.mockRestore();
});
function seedMarket(count: number) {
  const template = (mock.rows["assets"] as Record<string, unknown>[])[0]!;
  mock.rows["assets"] = Array.from({ length: count }, (_, i) => ({
    ...template,
    id: `asset-${String(i).padStart(4, "0")}`,
    symbol: `T${i}`,
  }));
  mock.rows["transactions"] = Array.from({ length: count }, (_, i) => ({
    ...transactions(1)[0]!,
    id: `tx-${i}`,
    asset_id: `asset-${String(i).padStart(4, "0")}`,
  }));
  mock.rows["corporate_actions"] = [];
  mock.rows["asset_valuations"] = [];
  localStorage.setItem(
    "folio-state-v2",
    JSON.stringify({ currency: "USD", lang: "en", theme: "dark" }),
  );
}
function quoted(items: { symbol: string }[], price = 100, at = new Date().toISOString()) {
  return {
    quotes: Object.fromEntries(
      items.map(({ symbol }) => [
        symbol,
        { price, nativePrice: price, change: 1, currency: "USD", source: "Yahoo Finance", at },
      ]),
    ),
    missing: [],
  };
}
it.each([60, 61])(
  "loads quotes for %i assets without exceeding the 60-item server validator",
  async (count) => {
    seedMarket(count);
    mock.quotes.mockImplementation(async ({ data }: { data: { items: { symbol: string }[] } }) => {
      if (data.items.length > 60) throw new Error("At most 60 quote items allowed");
      return quoted(data.items);
    });
    await ready();
    await waitFor(() => expect(current.pricesLive).toBe(true));
    expect(current.holdings).toHaveLength(count);
    expect(current.holdings.every((holding) => holding.value === 100)).toBe(true);
    expect(mock.quotes.mock.calls.map(([input]) => input.data.items.length)).toEqual(
      count === 60 ? [60] : [60, 1],
    );
  },
);
it.each([0, 1])(
  "keeps successful quote batches when batch %i fails and never values missing quotes as zero",
  async (failed) => {
    seedMarket(61);
    let call = 0;
    mock.quotes.mockImplementation(async ({ data }: { data: { items: { symbol: string }[] } }) => {
      if (call++ === failed) throw new Error("Quote batch offline");
      return quoted(data.items);
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <>
        <Probe />
        <DataStatus />
      </>,
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(current.priceNote).toBe("error"));
    const success = failed === 0 ? 1 : 60;
    expect(current.holdings.filter((holding) => Number.isFinite(holding.value))).toHaveLength(
      success,
    );
    expect(current.holdings.filter((holding) => !Number.isFinite(holding.value))).toHaveLength(
      61 - success,
    );
    expect(current.money(current.holdings.reduce((sum, holding) => sum + holding.value, 0))).toBe(
      "—",
    );
    expect(screen.getByText(/Total value is incomplete/)).toBeInTheDocument();
    log.mockRestore();
  },
);
it("retains real cached quotes after a batch failure and labels old quotes as stale", async () => {
  seedMarket(61);
  mock.quotes.mockImplementation(async ({ data }: { data: { items: { symbol: string }[] } }) => {
    const result = quoted(data.items);
    if (result.quotes["T60"])
      result.quotes["T60"].at = new Date(Date.now() - 5 * 86400000).toISOString();
    return result;
  });
  await ready();
  await waitFor(() => expect(current.pricesLive).toBe(true));
  let call = 0;
  mock.quotes.mockImplementation(async ({ data }: { data: { items: { symbol: string }[] } }) => {
    if (call++ === 1) throw new Error("Second batch offline");
    return quoted(data.items, 200);
  });
  const before = current.assets.find((item) => item.symbol === "T60")!;
  await act(async () => current.reload());
  const retained = current.assets.find((item) => item.symbol === "T60")!;
  expect(retained.price).toBe(before.price);
  expect(retained.quoteAt).toBe(before.quoteAt);
  expect(current.holdings.reduce((sum, holding) => sum + holding.value, 0)).toBe(12100);
  expect(current.priceNote).toBe("error");
  expect(retained.quoteRefreshFailed).toBe(true);
  expect(quoteCoverage([retained]).stale).toBe(1);
});

it("never admits the 1119 mixed history after a same-count delete and append", async () => {
  const rows = transactions(1101);
  rows[0]!.quantity = 7;
  rows[500]!.quantity = 9;
  mock.rows["transactions"] = rows;
  mock.pageLimit = 500;
  mock.race = true;
  await ready();
  expect(current.transactions.reduce((s, t) => s + t.quantity, 0)).toBe(1115);
  expect(current.transactions.map((t) => t.id)).toEqual(rows.map((t) => t.id));
  mock.rows["transactions"] = [...rows.slice(1), { ...rows[0]!, id: "tx-9999", quantity: 13 }];
  await act(async () => current.reload());
  expect(current.transactions.reduce((s, t) => s + t.quantity, 0)).toBe(1121);
  expect(current.transactions.map((t) => t.id)).toEqual(
    (mock.rows["transactions"] as { id: string }[]).map((t) => t.id),
  );
  expect(mock.pages.some((p) => p.table === "transactions")).toBe(false);
});
it("ignores an older snapshot response after a newer reload has completed", async () => {
  await ready();
  const old = structuredClone(mock.rows);
  delete old["profiles"];
  let release!: (value: unknown) => void;
  mock.snapshot.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  let pending!: Promise<void>;
  act(() => {
    pending = current.reload();
  });
  await waitFor(() => expect(mock.snapshot).toHaveBeenCalledTimes(1));
  mock.rows["transactions"] = transactions(3, 9);
  mock.snapshot.mockReset();
  await act(async () => current.reload());
  expect(current.transactions).toHaveLength(3);
  await act(async () => {
    release({ data: old, error: null });
    await pending;
  });
  expect(current.transactions).toHaveLength(3);
  expect(current.transactions.reduce((s, t) => s + t.quantity, 0)).toBe(27);
});
