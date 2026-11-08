import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HoldingValue } from "@/components/HoldingValue";
import { createLiveFxCache } from "@/lib/live-fx-cache";
import { currentUsdPrice, formatUsdAmount, isFxStale, type LiveFx } from "@/lib/live-fx";
import { computeHoldings, type Asset, type Currency, type Transaction } from "@/lib/portfolio";
import { dictionaries, languageLocale } from "@/lib/i18n";

const fx: LiveFx = {
  eurPerUsd: 1 / 1.1,
  at: "2026-11-06T20:00:00Z",
  source: "Yahoo Finance",
  providerUnavailable: false,
};

function asset(id: string, price: number, currency: string, nativePrice: number): Asset {
  return {
    id,
    name: id,
    symbol: id,
    type: "stock",
    sector: "",
    region: "",
    price,
    change24h: 0,
    dividendPerShare: 0,
    payMonths: [],
    quoteCurrency: currency,
    quoteNativePrice: nativePrice,
    quoteAt: "2026-11-06T20:00:00Z",
  };
}

describe("live FX", () => {
  it("caches a valid dated quote, coalesces requests, and keeps it when the provider fails", async () => {
    let time = 0;
    const load = vi
      .fn()
      .mockResolvedValueOnce({ price: 1.1, currency: "USD", at: fx.at, source: fx.source })
      .mockResolvedValueOnce(null);
    const get = createLiveFxCache(load, () => time);
    const [first, concurrent] = await Promise.all([get(), get()]);
    expect(first).toEqual(fx);
    expect(concurrent).toEqual(fx);
    expect(load).toHaveBeenCalledTimes(1);
    time += 300_001;
    expect(await get()).toEqual({ ...fx, providerUnavailable: true });
    expect(await get()).toEqual({ ...fx, providerUnavailable: true });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("refreshes only on a request after expiry and retains the provider's original quote time", async () => {
    let time = 0;
    const load = vi.fn(async () => ({
      price: 1.1,
      currency: "USD",
      at: fx.at,
      source: fx.source,
    }));
    const get = createLiveFxCache(load, () => time);
    expect((await get())?.at).toBe(fx.at);
    time = 300_001;
    expect(load).toHaveBeenCalledTimes(1);
    expect((await get())?.at).toBe(fx.at);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("does not mistake the weekend for active FX market time", () => {
    expect(isFxStale("2026-11-06T21:00:00Z", Date.parse("2026-11-09T12:00:00Z"))).toBe(false);
    expect(isFxStale("2026-11-02T12:00:00Z", Date.parse("2026-11-06T12:00:00Z"))).toBe(true);
    expect(isFxStale("invalid")).toBe(true);
  });

  it("restores the latest stored rate after a server restart and provider outage", async () => {
    let saved: LiveFx | null = null;
    const persistence = {
      read: vi.fn(async () => saved),
      write: vi.fn(async (value: LiveFx) => {
        saved = value;
        return value;
      }),
    };
    const warmServer = createLiveFxCache(
      async () => ({ price: 1.1, currency: "USD", at: fx.at, source: fx.source }),
      Date.now,
      persistence,
    );
    expect(await warmServer()).toEqual(fx);
    const restartedServer = createLiveFxCache(async () => null, Date.now, persistence);
    expect(await restartedServer()).toEqual({ ...fx, providerUnavailable: true });
    expect(persistence.write).toHaveBeenCalledTimes(1);
    expect(persistence.read).toHaveBeenCalledTimes(1);
  });

  it("returns no rate when both provider and stored cache have no quote", async () => {
    const get = createLiveFxCache(async () => null, Date.now, {
      read: async () => null,
      write: async (value) => value,
    });
    expect(await get()).toBeNull();
    expect(formatUsdAmount(100, "EUR", "en", null)).toBe("—");
  });

  it("shows a restored rate's original timestamp and provider outage warning", () => {
    const cachedFx = { ...fx, providerUnavailable: true };
    const holding = asset("EUR", 110, "EUR", 100);
    const view = render(
      <HoldingValue
        asset={holding}
        quantity={1}
        valueUsd={110}
        currency="EUR"
        liveFx={cachedFx}
        displayValue="€100.00"
        lang="en"
        t={(key) => dictionaries.en[key]}
      />,
    );
    fireEvent.click(screen.getByText(dictionaries.en.holdingValueExplain));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText(dictionaries.en.holdingValueFxCached)).toBeInTheDocument();
    const timestamp = new Intl.DateTimeFormat(languageLocale("en"), {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(fx.at));
    expect(dialog.getAllByText(`${timestamp} · Yahoo Finance`).length).toBeGreaterThan(0);
    view.unmount();
  });

  it("changes the EUR conversion without changing the asset quote timestamp", () => {
    const eurAsset = asset("EUR", 110, "EUR", 100);
    const newerFx = { ...fx, eurPerUsd: 1 / 1.2, at: "2026-11-09T12:00:00Z" };
    expect(currentUsdPrice(eurAsset, fx)).toBeCloseTo(110);
    expect(currentUsdPrice(eurAsset, newerFx)).toBeCloseTo(120);
    expect(eurAsset.quoteAt).toBe("2026-11-06T20:00:00Z");
  });

  it("keeps position, explanation and total consistent through EUR → USD → EUR including cash", () => {
    const assets = [
      asset("USD", 100, "USD", 100),
      asset("EUR", 110, "EUR", 100),
      asset("GBP", 130, "GBP", 100),
      { ...asset("CASH", 1, "USD", 1), type: "cash" as const },
    ];
    const transactions: Transaction[] = assets.map((a, i) => ({
      id: `${i}`,
      assetId: a.id,
      kind: "buy",
      quantity: i === 2 ? 1.5 : 1,
      price: 1,
      date: "2026-01-01",
    }));
    const holdings = computeHoldings(
      assets.map((a) => ({ ...a, price: currentUsdPrice(a, fx) })),
      transactions,
    );
    const target = holdings.find((h) => h.asset.id === "EUR")!;
    const total = holdings.reduce((sum, h) => sum + h.value, 0);
    expect(total).toBeCloseTo(406);
    for (const [currency, expectedRow, expectedTotal] of [
      ["EUR", "€100.00", "€369.09"],
      ["USD", "$110.00", "$406.00"],
      ["EUR", "€100.00", "€369.09"],
    ] as [Currency, string, string][]) {
      const displayed = formatUsdAmount(target.value, currency, "en", fx.eurPerUsd);
      expect(displayed).toBe(expectedRow);
      expect(formatUsdAmount(total, currency, "en", fx.eurPerUsd)).toBe(expectedTotal);
      const view = render(
        <HoldingValue
          asset={target.asset}
          quantity={target.quantity}
          valueUsd={target.value}
          currency={currency}
          liveFx={fx}
          displayValue={displayed}
          lang="en"
          t={(key) => key}
        />,
      );
      fireEvent.click(screen.getByText("holdingValueExplain"));
      const result = within(screen.getByRole("dialog")).getByText("holdingValueResult");
      expect(result.nextElementSibling).toHaveTextContent(expectedRow);
      expect(target.asset.quoteAt).toBe("2026-11-06T20:00:00Z");
      view.unmount();
    }
    expect(formatUsdAmount(total, "EUR", "en", null)).toBe("—");
    expect(Number.isNaN(currentUsdPrice(assets[1]!, null))).toBe(true);
  });
});
