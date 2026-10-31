import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { marketEarningsCalendar } from "@/lib/market.functions";
import { useWatchState } from "@/components/AssetExtras";
import { usePortfolio } from "@/lib/store";
import { languageLocale } from "@/lib/i18n";

const COPY = {
  en: {
    title: "Portfolio reminder",
    earnings: (symbol: string, days: number) =>
      `${symbol} reports ${days === 0 ? "today" : "tomorrow"}.`,
    coupon: (symbol: string, days: number) =>
      `${symbol} bond coupon date is ${days === 0 ? "today" : `in ${days} days`}.`,
    maturity: (symbol: string, days: number) =>
      `${symbol} bond maturity is ${days === 0 ? "today" : `in ${days} days`}.`,
  },
  bg: {
    title: "Напомняне за портфолиото",
    earnings: (symbol: string, days: number) =>
      `${symbol} публикува отчет ${days === 0 ? "днес" : "утре"}.`,
    coupon: (symbol: string, days: number) =>
      `Купонната дата на облигацията ${symbol} е ${days === 0 ? "днес" : `след ${days} дни`}.`,
    maturity: (symbol: string, days: number) =>
      `Падежът на облигацията ${symbol} е ${days === 0 ? "днес" : `след ${days} дни`}.`,
  },
  de: {
    title: "Portfolio-Erinnerung",
    earnings: (symbol: string, days: number) =>
      `${symbol} berichtet ${days === 0 ? "heute" : "morgen"}.`,
    coupon: (symbol: string, days: number) =>
      `Der Kupontermin der Anleihe ${symbol} ist ${days === 0 ? "heute" : `in ${days} Tagen`}.`,
    maturity: (symbol: string, days: number) =>
      `Die Anleihe ${symbol} wird ${days === 0 ? "heute" : `in ${days} Tagen`} fällig.`,
  },
  es: {
    title: "Aviso de cartera",
    earnings: (symbol: string, days: number) =>
      `${symbol} presenta resultados ${days === 0 ? "hoy" : "mañana"}.`,
    coupon: (symbol: string, days: number) =>
      `El cupón del bono ${symbol} vence ${days === 0 ? "hoy" : `en ${days} días`}.`,
    maturity: (symbol: string, days: number) =>
      `El bono ${symbol} vence ${days === 0 ? "hoy" : `en ${days} días`}.`,
  },
  it: {
    title: "Promemoria portafoglio",
    earnings: (symbol: string, days: number) =>
      `${symbol} pubblica i risultati ${days === 0 ? "oggi" : "domani"}.`,
    coupon: (symbol: string, days: number) =>
      `La data della cedola dell'obbligazione ${symbol} è ${days === 0 ? "oggi" : `tra ${days} giorni`}.`,
    maturity: (symbol: string, days: number) =>
      `La scadenza dell'obbligazione ${symbol} è ${days === 0 ? "oggi" : `tra ${days} giorni`}.`,
  },
} as const;

function dateOnly(value: string) {
  return value.slice(0, 10);
}

function daysUntil(value: string, today: string) {
  const date = Date.parse(`${dateOnly(value)}T00:00:00Z`);
  const current = Date.parse(`${today}T00:00:00Z`);
  return Number.isFinite(date) && Number.isFinite(current)
    ? Math.round((date - current) / 86400000)
    : null;
}

export function PortfolioReminderMonitor() {
  const { earningsReminders, bondCouponDates } = useWatchState();
  const p = usePortfolio();
  const earningsFn = useServerFn(marketEarningsCalendar);
  const symbols = useMemo(() => earningsReminders.slice(0, 100), [earningsReminders]);
  const earnings = useQuery({
    queryKey: ["earnings-reminders", symbols],
    queryFn: () => earningsFn({ data: { symbols } }),
    enabled: p.isPro && symbols.length > 0,
    staleTime: 10 * 60_000,
    refetchInterval: 30 * 60_000,
  });
  const notified = useRef(new Set<string>());
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setMinute((value) => value + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const notify = (key: string, body: string) => {
      if (notified.current.has(key)) return;
      if (notified.current.size >= 300) {
        const oldest = notified.current.values().next().value;
        if (oldest) notified.current.delete(oldest);
      }
      notified.current.add(key);
      const title = COPY[p.lang].title;
      if (typeof Notification !== "undefined" && Notification.permission === "granted")
        new Notification(title, { body, tag: key });
      else toast.info(body);
    };

    for (const report of earnings.data?.upcoming ?? []) {
      if (!symbols.includes(report.symbol)) continue;
      const days = daysUntil(report.date, today);
      if (days === 0 || days === 1)
        notify(
          `earnings:${report.symbol}:${dateOnly(report.date)}:${days}`,
          COPY[p.lang].earnings(report.symbol, days),
        );
    }

    for (const asset of p.assets.filter((item) => item.type === "bond")) {
      const events = [
        { kind: "coupon", date: bondCouponDates[asset.id] },
        { kind: "maturity", date: asset.bondMaturityDate },
      ] as const;
      for (const event of events) {
        if (!event.date) continue;
        const days = daysUntil(event.date, today);
        if (days !== 0 && days !== 7) continue;
        const message =
          event.kind === "coupon"
            ? COPY[p.lang].coupon(asset.symbol, days)
            : COPY[p.lang].maturity(asset.symbol, days);
        notify(`${event.kind}:${asset.id}:${event.date}:${days}`, message);
      }
    }
  }, [bondCouponDates, earnings.data, minute, p.assets, p.lang, symbols]);
  return null;
}
