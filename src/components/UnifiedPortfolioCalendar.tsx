import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays } from "lucide-react";
import { Card } from "@/components/AppShell";
import { getDividendEvents } from "@/lib/dividends.functions";
import { readBondCouponDates } from "@/lib/watchlist";
import type { Asset } from "@/lib/portfolio";
import type { UpcomingEarningsReport } from "@/lib/earnings";
import type { Lang } from "@/lib/i18n";

const COPY: Record<
  Lang,
  {
    title: string;
    earnings: string;
    ex: string;
    pay: string;
    coupon: string;
    maturity: string;
    loading: string;
    error: string;
    empty: string;
    confirmed: string;
    estimatedExcluded: string;
    manualBond: string;
  }
> = {
  en: {
    title: "Portfolio events",
    earnings: "Earnings",
    ex: "Ex-dividend",
    pay: "Dividend payment",
    coupon: "Bond coupon",
    maturity: "Bond maturity",
    loading: "Loading confirmed dividend dates…",
    error: "Could not load dividend events.",
    empty: "No upcoming confirmed portfolio events.",
    confirmed: "Provider-confirmed dates; earnings without confirmed dates are excluded.",
    estimatedExcluded: "Estimated earnings dates are excluded.",
    manualBond: "Bond coupon and maturity dates come from your entered bond details.",
  },
  bg: {
    title: "Календар на портфейла",
    earnings: "Отчет",
    ex: "Екс-дивидент",
    pay: "Изплащане на дивидент",
    coupon: "Купон по облигация",
    maturity: "Падеж на облигация",
    loading: "Зареждане на потвърдените дати за дивиденти…",
    error: "Събитията за дивиденти не могат да бъдат заредени.",
    empty: "Няма предстоящи потвърдени събития за портфейла.",
    confirmed: "Потвърдени от доставчика дати; отчетите без потвърдена дата са изключени.",
    estimatedExcluded: "Ориентировъчните дати за отчети не се включват.",
    manualBond: "Датите за купон и падеж са от въведените данни за облигациите.",
  },
  de: {
    title: "Portfolio-Kalender",
    earnings: "Bericht",
    ex: "Ex-Dividende",
    pay: "Dividendenzahlung",
    coupon: "Anleihekupon",
    maturity: "Anleihefälligkeit",
    loading: "Bestätigte Dividendentermine werden geladen…",
    error: "Dividendenereignisse konnten nicht geladen werden.",
    empty: "Keine kommenden bestätigten Portfolio-Ereignisse.",
    confirmed:
      "Vom Anbieter bestätigte Termine; Berichte ohne bestätigten Termin sind ausgeschlossen.",
    estimatedExcluded: "Geschätzte Berichtstermine sind ausgeschlossen.",
    manualBond: "Kupon- und Fälligkeitstermine stammen aus deinen Anleihedaten.",
  },
  es: {
    title: "Calendario de cartera",
    earnings: "Resultados",
    ex: "Exdividendo",
    pay: "Pago de dividendo",
    coupon: "Cupón del bono",
    maturity: "Vencimiento del bono",
    loading: "Cargando fechas de dividendos confirmadas…",
    error: "No se pudieron cargar los eventos de dividendos.",
    empty: "No hay próximos eventos confirmados de la cartera.",
    confirmed: "Fechas confirmadas por el proveedor; se excluyen resultados sin fecha confirmada.",
    estimatedExcluded: "Se excluyen las fechas estimadas de resultados.",
    manualBond: "Los cupones y vencimientos provienen de los datos introducidos del bono.",
  },
  it: {
    title: "Calendario del portafoglio",
    earnings: "Risultati",
    ex: "Ex dividendo",
    pay: "Pagamento dividendo",
    coupon: "Cedola obbligazionaria",
    maturity: "Scadenza obbligazione",
    loading: "Caricamento delle date dei dividendi confermate…",
    error: "Impossibile caricare gli eventi dei dividendi.",
    empty: "Nessun prossimo evento confermato del portafoglio.",
    confirmed: "Date confermate dal provider; esclusi i risultati senza data confermata.",
    estimatedExcluded: "Le date stimate degli utili sono escluse.",
    manualBond: "Cedole e scadenze provengono dai dettagli obbligazionari inseriti.",
  },
};

export function UnifiedPortfolioCalendar({
  assets,
  earnings,
  names,
  locale,
  lang,
}: {
  assets: Asset[];
  earnings: UpcomingEarningsReport[];
  names: Map<string, string>;
  locale: string;
  lang: Lang;
}) {
  const [couponDates, setCouponDates] = useState<Record<string, string>>({});
  useEffect(() => setCouponDates(readBondCouponDates()), []);
  const dividendFn = useServerFn(getDividendEvents);
  const symbols = [
    ...new Set(
      assets
        .filter((asset) => asset.type === "stock" || asset.type === "etf")
        .map((asset) => asset.symbol),
    ),
  ].slice(0, 40);
  const query = useQuery({
    queryKey: ["unified-calendar-dividends", symbols],
    queryFn: () => dividendFn({ data: { symbols } }),
    enabled: symbols.length > 0,
    staleTime: 6 * 60 * 60_000,
  });
  const copy = COPY[lang];
  const today = new Date().toISOString().slice(0, 10);
  const events = useMemo(() => {
    const result: { date: string; symbol: string; label: string }[] = [];
    for (const report of earnings)
      if (!report.dateEstimated && report.date >= today)
        result.push({ date: report.date, symbol: report.symbol, label: copy.earnings });
    for (const dividend of query.data ?? []) {
      if (dividend.exDate && dividend.exDate >= today)
        result.push({ date: dividend.exDate, symbol: dividend.symbol, label: copy.ex });
      if (dividend.payDate && dividend.payDate >= today)
        result.push({ date: dividend.payDate, symbol: dividend.symbol, label: copy.pay });
    }
    for (const asset of assets)
      if (asset.type === "bond") {
        const coupon = couponDates[asset.id];
        if (coupon && coupon >= today)
          result.push({ date: coupon, symbol: asset.symbol, label: copy.coupon });
        if (asset.bondMaturityDate && asset.bondMaturityDate >= today)
          result.push({ date: asset.bondMaturityDate, symbol: asset.symbol, label: copy.maturity });
      }
    return result.sort((a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol));
  }, [assets, couponDates, earnings, query.data, today, copy]);
  return (
    <Card>
      <h2 className="font-display font-semibold">{copy.title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {copy.confirmed} {copy.estimatedExcluded} {copy.manualBond}
      </p>
      {query.isError ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {copy.error}
        </p>
      ) : query.isPending && symbols.length ? (
        <p className="mt-3 text-sm text-muted-foreground">{copy.loading}</p>
      ) : !events.length ? (
        <p className="mt-3 text-sm text-muted-foreground">{copy.empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {events.map((event, index) => (
            <li
              key={`${event.date}-${event.symbol}-${event.label}-${index}`}
              className="flex items-center gap-3 py-2 text-sm"
            >
              <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
              <time className="w-28 shrink-0 text-muted-foreground">
                {new Date(`${event.date}T12:00:00`).toLocaleDateString(locale, {
                  dateStyle: "medium",
                })}
              </time>
              <span className="min-w-0 flex-1 truncate">
                {names.get(event.symbol) ?? event.symbol}
              </span>
              <span className="text-right text-xs">{event.label}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
