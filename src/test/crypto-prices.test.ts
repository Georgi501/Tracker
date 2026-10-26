import { afterEach, expect, it, vi } from "vitest";
import { fetchCryptoQuotes } from "@/lib/prices.server";

afterEach(() => {
  vi.unstubAllGlobals();
});

it("fetches multiple live crypto quotes from CoinGecko in one request", async () => {
  const updatedAt = Math.floor(Date.now() / 1000) - 60;
  const fetch = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        bitcoin: { usd: 65000, usd_24h_change: 1.5, last_updated_at: updatedAt },
        ethereum: { usd: 3200, usd_24h_change: -0.5, last_updated_at: updatedAt },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );
  vi.stubGlobal("fetch", fetch);

  const quotes = await fetchCryptoQuotes(["btc", "ETH", "BTC"]);

  expect(fetch).toHaveBeenCalledTimes(1);
  expect(String(fetch.mock.calls[0]?.[0])).toContain("ids=bitcoin,ethereum");
  expect(quotes["BTC"]).toMatchObject({ price: 65000, currency: "USD", source: "CoinGecko" });
  expect(quotes["ETH"]).toMatchObject({ price: 3200, currency: "USD", change: -0.5 });
});

it("does not return stale CoinGecko prices", async () => {
  const staleUpdatedAt = Math.floor(Date.now() / 1000) - 16 * 60;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          kaspa: { usd: 0.12, usd_24h_change: 2, last_updated_at: staleUpdatedAt },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ),
  );

  expect(await fetchCryptoQuotes(["KAS"])).toEqual({});
});
