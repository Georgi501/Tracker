import { afterEach, expect, it, vi } from "vitest";
import { fetchCryptoQuotes } from "@/lib/prices.server";

const { yahooChart } = vi.hoisted(() => ({ yahooChart: vi.fn() }));
vi.mock("yahoo-finance2", () => ({
  default: class {
    chart = yahooChart;
  },
}));

afterEach(() => {
  vi.unstubAllGlobals();
  yahooChart.mockReset();
});

it("fetches multiple current crypto quotes from Yahoo Finance", async () => {
  const updatedAt = new Date();
  yahooChart.mockImplementation(async (symbol: string) => ({
    meta: {
      regularMarketPrice: symbol === "BTC-USD" ? 65000 : 3200,
      regularMarketTime: updatedAt,
      currency: "USD",
      previousClose: symbol === "BTC-USD" ? 64000 : 3216,
    },
    quotes: [],
  }));

  const quotes = await fetchCryptoQuotes(["btc", "ETH", "BTC"]);

  expect(yahooChart).toHaveBeenCalledTimes(2);
  expect(yahooChart).toHaveBeenCalledWith("BTC-USD", expect.objectContaining({ interval: "1d" }));
  expect(yahooChart).toHaveBeenCalledWith("ETH-USD", expect.objectContaining({ interval: "1d" }));
  expect(quotes["BTC"]).toMatchObject({
    price: 65000,
    currency: "USD",
    source: "Yahoo Finance",
  });
  expect(quotes["ETH"]).toMatchObject({ price: 3200, currency: "USD", source: "Yahoo Finance" });
  expect(quotes["ETH"]?.change).toBeCloseTo(-0.5);
});

it("does not return stale Yahoo Finance crypto prices", async () => {
  yahooChart.mockResolvedValue({
    meta: {
      regularMarketPrice: 0.12,
      regularMarketTime: new Date(Date.now() - 16 * 60_000),
      currency: "USD",
      previousClose: 0.11,
    },
    quotes: [],
  });

  expect(await fetchCryptoQuotes(["KAS"])).toEqual({});
});

it("does not request unlisted cryptocurrency symbols from Yahoo Finance", async () => {
  expect(await fetchCryptoQuotes(["NOTACOIN"])).toEqual({});
  expect(yahooChart).not.toHaveBeenCalled();
});
