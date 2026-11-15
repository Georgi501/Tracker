import { beforeEach, expect, it, vi } from "vitest";
import { getQuotes } from "@/lib/quotes.functions";
import { fetchPortfolioQuoteBatches } from "@/lib/quote-batches";
const provider = vi.hoisted(() => ({ quote: vi.fn() }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate: (input: unknown) => unknown = (input) => input;
    const builder = {
      middleware: () => builder,
      validator: (fn: typeof validate) => {
        validate = fn;
        return builder;
      },
      handler: (fn: (input: { data: unknown }) => unknown) => (input: { data: unknown }) =>
        fn({ data: validate(input.data) }),
    };
    return builder;
  },
}));
vi.mock("@/lib/prices.server", () => ({
  fetchLiveQuote: provider.quote,
  fetchFx: async () => null,
  fetchCryptoQuotes: async () => ({}),
}));
const items = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ symbol: `T${i}`, type: "stock" }));
beforeEach(() => {
  provider.quote.mockReset();
  provider.quote.mockResolvedValue({
    price: 100,
    change: 1,
    at: new Date().toISOString(),
    currency: "USD",
    source: "Yahoo Finance",
  });
});
it("reproduces the real server validator rejecting one request for 61 assets", () => {
  expect(() => getQuotes({ data: { items: items(61) } })).toThrow();
  expect(provider.quote).not.toHaveBeenCalled();
});
it.each([60, 61])("fetches %i assets through the real 60-item server validator", async (count) => {
  const result = await fetchPortfolioQuoteBatches(items(count), getQuotes);
  expect(Object.keys(result.quotes)).toHaveLength(count);
  expect(result.missing).toEqual([]);
  expect(result.failed).toBe(false);
});
it("does not accept a zero or invalid quote as a valuation", async () => {
  const quote = {
    price: 0,
    nativePrice: 0,
    change: 0,
    at: new Date().toISOString(),
    currency: "USD",
    source: "Yahoo Finance",
  };
  const result = await fetchPortfolioQuoteBatches(items(1), async () => ({
    quotes: { T0: quote },
    missing: [],
  }));
  expect(result.quotes).toEqual({});
  expect(result.missing).toEqual(["T0"]);
});
