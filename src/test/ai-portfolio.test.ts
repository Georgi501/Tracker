import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchLiveQuoteMock, fetchCryptoQuotesMock, fetchFxMock } = vi.hoisted(() => ({
  fetchLiveQuoteMock: vi.fn(),
  fetchCryptoQuotesMock: vi.fn(),
  fetchFxMock: vi.fn(),
}));

vi.mock("@/lib/prices.server", () => ({
  fetchLiveQuote: fetchLiveQuoteMock,
  fetchCryptoQuotes: fetchCryptoQuotesMock,
  fetchFx: fetchFxMock,
}));

import { createSupabaseFetch } from "@/integrations/supabase/user-client.server";
import {
  buildAdvisorPortfolioPayload,
  buildReviewPortfolioFacts,
  loadValuedPortfolio,
  toUsdQuotePrice,
} from "@/lib/ai-portfolio.server";

function mockSupabaseTables(tables: Record<string, { data: unknown[]; error?: unknown }>) {
  return {
    rpc(name: string) {
      if (name === "portfolio_snapshot") {
        const hasError = Object.values(tables).find((t) => t.error);
        if (hasError?.error) {
          return Promise.resolve({ data: null, error: hasError.error });
        }
        return Promise.resolve({
          data: {
            assets: tables["assets"]?.data ?? [],
            transactions: tables["transactions"]?.data ?? [],
            brokers: tables["brokers"]?.data ?? [],
            broker_transfers: tables["broker_transfers"]?.data ?? [],
            corporate_actions: (tables["corporate_actions"]?.data ?? []).map((row, index) => ({
              id: `ca-${index}`,
              ...(row as object),
            })),
            asset_valuations: (tables["asset_valuations"]?.data ?? []).map((row, index) => ({
              id: `av-${index}`,
              ...(row as object),
            })),
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    },
  };
}

describe("AI route auth & canonical portfolio valuation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets apikey and Authorization headers in createSupabaseFetch and strips opaque key Authorization when no user token is passed", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    const authedFetch = createSupabaseFetch("sb_publishable_test_key", "user-jwt-token");
    await authedFetch("https://example.supabase.co/rest/v1/assets", {
      headers: { Authorization: "Bearer sb_publishable_test_key" },
    });

    const firstHeaders = fetchSpy.mock.calls[0]?.[1]?.headers as Headers;
    expect(firstHeaders.get("apikey")).toBe("sb_publishable_test_key");
    expect(firstHeaders.get("Authorization")).toBe("Bearer user-jwt-token");

    const anonOpaqueFetch = createSupabaseFetch("sb_publishable_test_key");
    await anonOpaqueFetch("https://example.supabase.co/rest/v1/assets", {
      headers: { Authorization: "Bearer sb_publishable_test_key" },
    });

    const secondHeaders = fetchSpy.mock.calls[1]?.[1]?.headers as Headers;
    expect(secondHeaders.get("apikey")).toBe("sb_publishable_test_key");
    expect(secondHeaders.get("Authorization")).toBeNull();

    fetchSpy.mockRestore();
  });

  it("normalizes stock splits, includes transaction fees in cost basis, applies latest manual valuations, and converts EUR/GBX quotes to USD", async () => {
    fetchLiveQuoteMock.mockImplementation(async (symbol: string) => {
      if (symbol === "NVDA") {
        return {
          price: 120,
          change: 2.5,
          at: "2026-06-01T15:00:00.000Z",
          currency: "USD",
          source: "Yahoo Finance",
        };
      }
      if (symbol === "VWCE.DE") {
        return {
          price: 108,
          change: 1.0,
          at: "2026-06-01T15:00:00.000Z",
          currency: "EUR",
          source: "Yahoo Finance",
        };
      }
      if (symbol === "VOD.L") {
        return {
          price: 80, // 80 GBX = 0.80 GBP
          change: -0.5,
          at: "2026-06-01T15:00:00.000Z",
          currency: "GBX",
          source: "Yahoo Finance",
        };
      }
      if (symbol === "GBPUSD=X") {
        return {
          price: 1.25, // 1 GBP = 1.25 USD -> 80 GBX = $1.00 USD
          change: 0,
          at: "2026-06-01T15:00:00.000Z",
          currency: "USD",
          source: "Yahoo Finance",
        };
      }
      return null;
    });
    fetchCryptoQuotesMock.mockResolvedValue({});
    fetchFxMock.mockResolvedValue(0.9); // 0.9 EUR per 1 USD -> 108 EUR = $120 USD

    const sb = mockSupabaseTables({
      assets: {
        data: [
          {
            id: "a-nvda",
            symbol: "NVDA",
            name: "NVIDIA",
            type: "stock",
            sector: "Technology",
            region: "US",
            dividend_per_share: 0.04,
            pay_months: [3, 6, 9, 12],
            manual_price: null,
          },
          {
            id: "a-vwce",
            symbol: "VWCE.DE",
            name: "Vanguard FTSE All-World",
            type: "etf",
            sector: "Broad",
            region: "Global",
            dividend_per_share: 0,
            pay_months: [],
            manual_price: null,
          },
          {
            id: "a-vod",
            symbol: "VOD.L",
            name: "Vodafone",
            type: "stock",
            sector: "Telecom",
            region: "EU",
            dividend_per_share: 0,
            pay_months: [],
            manual_price: null,
          },
          {
            id: "a-bond",
            symbol: "UST10Y",
            name: "US Treasury 10Y",
            type: "bond",
            sector: "Government",
            region: "US",
            dividend_per_share: 4.5,
            pay_months: [6, 12],
            manual_price: 98,
          },
        ],
      },
      transactions: {
        data: [
          // Pre-split buy of 2 NVDA @ $500 + $10 fee = $1,010 cost basis; after 10-for-1 split -> 20 shares @ $50.50 avgCost
          {
            id: "tx-1",
            asset_id: "a-nvda",
            broker_id: null,
            kind: "buy",
            quantity: 2,
            price: 500,
            fee: 10,
            date: "2024-05-01",
          },
          // Buy 5 VWCE.DE @ $110 USD + $5 fee = $555 cost basis
          {
            id: "tx-2",
            asset_id: "a-vwce",
            broker_id: null,
            kind: "buy",
            quantity: 5,
            price: 110,
            fee: 5,
            date: "2025-01-10",
          },
          // Buy 100 VOD.L @ $0.90 USD + $2 fee = $92 cost basis
          {
            id: "tx-3",
            asset_id: "a-vod",
            broker_id: null,
            kind: "buy",
            quantity: 100,
            price: 0.9,
            fee: 2,
            date: "2025-02-01",
          },
          // Buy 10 UST10Y @ $95 USD + $0 fee = $950 cost basis
          {
            id: "tx-4",
            asset_id: "a-bond",
            broker_id: null,
            kind: "buy",
            quantity: 10,
            price: 95,
            fee: 0,
            date: "2025-03-01",
          },
        ],
      },
      corporate_actions: {
        data: [
          {
            asset_id: "a-nvda",
            event_date: "2024-06-10",
            numerator: 10,
            denominator: 1,
          },
        ],
      },
      asset_valuations: {
        data: [
          {
            asset_id: "a-bond",
            valuation_date: "2025-06-01",
            price_usd: 101,
          },
          {
            asset_id: "a-bond",
            valuation_date: "2026-01-15",
            price_usd: 105, // Latest manual valuation overrides older valuation (101) and manual_price (98)
          },
        ],
      },
    });

    const summary = await loadValuedPortfolio(sb as never);

    // Total cost = 1010 (NVDA) + 555 (VWCE) + 92 (VOD) + 950 (UST10Y) = 2607
    expect(summary.totalCost).toBeCloseTo(2607, 4);
    // Total value = 20*120 (2400) + 5*120 (600) + 100*1.00 (100) + 10*105 (1050) = 4150
    expect(summary.totalValue).toBeCloseTo(4150, 4);

    const advisorPayload = buildAdvisorPortfolioPayload(summary);
    const nvdaPos = advisorPayload.positions.find((p) => p.symbol === "NVDA");
    expect(nvdaPos).toMatchObject({
      quantity: 20,
      costBasisUsd: 1010,
      avgCostUsd: 50.5,
      priceUsd: 120,
      valueUsd: 2400,
      pnlUsd: 1390,
    });

    const vwcePos = advisorPayload.positions.find((p) => p.symbol === "VWCE.DE");
    expect(vwcePos).toMatchObject({
      quantity: 5,
      costBasisUsd: 555,
      avgCostUsd: 111,
      priceUsd: 120, // 108 EUR / 0.9 EUR/USD = 120 USD
      valueUsd: 600,
      liveQuote: {
        symbol: "VWCE.DE",
        priceUsd: 120,
        nativePrice: 108,
        currency: "EUR",
      },
    });

    const vodPos = advisorPayload.positions.find((p) => p.symbol === "VOD.L");
    expect(vodPos).toMatchObject({
      quantity: 100,
      costBasisUsd: 92,
      priceUsd: 1, // 80 GBX * 1.25 / 100 = 1.00 USD
      valueUsd: 100,
    });

    const bondPos = advisorPayload.positions.find((p) => p.symbol === "UST10Y");
    expect(bondPos).toMatchObject({
      quantity: 10,
      costBasisUsd: 950,
      priceUsd: 105,
      valueUsd: 1050,
    });

    const reviewFacts = buildReviewPortfolioFacts(summary);
    expect(reviewFacts.totalCostUsd).toBe(2607);
    expect(reviewFacts.totalValueUsd).toBe(4150);
    expect(reviewFacts.positions.find((p) => p.symbol === "NVDA")?.quantity).toBe(20);
  });

  it("keeps priceUsd and valueUsd null when a quote or FX rate is unavailable instead of substituting cost", async () => {
    fetchLiveQuoteMock.mockResolvedValue({
      price: 100,
      change: 0,
      at: "2026-06-01T15:00:00.000Z",
      currency: "EUR",
      source: "Yahoo Finance",
    });
    fetchCryptoQuotesMock.mockResolvedValue({});
    fetchFxMock.mockResolvedValue(null); // FX unavailable

    expect(
      toUsdQuotePrice(
        {
          price: 100,
          change: 0,
          at: "2026-06-01T15:00:00.000Z",
          currency: "EUR",
          source: "Yahoo Finance",
        },
        null,
        null,
      ),
    ).toBeNaN();

    const sb = mockSupabaseTables({
      assets: {
        data: [
          {
            id: "a-sap",
            symbol: "SAP.DE",
            name: "SAP SE",
            type: "stock",
            sector: "Technology",
            region: "EU",
            dividend_per_share: 0,
            pay_months: [],
            manual_price: null,
          },
        ],
      },
      transactions: {
        data: [
          {
            id: "tx-sap",
            asset_id: "a-sap",
            broker_id: null,
            kind: "buy",
            quantity: 4,
            price: 180,
            fee: 4,
            date: "2025-04-01",
          },
        ],
      },
      corporate_actions: { data: [] },
      asset_valuations: { data: [] },
    });

    const summary = await loadValuedPortfolio(sb as never);
    const advisorPayload = buildAdvisorPortfolioPayload(summary);
    expect(advisorPayload.positions[0]).toMatchObject({
      symbol: "SAP.DE",
      quantity: 4,
      costBasisUsd: 724,
      priceUsd: null,
      valueUsd: null,
      pnlUsd: null,
      liveQuote: null,
    });
  });
});
