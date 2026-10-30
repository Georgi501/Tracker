import { languageLocale } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { getPortfolioHistory } from "@/lib/history.functions";
import { historyReturn, type HistoryPeriod } from "@/lib/history";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Clock3, Info, Lightbulb, Plus, Upload } from "lucide-react";
import { CountUp } from "@/components/Motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, Delta } from "@/components/AppShell";
import { AllocationCard } from "@/components/AllocationCard";
import { DashboardMovers } from "@/components/DashboardMovers";
import { ChartDataTable } from "@/components/ChartDataTable";
import { CompanyLogo } from "@/components/CompanyLogo";
import { WelcomeHero } from "@/components/WelcomeHero";
import { PortfolioHealth } from "@/components/PortfolioHealth";
import { WeeklyDigest } from "@/components/WeeklyDigest";
import { pct, usePortfolio } from "@/lib/store";
import { portfolioIrr } from "@/lib/portfolio";
import { fifoTaxReport } from "@/lib/tools";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Line, LineChart } from "recharts";
import { BENCHMARKS, benchmarkSeries, savedBenchmark, type BenchmarkSymbol } from "@/lib/benchmark";
import { getBenchmarkHistory } from "@/lib/benchmark.functions";
import { benchmarkCopy } from "@/lib/benchmark-i18n";
import type { Lang } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Capispot Portfolio Tracker" },
      {
        name: "description",
        content: "Net worth, performance, TTWROR & IRR and allocation of your investment portfolio",
      },
      { property: "og:title", content: "Capispot — Portfolio Dashboard" },
      {
        property: "og:description",
        content: "Track stocks, ETFs, crypto, cash and real estate in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const PERIODS: HistoryPeriod[] = ["1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y", "ALL"];
const CHART_NOTE = {
  en: {
    value:
      "Net worth is based on dated provider closes and historical FX. Missing history suppresses the chart.",
    performance:
      "Performance adjusts for dated buy/sell cash flows. Dividends are not included in historical valuation; index lines show price return, not total return.",
  },
  bg: {
    value:
      "Нетната стойност използва датирани цени на затваряне и исторически валутни курсове. При липсваща история графиката не се показва.",
    performance:
      "Доходността се коригира за датираните покупки и продажби. Дивидентите не са включени в историческата оценка; индексът показва ценова, не обща доходност.",
  },
  de: {
    value:
      "Das Nettovermögen basiert auf datierten Schlusskursen und historischen Wechselkursen. Bei fehlender Historie wird kein Diagramm angezeigt.",
    performance:
      "Die Rendite berücksichtigt datierte Käufe und Verkäufe. Dividenden sind nicht in der historischen Bewertung enthalten; der Index zeigt Kurs- statt Gesamtrendite.",
  },
  es: {
    value:
      "El patrimonio neto usa cierres fechados y tipos de cambio históricos. Si faltan datos históricos, no se muestra el gráfico.",
    performance:
      "La rentabilidad ajusta las compras y ventas fechadas. Los dividendos no se incluyen en la valoración histórica; el índice muestra rentabilidad de precio, no total.",
  },
  it: {
    value:
      "Il patrimonio netto usa chiusure datate e cambi storici. Se mancano dati storici, il grafico non viene mostrato.",
    performance:
      "Il rendimento corregge acquisti e vendite datati. I dividendi non sono inclusi nella valutazione storica; l’indice mostra il rendimento di prezzo, non totale.",
  },
} as const;

const METRIC_HELP: Record<
  Lang,
  {
    totalPnl: string;
    dayChange: string;
    ttwror: string;
    irr: string;
    invested: string;
    realized: string;
  }
> = {
  en: {
    totalPnl:
      "Current market value minus the remaining cost basis of open positions. Realized gains are shown separately.",
    dayChange:
      "Combined daily price movement of your holdings, based on the latest available provider quotes.",
    ttwror:
      "Time-weighted return for the selected period. It adjusts for dated buys and sells so deposits and withdrawals do not distort performance.",
    irr: "Annualized, money-weighted return estimated from your dated transactions and current portfolio value.",
    invested:
      "Remaining cost basis of your open positions; it is not the sum of every deposit or trade ever made.",
    realized:
      "Realized gain or loss on completed sales, calculated using FIFO from your recorded transactions.",
  },
  bg: {
    totalPnl:
      "Текуща пазарна стойност минус оставащата себестойност на отворените позиции. Реализираната печалба се показва отделно.",
    dayChange:
      "Общото дневно движение на цените в портфейла според последните налични котировки от доставчика.",
    ttwror:
      "Доходност с времево претегляне за избрания период. Коригира се за датирани покупки и продажби, така че вноските и тегленията да не изкривяват резултата.",
    irr: "Годишна доходност, претеглена спрямо паричните потоци, изчислена приблизително от датите на сделките и текущата стойност на портфейла.",
    invested:
      "Оставащата себестойност на отворените позиции; не е сборът на всички вноски или сделки.",
    realized:
      "Реализирана печалба или загуба от приключени продажби, изчислена по FIFO от записаните сделки.",
  },
  de: {
    totalPnl:
      "Aktueller Marktwert minus verbleibender Einstandskosten offener Positionen. Realisierte Gewinne werden separat angezeigt.",
    dayChange:
      "Kombinierte tägliche Kursbewegung deiner Positionen anhand der letzten verfügbaren Anbieter-Kurse.",
    ttwror:
      "Zeitgewichtete Rendite für den ausgewählten Zeitraum. Datierte Käufe und Verkäufe werden berücksichtigt, damit Ein- und Auszahlungen das Ergebnis nicht verzerren.",
    irr: "Annualisierte, geldgewichtete Rendite, geschätzt anhand deiner datierten Transaktionen und des aktuellen Portfoliowerts.",
    invested:
      "Verbleibende Einstandskosten deiner offenen Positionen; nicht die Summe aller Einzahlungen oder Trades.",
    realized:
      "Realisierter Gewinn oder Verlust aus abgeschlossenen Verkäufen, nach FIFO anhand deiner erfassten Transaktionen berechnet.",
  },
  es: {
    totalPnl:
      "Valor de mercado actual menos el coste restante de las posiciones abiertas. Las ganancias realizadas se muestran aparte.",
    dayChange:
      "Movimiento diario conjunto de tus posiciones según las últimas cotizaciones disponibles del proveedor.",
    ttwror:
      "Rentabilidad ponderada por tiempo del periodo seleccionado. Ajusta las compras y ventas fechadas para que los flujos de efectivo no distorsionen el resultado.",
    irr: "Rentabilidad anualizada ponderada por dinero, estimada a partir de tus operaciones fechadas y el valor actual de la cartera.",
    invested:
      "Coste restante de las posiciones abiertas; no es la suma de todos los depósitos u operaciones.",
    realized:
      "Ganancia o pérdida realizada en ventas completadas, calculada por FIFO a partir de tus operaciones registradas.",
  },
  it: {
    totalPnl:
      "Valore di mercato attuale meno il costo residuo delle posizioni aperte. I guadagni realizzati sono mostrati separatamente.",
    dayChange:
      "Movimento giornaliero complessivo delle posizioni, basato sulle ultime quotazioni disponibili del fornitore.",
    ttwror:
      "Rendimento ponderato per il tempo nel periodo selezionato. Considera acquisti e vendite datati, così i flussi di cassa non distorcono il risultato.",
    irr: "Rendimento annualizzato ponderato per il denaro, stimato dalle operazioni datate e dal valore attuale del portafoglio.",
    invested:
      "Costo residuo delle posizioni aperte; non è la somma di tutti i depositi o delle operazioni effettuate.",
    realized:
      "Guadagno o perdita realizzata sulle vendite completate, calcolata con il metodo FIFO dalle operazioni registrate.",
  },
};

const HISTORY_STATUS: Record<Lang, { error: string; retry: string }> = {
  en: { error: "History could not be loaded.", retry: "Try again" },
  bg: { error: "Историята не можа да се зареди.", retry: "Опитай отново" },
  de: { error: "Der Verlauf konnte nicht geladen werden.", retry: "Erneut versuchen" },
  es: { error: "No se pudo cargar el historial.", retry: "Reintentar" },
  it: { error: "Impossibile caricare lo storico.", retry: "Riprova" },
};

const DASHBOARD_COPY: Record<
  Lang,
  {
    quickActions: string;
    addInvestment: string;
    importCsv: string;
    chooseIndex: string;
    snapshot: string;
    unavailableSnapshot: string;
    largestPosition: (name: string, share: string) => string;
    recentActivity: string;
    viewAll: string;
    noRecentActivity: string;
    units: string;
  }
> = {
  en: {
    quickActions: "Quick actions",
    addInvestment: "Add investment",
    importCsv: "Import CSV",
    chooseIndex: "Choose an index",
    snapshot: "Portfolio snapshot",
    unavailableSnapshot: "Portfolio values are not currently available.",
    largestPosition: (name, share) =>
      `${name} is your largest position at ${share} of the portfolio.`,
    recentActivity: "Recent activity",
    viewAll: "View all",
    noRecentActivity: "No recent transactions.",
    units: "units",
  },
  bg: {
    quickActions: "Бързи действия",
    addInvestment: "Добави инвестиция",
    importCsv: "Импортирай CSV",
    chooseIndex: "Избери индекс",
    snapshot: "Портфолиото накратко",
    unavailableSnapshot: "Стойностите на портфолиото не са налични в момента.",
    largestPosition: (name, share) =>
      `${name} е най-голямата ти позиция с дял ${share} от портфолиото.`,
    recentActivity: "Последни трансакции",
    viewAll: "Виж всички",
    noRecentActivity: "Няма скорошни трансакции.",
    units: "бр.",
  },
  de: {
    quickActions: "Schnellzugriff",
    addInvestment: "Investment hinzufügen",
    importCsv: "CSV importieren",
    chooseIndex: "Index auswählen",
    snapshot: "Portfolio im Überblick",
    unavailableSnapshot: "Portfoliowerte sind derzeit nicht verfügbar.",
    largestPosition: (name, share) =>
      `${name} ist deine größte Position mit ${share} des Portfolios.`,
    recentActivity: "Letzte Aktivitäten",
    viewAll: "Alle anzeigen",
    noRecentActivity: "Keine aktuellen Transaktionen.",
    units: "Einheiten",
  },
  es: {
    quickActions: "Acciones rápidas",
    addInvestment: "Añadir inversión",
    importCsv: "Importar CSV",
    chooseIndex: "Elegir un índice",
    snapshot: "Resumen de cartera",
    unavailableSnapshot: "El valor de la cartera no está disponible en este momento.",
    largestPosition: (name, share) => `${name} es tu mayor posición con un ${share} de la cartera.`,
    recentActivity: "Actividad reciente",
    viewAll: "Ver todas",
    noRecentActivity: "No hay operaciones recientes.",
    units: "unidades",
  },
  it: {
    quickActions: "Azioni rapide",
    addInvestment: "Aggiungi investimento",
    importCsv: "Importa CSV",
    chooseIndex: "Scegli un indice",
    snapshot: "Riepilogo del portafoglio",
    unavailableSnapshot: "I valori del portafoglio non sono al momento disponibili.",
    largestPosition: (name, share) =>
      `${name} è la tua posizione principale con il ${share} del portafoglio.`,
    recentActivity: "Attività recenti",
    viewAll: "Vedi tutte",
    noRecentActivity: "Nessuna operazione recente.",
    units: "unità",
  },
};

function Dashboard() {
  const p = usePortfolio();
  const [period, setPeriod] = useState<HistoryPeriod>("1Y");
  const swipeX = useRef<number | null>(null);
  const [chartMode, setChartMode] = useState<"value" | "performance">("value");
  const [benchmark, setBenchmark] = useState<BenchmarkSymbol | "none">("none");
  const [benchmarkLoaded, setBenchmarkLoaded] = useState(false);
  useEffect(() => {
    try {
      setBenchmark(savedBenchmark(localStorage.getItem("folio-benchmark")));
    } catch {
      /* Storage is optional. */
    }
    setBenchmarkLoaded(true);
  }, []);
  useEffect(() => {
    if (!benchmarkLoaded) return;
    try {
      localStorage.setItem("folio-benchmark", benchmark);
    } catch {
      /* Storage is optional. */
    }
  }, [benchmark, benchmarkLoaded]);
  const c = benchmarkCopy[p.lang];
  const chartNote = CHART_NOTE[p.lang];
  const total = p.holdings.reduce((s, h) => s + h.value, 0);
  const portfolioValue = p.holdings.reduce(
    (sum, holding) => (Number.isFinite(holding.value) ? sum + holding.value : sum),
    0,
  );
  const cost = p.holdings.reduce((s, h) => s + h.costBasis, 0);
  const pnl = total - cost;
  const realized = fifoTaxReport(p.transactions).reduce((s, y) => s + y.realized, 0);
  const day = p.holdings.reduce((s, h) => s + h.dayChange, 0);
  const historyFn = useServerFn(getPortfolioHistory);
  const history = useQuery({
    queryKey: ["portfolio-history", p.user?.id, p.transactions, period, p.currency],
    queryFn: () => historyFn({ data: { period, currency: p.currency } }),
    enabled: !!p.user,
    staleTime: 60000,
  });
  const series = history.data?.points ?? [];
  const indexFn = useServerFn(getBenchmarkHistory);
  const first = series[0];
  const last = series.at(-1);
  const start = first ? new Date(first.t).toISOString().slice(0, 10) : "";
  const end = last ? new Date(last.t).toISOString().slice(0, 10) : "";
  const indexHistory = useQuery({
    queryKey: ["benchmark-history", benchmark, start, end],
    queryFn: () => {
      if (benchmark === "none") throw new Error("No benchmark selected");
      return indexFn({ data: { symbol: benchmark, start, end } });
    },
    enabled: benchmark !== "none" && !!first && !!last,
    staleTime: 300000,
  });
  const comparison = indexHistory.data?.index
    ? benchmarkSeries(
        series,
        indexHistory.data.index.prices,
        indexHistory.data.index.currency,
        p.currency,
        indexHistory.data.eur,
        indexHistory.data.gbp,
        indexHistory.data.jpy,
      )
    : [];
  const comparisonLast = comparison.at(-1);
  const performanceSeries: { t: number; v: number }[] = [];
  if (series.length > 1 && historyReturn(series) !== null) {
    let growth = 1;
    series.forEach((point, index) => {
      const prior = series[index - 1];
      if (prior) growth *= (point.v - point.flow) / prior.v;
      performanceSeries.push({ t: point.t, v: (growth - 1) * 100 });
    });
  }
  const performanceChart = performanceSeries.map((point, index) => ({
    ...point,
    benchmark: comparison[index]?.benchmark,
  }));
  const indexName = BENCHMARKS.find((b) => b.symbol === benchmark)?.name ?? "";
  const tw = historyReturn(series) ?? Number.NaN;
  const irrV =
    p.holdings.length && Number.isFinite(total) ? portfolioIrr(p.transactions, total) : Number.NaN;
  const chg = series.length > 1 ? (series.at(-1)?.v ?? 0) - (series[0]?.v ?? 0) : Number.NaN;
  const locale = languageLocale(p.lang);
  const dashboardCopy = DASHBOARD_COPY[p.lang];
  const largestHolding = p.holdings
    .filter((holding) => Number.isFinite(holding.value))
    .reduce<(typeof p.holdings)[number] | null>(
      (largest, holding) => (!largest || holding.value > largest.value ? holding : largest),
      null,
    );
  const largestShare =
    largestHolding && portfolioValue > 0
      ? new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(
          largestHolding.value / portfolioValue,
        )
      : null;
  const recentTransactions = [...p.transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);
  const fmtT = (t: number) =>
    new Date(t).toLocaleString(
      locale,
      ["YTD", "1Y", "3Y", "5Y", "ALL"].includes(period)
        ? { month: "short", year: "2-digit" }
        : { day: "numeric", month: "short" },
    );

  return (
    <div className="dashboard-grid grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
      <div className="lg:col-span-3">
        <WelcomeHero />
      </div>
      {p.user && p.holdings.length > 0 && (
        <Card className="flex flex-col gap-4 border-primary/20 bg-primary/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 lg:col-span-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Lightbulb size={19} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {dashboardCopy.snapshot}
              </p>
              <p className="mt-1 text-sm font-medium leading-relaxed">
                {largestHolding && largestShare
                  ? dashboardCopy.largestPosition(largestHolding.asset.name, largestShare)
                  : dashboardCopy.unavailableSnapshot}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
            <p className="w-full text-xs font-semibold text-muted-foreground sm:hidden">
              {dashboardCopy.quickActions}
            </p>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("folio-open-add-transaction"))}
              className="press inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Plus size={16} aria-hidden />
              {dashboardCopy.addInvestment}
            </button>
            <Link
              to="/brokers"
              className="press inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-semibold transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Upload size={15} aria-hidden />
              {dashboardCopy.importCsv}
            </Link>
            <button
              type="button"
              onClick={() => {
                setChartMode("performance");
                document
                  .getElementById("dashboard-benchmark")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className="press inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-semibold transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {dashboardCopy.chooseIndex}
              <ArrowRight size={15} aria-hidden />
            </button>
          </div>
        </Card>
      )}
      {p.user && p.holdings.length > 0 && (
        <>
          <Card className="dashboard-primary-card min-w-0 p-4 sm:p-5 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {p.t("netWorth")}
              </p>
              <div
                role="group"
                aria-label={p.t("performance")}
                className="rotating-border-frame relative flex rounded-lg border border-border bg-background/50 p-0.5"
              >
                <Button
                  size="sm"
                  variant={chartMode === "value" ? "secondary" : "ghost"}
                  aria-pressed={chartMode === "value"}
                  onClick={() => {
                    setChartMode("value");
                    setBenchmark("none");
                  }}
                >
                  {p.t("netWorth")}
                </Button>
                <Button
                  size="sm"
                  variant={chartMode === "performance" ? "secondary" : "ghost"}
                  aria-pressed={chartMode === "performance"}
                  onClick={() => setChartMode("performance")}
                >
                  {p.t("performance")}
                </Button>
              </div>
            </div>
            <h1 className="numeric-display mt-1 break-words text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              {p.user ? <CountUp value={total} format={(n) => p.money(n)} /> : "—"}
            </h1>
            <p className="mt-1 text-sm font-semibold">
              <Delta value={chg}>
                {Number.isFinite(chg)
                  ? new Intl.NumberFormat(languageLocale(p.lang), {
                      style: "currency",
                      currency: p.currency,
                      signDisplay: "exceptZero",
                    }).format(chg)
                  : "—"}{" "}
                ({pct(tw)})
              </Delta>{" "}
              <span className="font-normal text-muted-foreground">{p.t("perPeriod")}</span>
            </p>
            <div
              role="img"
              aria-label={`${chartMode === "performance" ? c.portfolio : p.t("netWorth")} ${p.t("chart")}, ${period}, ${chartMode === "performance" ? `${performanceSeries.length} ${p.t("dataPoints")}${performanceSeries.length ? `, ${p.t("latestValue")} ${pct(performanceSeries.at(-1)!.v)}` : ""}` : `${series.length} ${p.t("dataPoints")}${series.length ? `, ${p.t("latestValue")} ${p.money(series.at(-1)!.v)}` : ""}`}.`}
              className="relative mt-2 h-32 touch-pan-y sm:h-36 md:h-40"
              onTouchStart={(e) => (swipeX.current = e.touches[0]?.clientX ?? null)}
              onTouchEnd={(e) => {
                const x0 = swipeX.current;
                swipeX.current = null;
                const x1 = e.changedTouches[0]?.clientX;
                if (x0 === null || x1 === undefined || Math.abs(x1 - x0) < 60) return;
                const i = PERIODS.indexOf(period) + (x1 < x0 ? 1 : -1);
                const next = PERIODS[i];
                if (next) setPeriod(next);
              }}
            >
              {chartMode === "performance" ? (
                !performanceSeries.length ? (
                  <div className="py-8 text-sm text-muted-foreground">
                    <HistoryChartStatus
                      fetching={history.isFetching}
                      error={history.isError}
                      noData={p.t("noPeriodData")}
                      errorText={HISTORY_STATUS[p.lang].error}
                      retryText={HISTORY_STATUS[p.lang].retry}
                      onRetry={() => void history.refetch()}
                    />
                  </div>
                ) : (
                  <ResponsiveContainer>
                    <LineChart data={performanceChart} margin={{ top: comparison.length ? 34 : 0 }}>
                      <XAxis
                        dataKey="t"
                        tickFormatter={fmtT}
                        tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={40}
                      />
                      <YAxis
                        tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                        width={42}
                        tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <ChartTooltip
                        labelFormatter={(t) => fmtT(t as number)}
                        formatter={(v: number) => pct(v)}
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          color: "var(--foreground)",
                        }}
                      />
                      <Line
                        type="linear"
                        dataKey="v"
                        name={c.portfolio}
                        stroke="var(--primary)"
                        strokeWidth={2.5}
                        dot={false}
                        isAnimationActive={false}
                      />
                      {comparison.length > 0 && (
                        <Line
                          type="linear"
                          dataKey="benchmark"
                          name={indexName}
                          stroke="var(--chart-2)"
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                )
              ) : !series.length ? (
                <div className="py-8 text-sm text-muted-foreground">
                  <HistoryChartStatus
                    fetching={history.isFetching}
                    error={history.isError}
                    noData={p.t("noPeriodData")}
                    errorText={HISTORY_STATUS[p.lang].error}
                    retryText={HISTORY_STATUS[p.lang].retry}
                    onRetry={() => void history.refetch()}
                  />
                </div>
              ) : (
                <ResponsiveContainer>
                  <AreaChart data={series.map((d) => ({ t: d.t, v: d.v }))}>
                    <defs>
                      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="t"
                      tickFormatter={fmtT}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={40}
                    />
                    <YAxis hide domain={["dataMin", "dataMax"]} />
                    <ChartTooltip
                      labelFormatter={(t) => fmtT(t as number)}
                      formatter={(v: number) => [
                        new Intl.NumberFormat(locale, {
                          style: "currency",
                          currency: p.currency,
                        }).format(v),
                        p.t("value"),
                      ]}
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        color: "var(--foreground)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      fill="url(#g)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              {benchmark !== "none" && chartMode === "performance" && comparison.length > 0 && (
                <div className="absolute left-11 right-0 top-0 z-10 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] leading-tight sm:gap-x-4 sm:text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                    {c.portfolio}: <b>{comparisonLast ? pct(comparisonLast.portfolio) : "—"}</b>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-1.5 shrink-0 rounded-full bg-chart-2" />
                    {indexName}: <b>{comparisonLast ? pct(comparisonLast.benchmark) : "—"}</b>
                  </span>
                  <span className="hidden text-muted-foreground sm:inline">
                    {c.difference}:{" "}
                    <b>
                      {comparisonLast
                        ? `${(comparisonLast.portfolio - comparisonLast.benchmark).toFixed(2)} ${c.pp}`
                        : "—"}
                    </b>
                  </span>
                  <span
                    className="basis-full truncate text-[9px] text-muted-foreground"
                    title={c.priceReturn}
                  >
                    {c.priceReturn}
                  </span>
                </div>
              )}
              {benchmark !== "none" &&
                chartMode === "performance" &&
                performanceSeries.length > 0 &&
                !comparison.length && (
                  <p
                    role="status"
                    className="absolute left-11 top-2 z-10 text-xs text-muted-foreground"
                  >
                    {indexHistory.isFetching ? "…" : c.unavailable}
                  </p>
                )}
            </div>
            <ChartDataTable
              summary={p.t("viewChartData")}
              caption={`${chartMode === "performance" ? c.portfolio : p.t("netWorth")} ${p.t("chart")}, ${period}`}
              headers={[
                p.t("date"),
                chartMode === "performance" ? c.portfolio : p.t("netWorth"),
                ...(chartMode === "performance" && comparison.length ? [indexName] : []),
              ]}
              rows={
                chartMode === "performance"
                  ? performanceChart.map((point, index) => [
                      fmtT(point.t),
                      pct(point.v),
                      ...(comparison[index] ? [pct(comparison[index]!.benchmark)] : []),
                    ])
                  : series.map((point) => [fmtT(point.t), p.money(point.v)])
              }
            />
            <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-wrap gap-1">
                {PERIODS.map((x) => (
                  <Button
                    key={x}
                    size="sm"
                    variant={period === x ? "default" : "secondary"}
                    aria-pressed={period === x}
                    onClick={() => setPeriod(x)}
                  >
                    {x}
                  </Button>
                ))}
              </div>
              <label className="grid gap-1 text-xs text-muted-foreground">
                {c.compare}
                <Select
                  value={benchmark}
                  onValueChange={(value) => {
                    if (value === "none") {
                      setBenchmark("none");
                      return;
                    }
                    const selected = BENCHMARKS.find((item) => item.symbol === value);
                    if (selected) {
                      setBenchmark(selected.symbol);
                      setChartMode("performance");
                    }
                  }}
                >
                  <SelectTrigger
                    id="dashboard-benchmark"
                    aria-label={c.compare}
                    className="w-full text-foreground sm:w-52"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{c.none}</SelectItem>
                    {BENCHMARKS.map((b) => (
                      <SelectItem key={b.symbol} value={b.symbol}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {chartMode === "performance" ? chartNote.performance : chartNote.value}
            </p>
          </Card>
          <TooltipProvider>
            <div className="dashboard-metrics grid grid-cols-2 gap-2 sm:grid-cols-1 sm:gap-2.5">
              <Metric
                label={p.t("totalPnl")}
                help={METRIC_HELP[p.lang].totalPnl}
                value={
                  p.user ? <CountUp value={pnl} format={(n) => p.money(n, { sign: true })} /> : "—"
                }
                sub={pct((pnl / cost) * 100)}
                n={pnl}
              />
              <Metric
                label={p.t("dayChange")}
                help={METRIC_HELP[p.lang].dayChange}
                value={
                  p.user ? <CountUp value={day} format={(n) => p.money(n, { sign: true })} /> : "—"
                }
                sub={pct((day / (total - day)) * 100)}
                n={day}
              />
              <div className="contents sm:grid sm:grid-cols-2 sm:gap-2.5">
                <Metric
                  label={`${p.t("ttwror")} · ${period}`}
                  help={METRIC_HELP[p.lang].ttwror}
                  value={pct(tw)}
                  n={tw}
                />
                <Metric
                  label={p.t("irr")}
                  help={METRIC_HELP[p.lang].irr}
                  value={pct(irrV)}
                  n={irrV}
                />
              </div>
              <div className="contents sm:grid sm:grid-cols-2 sm:gap-2.5">
                <Metric
                  label={p.t("invested")}
                  help={METRIC_HELP[p.lang].invested}
                  value={p.user ? <CountUp value={cost} format={(n) => p.money(n)} /> : "—"}
                />
                <Metric
                  label={p.lang === "bg" ? "Реализирана P&L" : "Realized P&L"}
                  help={METRIC_HELP[p.lang].realized}
                  value={
                    p.user ? (
                      <CountUp value={realized} format={(n) => p.money(n, { sign: true })} />
                    ) : (
                      "—"
                    )
                  }
                  n={realized}
                />
              </div>
            </div>
          </TooltipProvider>
        </>
      )}
      <PortfolioHealth />
      <WeeklyDigest />
      <DashboardMovers />
      {p.holdings.length > 0 && <AllocationCard />}
      {p.holdings.length > 0 && (
        <Card className="lg:col-span-2">
          <div className="mb-3 flex justify-between">
            <h3 className="font-display font-semibold">{p.t("topHoldings")}</h3>
            <Link to="/holdings" className="text-sm font-semibold text-primary">
              {p.t("holdings")} →
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {p.holdings.slice(0, 6).map((h) => (
              <li key={h.asset.id}>
                <Link
                  to="/asset/$symbol"
                  params={{ symbol: h.asset.symbol }}
                  className="flex items-center gap-3 py-2.5 hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <CompanyLogo symbol={h.asset.symbol} type={h.asset.type} size={36} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{h.asset.name}</p>
                    <p className="text-xs text-muted-foreground">{p.t(h.asset.type)}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">{p.money(h.value)}</p>
                    <div className="flex items-center justify-end gap-2 text-xs">
                      <Delta value={h.pnl}>{pct(h.pnlPct)}</Delta>
                      <span className="text-muted-foreground">
                        {portfolioValue > 0 && Number.isFinite(h.value)
                          ? ((h.value / portfolioValue) * 100).toFixed(1)
                          : "0.0"}
                        % {p.lang === "bg" ? "от портфолиото" : "of portfolio"}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {p.user && p.holdings.length > 0 && (
        <Card className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-display font-semibold">
              <Clock3 size={16} className="text-muted-foreground" aria-hidden />
              {dashboardCopy.recentActivity}
            </h3>
            <Link
              to="/timeline"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
            >
              {dashboardCopy.viewAll}
              <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
          {recentTransactions.length ? (
            <ul className="divide-y divide-border">
              {recentTransactions.map((transaction) => {
                const asset = p.assets.find((item) => item.id === transaction.assetId);
                const amount =
                  transaction.kind === "dividend"
                    ? transaction.price
                    : transaction.quantity * transaction.price;
                const date = new Date(`${transaction.date}T12:00:00`);
                return (
                  <li key={transaction.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {asset?.name ?? p.t("asset")}
                        {asset?.symbol ? (
                          <span className="ml-1.5 font-normal text-muted-foreground">
                            {asset.symbol}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {p.t(transaction.kind)}
                        {transaction.kind !== "dividend" &&
                          ` · ${new Intl.NumberFormat(locale, { maximumFractionDigits: 6 }).format(transaction.quantity)} ${dashboardCopy.units}`}
                        {" · "}
                        {Number.isNaN(date.getTime())
                          ? transaction.date
                          : date.toLocaleDateString(locale, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                      </p>
                    </div>
                    <p className="shrink-0 text-right text-sm font-semibold tabular-nums">
                      {p.money(amount, { sign: transaction.kind === "dividend" })}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-6 text-sm text-muted-foreground">{dashboardCopy.noRecentActivity}</p>
          )}
        </Card>
      )}
    </div>
  );
}

function Metric({
  label,
  help,
  value,
  sub,
  n,
}: {
  label: string;
  help: string;
  value: ReactNode;
  sub?: string;
  n?: number;
}) {
  return (
    <Card className="dashboard-metric min-w-0 p-2.5">
      <p className="text-[10px] font-semibold uppercase leading-snug tracking-[0.08em] text-muted-foreground sm:text-[11px]">
        {label}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`${label}: ${help}`}
              className="ml-1 inline-flex align-middle text-muted-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Info size={12} aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-64 text-left normal-case tracking-normal">
            {help}
          </TooltipContent>
        </Tooltip>
      </p>
      <p className="numeric-display mt-0.5 break-words text-sm font-semibold tracking-tight sm:text-lg">
        {n === undefined ? value : <Delta value={n}>{value}</Delta>}
      </p>
      {sub && (
        <p className="mt-0.5 text-xs font-semibold tabular-nums">
          {n !== undefined ? <Delta value={n}>{sub}</Delta> : sub}
        </p>
      )}
    </Card>
  );
}

function HistoryChartStatus({
  fetching,
  error,
  noData,
  errorText,
  retryText,
  onRetry,
}: {
  fetching: boolean;
  error: boolean;
  noData: string;
  errorText: string;
  retryText: string;
  onRetry: () => void;
}) {
  if (fetching) return <Skeleton className="h-32 w-full sm:h-36 md:h-40" />;
  if (!error) return <p className="py-8 text-sm text-muted-foreground">{noData}</p>;
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 py-8">
      <p className="text-sm text-muted-foreground">{errorText}</p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        {retryText}
      </Button>
    </div>
  );
}
