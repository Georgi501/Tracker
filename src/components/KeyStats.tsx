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
    help: {
      beta: "Historical measure of how much the asset moved relative to the market; it does not predict future risk.",
      pe: "Share price divided by earnings per share over the latest 12 months. A high or negative value needs context.",
      eps: "Earnings per share over the latest 12 reported months.",
      div: "Annualized indicated dividend and yield; future payments are not guaranteed.",
      target: "Analyst consensus estimate for roughly one year ahead, not a guaranteed price.",
    },
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
    help: {
      beta: "Историческа мярка за движението на актива спрямо пазара; не предсказва бъдещия риск.",
      pe: "Цена на акцията, разделена на печалбата на акция за последните 12 месеца. Стойността трябва да се разглежда в контекст.",
      eps: "Печалба на акция за последните 12 отчетени месеца.",
      div: "Посочен годишен дивидент и доходност; бъдещите плащания не са гарантирани.",
      target:
        "Консенсусна оценка на анализаторите за около една година напред, не гарантирана цена.",
    },
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
    help: {
      beta: "Historisches Maß für die Bewegung des Werts im Verhältnis zum Markt; keine Vorhersage des künftigen Risikos.",
      pe: "Aktienkurs geteilt durch den Gewinn je Aktie der letzten 12 Monate. Hohe oder negative Werte brauchen Kontext.",
      eps: "Gewinn je Aktie für die letzten 12 gemeldeten Monate.",
      div: "Hochgerechnete angegebene Jahresdividende und Rendite; künftige Zahlungen sind nicht garantiert.",
      target: "Analystenkonsens für etwa ein Jahr im Voraus, kein garantierter Kurs.",
    },
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
    help: {
      beta: "Medida histórica del movimiento del activo frente al mercado; no predice el riesgo futuro.",
      pe: "Precio de la acción dividido por el beneficio por acción de los últimos 12 meses. Los valores altos o negativos requieren contexto.",
      eps: "Beneficio por acción de los últimos 12 meses publicados.",
      div: "Dividendo anual indicado y rentabilidad; los pagos futuros no están garantizados.",
      target:
        "Estimación de consenso de analistas a aproximadamente un año, no un precio garantizado.",
    },
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
    help: {
      beta: "Misura storica del movimento dell'asset rispetto al mercato; non prevede il rischio futuro.",
      pe: "Prezzo dell'azione diviso per l'utile per azione degli ultimi 12 mesi. Valori alti o negativi richiedono contesto.",
      eps: "Utile per azione degli ultimi 12 mesi riportati.",
      div: "Dividendo annuo indicato e rendimento; i pagamenti futuri non sono garantiti.",
      target: "Stima di consenso degli analisti per circa un anno, non un prezzo garantito.",
    },
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
  const rows: { label: string; value: string; help?: string }[] = [
    { label: c.prev, value: num(data.previousClose) },
    { label: c.open, value: num(data.open) },
    { label: c.day, value: range(data.dayLow, data.dayHigh) },
    { label: c.w52, value: range(data.low52, data.high52) },
    { label: c.cap, value: cap },
    { label: c.beta, value: num(data.beta), help: c.help.beta },
    { label: c.pe, value: num(data.pe), help: c.help.pe },
    { label: c.eps, value: num(data.eps), help: c.help.eps },
    { label: c.div, value: div, help: c.help.div },
    { label: c.target, value: num(data.target), help: c.help.target },
    { label: c.earn, value: earn },
  ];
  return (
    <dl className="mt-5 grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(({ label, value, help }) => (
        <div
          key={label}
          className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm"
        >
          <dt
            className="text-muted-foreground"
            title={help}
            aria-label={help ? `${label}. ${help}` : undefined}
          >
            {label}
          </dt>
          <dd className="text-right font-semibold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
