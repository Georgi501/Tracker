import { useEffect, useMemo, useRef } from "react";
import { useQueries } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useWatchState } from "@/components/AssetExtras";
import { usePortfolio } from "@/lib/store";
import { marketQuote } from "@/lib/market.functions";
import { alertCrossed, alertKey } from "@/lib/watchlist";
import { priceAlertCopy } from "@/lib/extras-i18n";
import { languageLocale } from "@/lib/i18n";
import { MARKET_ASSETS } from "@/lib/market-search";

const CRYPTO = new Set(
  MARKET_ASSETS.filter((asset) => asset.type === "crypto").map((a) => a.symbol),
);

export function PriceAlertMonitor() {
  const { alerts } = useWatchState();
  const p = usePortfolio();
  const quoteFn = useServerFn(marketQuote);
  const symbols = useMemo(() => [...new Set(alerts.map((alert) => alert.symbol))], [alerts]);
  const queries = useQueries({
    queries: symbols.map((symbol) => ({
      queryKey: ["watch-quote", symbol],
      queryFn: () => quoteFn({ data: { symbol, type: CRYPTO.has(symbol) ? "crypto" : "stock" } }),
      refetchInterval: 60_000,
      staleTime: 30_000,
    })),
  });
  const previous = useRef(new Map<string, number>());
  const notified = useRef(new Set<string>());

  useEffect(() => {
    const activeKeys = new Set(alerts.map(alertKey));
    for (const key of notified.current) if (!activeKeys.has(key)) notified.current.delete(key);
    for (const [index, symbol] of symbols.entries()) {
      const quote = queries[index]?.data?.quote;
      const currentPrice = quote?.price;
      if (currentPrice == null || !Number.isFinite(currentPrice) || currentPrice <= 0) continue;
      const oldPrice = previous.current.get(symbol);
      if (oldPrice !== undefined && quote?.currency) {
        for (const alert of alerts.filter((item) => item.symbol === symbol)) {
          const key = alertKey(alert);
          if (notified.current.has(key) || !alertCrossed(alert, oldPrice, currentPrice)) continue;
          notified.current.add(key);
          const target = `${alert.target.toLocaleString(languageLocale(p.lang), { maximumFractionDigits: 2 })} ${quote.currency}`;
          const body = priceAlertCopy[p.lang].crossed(symbol, target);
          if (typeof Notification !== "undefined" && Notification.permission === "granted")
            new Notification(priceAlertCopy[p.lang].title, { body, tag: key });
          else toast.info(body);
        }
      }
      previous.current.set(symbol, currentPrice);
    }
  }, [alerts, p.lang, queries, symbols]);
  return null;
}
