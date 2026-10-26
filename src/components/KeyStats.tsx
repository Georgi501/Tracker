import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { marketStats } from "@/lib/market.functions";
import { languageLocale, type Lang } from "@/lib/i18n";

const L = {
  en: {
    prev: "Previous close",
    open: "Open",
    day: "Day's range",
    w52: "52-week range",
    cap: "Market cap",
    beta: "Beta (5Y monthly)",
    pe: "P/E ratio (TTM)",
    eps: "EPS (TTM)",
    div: "Forward dividend & yield",
    target: "1y target est.",
    earn: "Earnings date",
    none: "Statistics are not available for this asset.",
  },
  bg: {
    prev: "Предишно затваряне",
    open: "Отваряне",
    day: "Дневен диапазон",
    w52: "52-седмичен диапазон",
    cap: "Пазарна капитализация",
    beta: "Бета (5 г. месечно)",
    pe: "P/E (TTM)",
    eps: "EPS (TTM)",
    div: "Прогнозен дивидент и доходност",
    target: "Целева цена (1 г.)",
    earn: "Дата на отчет",
    none: "Няма налични показатели за този актив.",
  },
  de: {
    prev: "Vortagesschluss",
    open: "Eröffnung",
    day: "Tagesspanne",
    w52: "52-Wochen-Spanne",
    cap: "Marktkapitalisierung",
    beta: "Beta (5J monatlich)",
    pe: "KGV (TTM)",
    eps: "EPS (TTM)",
    div: "Erw. Dividende & Rendite",
    target: "1J-Kursziel",
    earn: "Ergebnistermin",
    none: "Für diesen Wert sind keine Kennzahlen verfügbar.",
  },
  es: {
    prev: "Cierre anterior",
    open: "Apertura",
    day: "Rango diario",
    w52: "Rango 52 semanas",
    cap: "Capitalización",
    beta: "Beta (5A mensual)",
    pe: "PER (TTM)",
    eps: "BPA (TTM)",
    div: "Dividendo y rentabilidad",
    target: "Precio objetivo 1A",
    earn: "Fecha de resultados",
    none: "No hay estadísticas disponibles para este activo.",
  },
  it: {
    prev: "Chiusura precedente",
    open: "Apertura",
    day: "Intervallo giornaliero",
    w52: "Intervallo 52 settimane",
    cap: "Capitalizzazione",
    beta: "Beta (5A mensile)",
    pe: "P/E (TTM)",
    eps: "EPS (TTM)",
    div: "Dividendo e rendimento",
    target: "Target 1A",
    earn: "Data utili",
    none: "Statistiche non disponibili per questo asset.",
  },
} as const;

export function KeyStats({ symbol, lang }: { symbol: string; lang: Lang }) {
  const fetchStats = useServerFn(marketStats);
  const { data, isLoading } = useQuery({
    queryKey: ["market-stats", symbol],
    queryFn: () => fetchStats({ data: { symbol } }),
    staleTime: 300_000,
  });
  const c = L[lang];
  const loc = languageLocale(lang);
  if (isLoading) return <p className="mt-4 text-sm text-muted-foreground">…</p>;
  if (!data) return <p className="mt-4 text-sm text-muted-foreground">{c.none}</p>;
  const num = (v: number | null, d = 2) =>
    v == null
      ? "—"
      : new Intl.NumberFormat(loc, { minimumFractionDigits: d, maximumFractionDigits: d }).format(
          v,
        );
  const range = (a: number | null, b: number | null) =>
    a == null || b == null ? "—" : `${num(a)} – ${num(b)}`;
  const cap =
    data.marketCap == null
      ? "—"
      : new Intl.NumberFormat(loc, { notation: "compact", maximumFractionDigits: 3 }).format(
          data.marketCap,
        );
  const div =
    data.dividendRate == null
      ? "—"
      : `${num(data.dividendRate)}${data.dividendYield != null ? ` (${num(data.dividendYield)}%)` : ""}`;
  const earn = data.earningsDate
    ? new Date(data.earningsDate).toLocaleDateString(loc, { dateStyle: "medium" })
    : "—";
  const rows: [string, string][] = [
    [c.prev, num(data.previousClose)],
    [c.open, num(data.open)],
    [c.day, range(data.dayLow, data.dayHigh)],
    [c.w52, range(data.low52, data.high52)],
    [c.cap, cap],
    [c.beta, num(data.beta)],
    [c.pe, num(data.pe)],
    [c.eps, num(data.eps)],
    [c.div, div],
    [c.target, num(data.target)],
    [c.earn, earn],
  ];
  return (
    <dl className="mt-5 grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(([k, v]) => (
        <div
          key={k}
          className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm"
        >
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="text-right font-semibold tabular-nums">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
