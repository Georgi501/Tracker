import { beforeEach, expect, it, vi } from "vitest";
import { searchMarket } from "@/lib/market.functions";
const { search } = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock("@/lib/prices.server", () => ({ yahooClient: () => ({ search }) }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let parse: (input: unknown) => unknown = (input) => input;
    const builder = {
      validator: (fn: typeof parse) => {
        parse = fn;
        return builder;
      },
      handler: (fn: (args: { data: unknown }) => unknown) => (input: { data: unknown }) =>
        fn({ data: parse(input.data) }),
    };
    return builder;
  },
}));
beforeEach(() => {
  search.mockReset().mockResolvedValue({ quotes: [], news: [] });
});
it("skips unused news for Command Palette requests", async () => {
  const result = await searchMarket({ data: { query: "NVDA", includeNews: false } });
  expect(search).toHaveBeenCalledWith("NVDA", { newsCount: 0 });
  expect(result.assets.some((asset) => asset.symbol === "NVDA")).toBe(true);
  expect(result.unavailable).toBe(false);
});
it("keeps news enabled for the existing markets and header search", async () => {
  await searchMarket({ data: { query: "NVDA" } });
  expect(search).toHaveBeenCalledWith("NVDA", { newsCount: 8 });
});
