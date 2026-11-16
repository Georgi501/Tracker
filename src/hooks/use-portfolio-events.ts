import { getDividendEvents, getPortfolioSecFilings } from "@/lib/dividends.functions";
import { buildSmartPortfolioEvents, type PortfolioSmartEvent } from "@/lib/portfolio-events";
import { usePortfolio } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

const PUBLIC_SYMBOL = /^[A-Za-z0-9.^:=_-]{1,20}$/;

/**
 * Smart portfolio events from public provider data only (confirmed ex-dividend dates and SEC 10-K
 * filings). Only ticker symbols leave the browser; no account or portfolio data is sent.
 */
export function usePortfolioEvents(): {
  events: PortfolioSmartEvent[];
  loading: boolean;
  signedIn: boolean;
} {
  const p = usePortfolio();
  const dividendFn = useServerFn(getDividendEvents);
  const secFn = useServerFn(getPortfolioSecFilings);
  const held = p.holdings.filter(
    (h) => h.quantity > 0 && (h.asset.type === "stock" || h.asset.type === "etf"),
  );
  const dividendSymbols = held.map((h) => h.asset.symbol).slice(0, 40);
  const secSymbols = held
    .filter((h) => h.asset.type === "stock" && PUBLIC_SYMBOL.test(h.asset.symbol))
    .map((h) => h.asset.symbol)
    .slice(0, 30);
  const enabled = !!p.user;
  const dividends = useQuery({
    queryKey: ["dividend-events", held.map((h) => h.asset.symbol).join(",")],
    queryFn: () => dividendFn({ data: { symbols: dividendSymbols } }),
    enabled: enabled && dividendSymbols.length > 0,
    staleTime: 3600000,
  });
  const filings = useQuery({
    queryKey: ["portfolio-sec-filings", secSymbols.join(",")],
    queryFn: () => secFn({ data: { symbols: secSymbols } }),
    enabled: enabled && secSymbols.length > 0,
    staleTime: 6 * 3600000,
  });
  const toUsd = (amount: number, currency: string | null) =>
    currency === "USD"
      ? amount
      : currency === "EUR" && p.eurPerUsd
        ? amount / p.eurPerUsd
        : Number.NaN;
  const events = enabled
    ? buildSmartPortfolioEvents({
        holdings: held,
        dividendEvents: dividends.data ?? [],
        secFilings: filings.data ?? [],
        toUsd,
      })
    : [];
  return {
    events,
    loading: dividends.isFetching || filings.isFetching,
    signedIn: enabled,
  };
}
