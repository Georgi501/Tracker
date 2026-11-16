import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildPublicCacheUrl,
  createPublicEdgeCache,
  type EdgeCacheLike,
} from "@/lib/edge-cache.server";
import { createDailyHistoryService } from "@/lib/history.server";
import { createSecFinancialService } from "@/lib/sec-financials.server";

function createMockWorkerCache(): {
  cache: EdgeCacheLike;
  store: Map<string, Response>;
  matchSpy: ReturnType<typeof vi.fn>;
  putSpy: ReturnType<typeof vi.fn>;
} {
  const store = new Map<string, Response>();
  const matchSpy = vi.fn(async (request: Request | string) => {
    const url = typeof request === "string" ? request : request.url;
    const hit = store.get(url);
    return hit ? hit.clone() : undefined;
  });
  const putSpy = vi.fn(async (request: Request | string, response: Response) => {
    const url = typeof request === "string" ? request : request.url;
    store.set(url, response.clone());
  });
  return {
    cache: { match: matchSpy, put: putSpy },
    store,
    matchSpy,
    putSpy,
  };
}

const now = () => Date.parse("2026-11-12T12:00:00Z");
const point = (end: string, val: number) => ({
  start: `${Number(end.slice(0, 4)) - 1}-06-01`,
  end,
  val,
  accn: "0001341439-26-000001",
  form: "10-K",
  filed: "2026-06-22",
});
const secPayload = {
  cik: 1341439,
  entityName: "Oracle",
  facts: {
    "us-gaap": {
      Revenues: { units: { USD: [point("2025-05-31", 80), point("2026-05-31", 100)] } },
      EarningsPerShareDiluted: {
        units: { "USD/shares": [point("2025-05-31", 2), point("2026-05-31", 3)] },
      },
    },
  },
};
const secMapping = { "0": { cik_str: 1341439, ticker: "ORCL", title: "Oracle" } };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Cloudflare Edge Cache (caches.default) for public SEC & market history", () => {
  it("caches public SEC tickers and 10-K history across cold Worker isolates via caches.default", async () => {
    const mock = createMockWorkerCache();
    vi.stubGlobal("caches", { default: mock.cache });
    const edgeCache = createPublicEdgeCache();

    const fetcher1 = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async (input) =>
          new Response(
            JSON.stringify(String(input).includes("company_tickers") ? secMapping : secPayload),
          ),
      );
    const isolate1 = createSecFinancialService({
      fetcher: fetcher1,
      now,
      wait: async () => {},
      edgeCache,
    });

    const first = await isolate1("ORCL");
    expect(first?.source).toBe("SEC EDGAR");
    expect(first?.rows.map((r) => r.revenue)).toEqual([80, 100]);
    expect(fetcher1).toHaveBeenCalledTimes(2);
    expect(mock.putSpy).toHaveBeenCalledTimes(2);

    // Cold Worker isolate #2: empty in-memory Map, must hit caches.default with 0 network calls
    const fetcher2 = vi.fn<typeof fetch>();
    const isolate2 = createSecFinancialService({
      fetcher: fetcher2,
      now,
      wait: async () => {},
      edgeCache,
    });

    const second = await isolate2("orcl");
    expect(second).toEqual(first);
    expect(fetcher2).not.toHaveBeenCalled();
  });

  it("never writes SEC outages to caches.default", async () => {
    const mock = createMockWorkerCache();
    const edgeCache = createPublicEdgeCache(() => mock.cache);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 503 }));
    const annual = createSecFinancialService({
      fetcher,
      now,
      wait: async () => {},
      edgeCache,
    });

    await expect(annual("ORCL")).rejects.toThrow("503");
    expect(mock.putSpy).not.toHaveBeenCalled();
  });

  it("caches public index/market daily history across cold isolates with 15-minute Edge TTL", async () => {
    const mock = createMockWorkerCache();
    const edgeCache = createPublicEdgeCache(() => mock.cache);

    const upstream1 = vi.fn().mockResolvedValue({
      currency: "USD",
      prices: [
        { date: "2026-11-10", close: 5980.25 },
        { date: "2026-11-11", close: 6005.5 },
      ],
      splits: [],
    });
    const historyIsolate1 = createDailyHistoryService({
      fetcher: upstream1,
      now,
      edgeCache,
    });

    const res1 = await historyIsolate1("^GSPC", "2026-11-01", "2026-11-12");
    expect(res1.prices).toHaveLength(2);
    expect(upstream1).toHaveBeenCalledOnce();
    expect(mock.putSpy).toHaveBeenCalledOnce();

    const storedResponse = [...mock.store.values()][0]!;
    expect(storedResponse.headers.get("Cache-Control")).toBe("public, max-age=900, s-maxage=900");
    expect(storedResponse.headers.get("X-CapiSpot-Public-Cache")).toBe("market-daily-history");

    // Cold isolate #2 serves from Edge Cache without calling upstream Yahoo Finance
    const upstream2 = vi.fn();
    const historyIsolate2 = createDailyHistoryService({
      fetcher: upstream2,
      now,
      edgeCache,
    });
    const res2 = await historyIsolate2("^GSPC", "2026-11-01", "2026-11-12");
    expect(res2).toEqual(res1);
    expect(upstream2).not.toHaveBeenCalled();
  });

  it("falls back gracefully to in-memory isolate cache when caches.default is undefined", async () => {
    vi.stubGlobal("caches", undefined);
    const edgeCache = createPublicEdgeCache();
    expect(await edgeCache.get("sec-tickers", "company_tickers_v1")).toBeNull();
    await expect(
      edgeCache.set("sec-tickers", "company_tickers_v1", { AAPL: 320193 }, 3600),
    ).resolves.toBeUndefined();

    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async (input) =>
          new Response(
            JSON.stringify(String(input).includes("company_tickers") ? secMapping : secPayload),
          ),
      );
    const annual = createSecFinancialService({
      fetcher,
      now,
      wait: async () => {},
      edgeCache,
    });
    await annual("ORCL");
    await annual("ORCL");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("strictly rejects any key containing user, account, portfolio, auth, email, or UUID identifiers", async () => {
    const mock = createMockWorkerCache();
    const edgeCache = createPublicEdgeCache(() => mock.cache);

    const forbiddenKeys = [
      "user:123",
      "portfolio-summary",
      "account_id:42",
      "investor@example.com",
      "bearer-xyz",
      "session-token",
      "550e8400-e29b-41d4-a716-446655440000",
    ];

    for (const badKey of forbiddenKeys) {
      expect(() => buildPublicCacheUrl("market-daily-history", badKey)).toThrow(
        /Refusing to cache non-public/,
      );
      await expect(edgeCache.get("market-daily-history", badKey)).rejects.toThrow(
        /Refusing to cache non-public/,
      );
      await expect(
        edgeCache.set("market-daily-history", badKey, { prices: [] }, 60),
      ).rejects.toThrow(/Refusing to cache non-public/);
    }
    expect(mock.putSpy).not.toHaveBeenCalled();
  });
});
