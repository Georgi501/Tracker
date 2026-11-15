import { QueryClient } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
import { getPortfolioHistory } from "@/lib/history.functions";
import { buildPortfolioHistory } from "@/lib/history";
import { dailyHistory } from "@/lib/history.server";
const state = vi.hoisted(() => ({ fail: false }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/history", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/history")>();
  return { ...actual, buildPortfolioHistory: vi.fn(actual.buildPortfolioHistory) };
});
vi.mock("@/lib/history.server", () => ({
  dailyHistory: vi.fn(async () => ({ prices: [], currency: "USD", splits: [] })),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate: (input: unknown) => unknown = (input) => input;
    const client = {
      rpc: async () => ({
        error: state.fail ? { message: "Snapshot unavailable" } : null,
        data: state.fail
          ? null
          : {
              assets: [{ id: "asset", symbol: "USD", type: "cash" }],
              transactions: Array.from({ length: 1101 }, (_, i) => ({
                id: "tx-" + i,
                asset_id: "asset",
                kind: "buy",
                quantity: 1,
                price: 1,
                fee: 0,
                date: "2025-01-01",
                created_at: "2025-01-01T12:00:00Z",
              })),
              brokers: [],
              broker_transfers: [],
              corporate_actions: [],
              asset_valuations: [],
            },
      }),
    };
    const builder = {
      middleware: () => builder,
      validator: (fn: typeof validate) => {
        validate = fn;
        return builder;
      },
      handler:
        (fn: (input: { data: unknown; context: { supabase: typeof client } }) => unknown) =>
        (input: { data: unknown }) =>
          fn({ data: validate(input.data), context: { supabase: client } }),
    };
    return builder;
  },
}));
beforeEach(() => {
  state.fail = false;
  vi.clearAllMocks();
});
it("passes all 1101 snapshot trades into the actual history calculation", async () => {
  const result = await getPortfolioHistory({ data: { period: "ALL", currency: "USD" } });
  const txs = vi.mocked(buildPortfolioHistory).mock.calls[0]![1];
  expect(txs.map((tx) => tx.id)).toEqual(Array.from({ length: 1101 }, (_, i) => `tx-${i}`));
  expect(new Set(txs.map((tx) => tx.id)).size).toBe(1101);
  expect(result.unavailable).toBe(false);
  expect(result.points.at(-1)?.v).toBe(1101);
});
it("rejects snapshot errors before any provider data or financial calculations are used", async () => {
  state.fail = true;
  await expect(getPortfolioHistory({ data: { period: "ALL", currency: "USD" } })).rejects.toThrow(
    "Snapshot unavailable",
  );
  expect(buildPortfolioHistory).not.toHaveBeenCalled();
  expect(dailyHistory).not.toHaveBeenCalled();
});

it("keeps the previous complete history in the query cache when snapshot fails during refresh", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const options = {
    queryKey: ["portfolio-history", "owner", "ALL", "USD"],
    queryFn: () => getPortfolioHistory({ data: { period: "ALL", currency: "USD" } }),
    staleTime: 0,
  };
  const complete = await client.fetchQuery(options);
  state.fail = true;
  await expect(client.fetchQuery(options)).rejects.toThrow("Snapshot unavailable");
  expect(client.getQueryData(options.queryKey)).toBe(complete);
  expect(buildPortfolioHistory).toHaveBeenCalledTimes(1);
  client.clear();
});
