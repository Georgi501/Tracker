import { expect, it } from "vitest";
import {
  filterAndSortMarketAssets,
  marketSearchSchema,
  searchCatalog,
  type MarketAsset,
} from "@/lib/market-search";
it("finds META by ticker without owning it", () => {
  expect(searchCatalog(" meta ")[0]?.symbol).toBe("META");
});
it("finds Netflix by company name", () => {
  expect(searchCatalog("Netflix")[0]?.symbol).toBe("NFLX");
});
it("finds Netflix by ticker", () => {
  expect(searchCatalog("NFLX")[0]?.name).toBe("Netflix Inc.");
});
it("suggests Uber before the name is complete", () => {
  expect(searchCatalog("ub")[0]?.symbol).toBe("UBER");
  expect(searchCatalog("ube")[0]?.symbol).toBe("UBER");
});
it("rejects empty and oversized search input", () => {
  expect(marketSearchSchema.safeParse({ query: " " }).success).toBe(false);
  expect(marketSearchSchema.safeParse({ query: "a".repeat(61) }).success).toBe(false);
});
it("returns no matches for unknown text", () => {
  expect(searchCatalog("does-not-exist")).toEqual([]);
});
it("finds European ETF exchange tickers", () => {
  expect(searchCatalog("SPYL.DE")[0]?.symbol).toBe("SPYL.DE");
  expect(searchCatalog("VWCE.DE")[0]?.symbol).toBe("VWCE.DE");
});
it("finds supported cryptocurrencies by ticker and name", () => {
  expect(searchCatalog("ADA")[0]).toMatchObject({
    symbol: "ADA",
    name: "Cardano",
    type: "crypto",
  });
  expect(searchCatalog("Chainlink")[0]).toMatchObject({
    symbol: "LINK",
    name: "Chainlink",
    type: "crypto",
  });
});
it("filters search results by asset type without changing source order", () => {
  const assets: MarketAsset[] = [
    { symbol: "TSLA", name: "Tesla", type: "stock" },
    { symbol: "BTC", name: "Bitcoin", type: "crypto" },
    { symbol: "VOO", name: "Vanguard ETF", type: "etf" },
  ];
  expect(filterAndSortMarketAssets(assets, "etf", "relevance", "en-US")).toEqual([assets[2]]);
});
it("sorts market results by localized name or ticker", () => {
  const assets: MarketAsset[] = [
    { symbol: "TSLA", name: "Tesla", type: "stock" },
    { symbol: "BTC", name: "Bitcoin", type: "crypto" },
  ];
  expect(filterAndSortMarketAssets(assets, "all", "name", "en-US").map((a) => a.symbol)).toEqual([
    "BTC",
    "TSLA",
  ]);
  expect(filterAndSortMarketAssets(assets, "all", "symbol", "en-US").map((a) => a.symbol)).toEqual([
    "BTC",
    "TSLA",
  ]);
});
