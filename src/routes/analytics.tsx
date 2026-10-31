import { ChartDataTable } from "@/components/ChartDataTable";
import { ChartTooltipContent } from "@/components/ChartTooltipContent";
import { EtfOverlapCard } from "@/components/EtfOverlapCard";
import { Heatmap, HeatmapSilhouette, ProGate } from "@/components/ProFeatures";
import { proCopy } from "@/lib/pro-i18n";
import { languageLocale } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import { AllocationBreakdown } from "@/components/AllocationBreakdown";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPortfolioHistory } from "@/lib/history.functions";
import { getBenchmarkHistory } from "@/lib/benchmark.functions";
import { BENCHMARKS, benchmarkSeries, savedBenchmark, type BenchmarkSymbol } from "@/lib/benchmark";
import { riskMetrics } from "@/lib/tools";
import type { PortfolioPoint } from "@/lib/history";
import { analyticsCopy } from "@/lib/analytics-i18n";
import {
  analyticsReportCsv,
  analyticsReportHtml,
  type AnalyticsReport,
  type AnalyticsReportSection,
} from "@/lib/analytics-report";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/AppShell";
import { pct, usePortfolio } from "@/lib/store";
import { assetCurrency, groupBy } from "@/lib/portfolio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  comparisonReturns,
  customRange,
  dateInput,
  DAY,
  periodRange,
  previousRange,
  rangeReturn,
  RETURN_BUCKETS,
  RETURN_PERIODS,
  type ReturnPeriod,
} from "@/lib/return-periods";
import type { Lang } from "@/lib/i18n";

const EMPTY_COPY: Record<
  Lang,
  { title: string; body: string; signIn: string; sample: string; add: string }
> = {
  en: {
    title: "Your portfolio analytics start here",
    body: "Add your investments to see returns, allocation and risk based on your recorded history.",
    signIn: "Create a free account",
    sample: "Explore a sample portfolio",
    add: "Add your first holding",
  },
  bg: {
    title: "Анализите започват с твоето портфолио",
    body: "Добави инвестициите си, за да видиш доходност, разпределение и риск според записаната история.",
    signIn: "Създай безплатен профил",
    sample: "Разгледай примерно портфолио",
    add: "Добави първата си позиция",
  },
  de: {
    title: "Deine Portfolioanalyse beginnt hier",
    body: "Füge deine Anlagen hinzu, um Rendite, Aufteilung und Risiko anhand deiner erfassten Historie zu sehen.",
    signIn: "Kostenloses Konto erstellen",
    sample: "Beispielportfolio ansehen",
    add: "Erste Position hinzufügen",
  },
  es: {
    title: "El análisis de tu cartera empieza aquí",
    body: "Añade tus inversiones para ver rentabilidad, distribución y riesgo según tu historial registrado.",
    signIn: "Crear una cuenta gratis",
    sample: "Explorar una cartera de ejemplo",
    add: "Añadir tu primera posición",
  },
  it: {
    title: "L'analisi del portafoglio inizia qui",
    body: "Aggiungi i tuoi investimenti per vedere rendimento, allocazione e rischio in base alla cronologia registrata.",
    signIn: "Crea un account gratuito",
    sample: "Esplora un portafoglio di esempio",
    add: "Aggiungi la prima posizione",
  },
};

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Capispot Portfolio Tracker" },
      {
        name: "description",
        content: "Portfolio returns by period and breakdown by asset, currency and asset class.",
      },
      { property: "og:title", content: "Analytics — Capispot" },
      {
        property: "og:description",
        content: "Returns by period, plus breakdowns by asset, currency and class.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Analytics,
});

function Analytics() {
  const p = usePortfolio();
  const gradientId = useId().replaceAll(":", "");
  const [period, setPeriod] = useState<ReturnPeriod | "CUSTOM">("ALL");
  const [anchor] = useState(() => Date.parse(`${dateInput(Date.now())}T00:00:00Z`) + DAY);
  const today = dateInput(anchor - DAY);
  const [startDate, setStartDate] = useState(dateInput(anchor - 30 * DAY));
  const [endDate, setEndDate] = useState(today);
  const [compare, setCompare] = useState(false);
  const [benchmark, setBenchmark] = useState<BenchmarkSymbol | "none">("none");
  const [benchmarkLoaded, setBenchmarkLoaded] = useState(false);
  useEffect(() => {
    try {
      setBenchmark(savedBenchmark(localStorage.getItem("folio-benchmark")));
    } catch (error) {
      console.error("Unable to read benchmark preference", error);
    }
    setBenchmarkLoaded(true);
  }, []);
  useEffect(() => {
    if (!benchmarkLoaded) return;
    try {
      localStorage.setItem("folio-benchmark", benchmark);
    } catch (error) {
      console.error("Unable to save benchmark preference", error);
    }
  }, [benchmark, benchmarkLoaded]);
  const portfolioValuationAvailable = p.holdings.every((holding) => Number.isFinite(holding.value));
  const total = portfolioValuationAvailable
    ? p.holdings.reduce((sum, holding) => sum + holding.value, 0)
    : Number.NaN;
  const locale = languageLocale(p.lang);
  const c = analyticsCopy[p.lang];
  const empty = EMPTY_COPY[p.lang];
  const historyFn = useServerFn(getPortfolioHistory);
  const historyQuery = useQuery({
    queryKey: ["portfolio-history", p.user?.id, p.transactions, "ALL", p.currency],
    queryFn: () => historyFn({ data: { period: "ALL", currency: p.currency } }),
    enabled: !!p.user,
    staleTime: 60000,
  });
  const history: PortfolioPoint[] = historyQuery.data?.points ?? [];
  const range =
    period === "CUSTOM"
      ? customRange(startDate, endDate, today)
      : periodRange(period, anchor, history[0]?.t);
  const formatDate = (t: number) =>
    new Date(t).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  const rangeLabel = (r: { start: number; end: number }) =>
    `${formatDate(r.start)} – ${formatDate(r.end - 1)}`;
  const longSpan = !!range && range.end - range.start > 400 * DAY;
  const tickLabel = (t: number) =>
    new Date(t).toLocaleDateString(
      locale,
      longSpan
        ? { month: "short", year: "2-digit", timeZone: "UTC" }
        : { day: "numeric", month: "short", timeZone: "UTC" },
    );
  const returns = range
    ? comparisonReturns(
        history,
        range,
        period === "CUSTOM"
          ? Math.min(12, Math.max(1, Math.ceil((range.end - range.start) / DAY)))
          : RETURN_BUCKETS[period],
      ).map((r) => ({
        ...r,
        label: tickLabel(r.t),
      }))
    : [];
  const currentReturn = range ? rangeReturn(history, range) : null;
  const previousReturn = range ? rangeReturn(history, previousRange(range)) : null;
  const activeHistory = range
    ? history.filter((point) => point.t >= range.start && point.t < range.end)
    : [];
  const benchmarkBaseline = range
    ? history.filter((point) => point.t < range.start).at(-1)
    : undefined;
  const benchmarkPoints = activeHistory.length
    ? [...(benchmarkBaseline ? [benchmarkBaseline] : []), ...activeHistory]
    : [];
  const activeStart = benchmarkPoints[0] ? dateInput(benchmarkPoints[0].t) : "";
  const activeEnd = benchmarkPoints.at(-1) ? dateInput(benchmarkPoints.at(-1)!.t) : "";
  const benchmarkFn = useServerFn(getBenchmarkHistory);
  const benchmarkQuery = useQuery({
    queryKey: ["analytics-benchmark", benchmark, activeStart, activeEnd],
    queryFn: () => {
      if (benchmark === "none" || !activeStart || !activeEnd)
        throw new Error("Benchmark dates are unavailable");
      return benchmarkFn({ data: { symbol: benchmark, start: activeStart, end: activeEnd } });
    },
    enabled:
      !!p.isPro &&
      benchmarkLoaded &&
      benchmark !== "none" &&
      !!activeStart &&
      !!activeEnd &&
      activeStart <= activeEnd,
    staleTime: 300000,
  });
  const benchmarkData =
    benchmark !== "none" && benchmarkQuery.data?.index
      ? benchmarkSeries(
          benchmarkPoints,
          benchmarkQuery.data.index.prices,
          benchmarkQuery.data.index.currency,
          p.currency,
          benchmarkQuery.data.eur,
          benchmarkQuery.data.gbp,
          benchmarkQuery.data.jpy,
        )
          .map((point) => ({
            ...point,
            label: tickLabel(point.t),
          }))
          .filter((point) => !range || point.t >= range.start)
      : [];
  const risk = riskMetrics(activeHistory);
  const periodExtremes = returns.filter(
    (item): item is typeof item & { current: number } => item.current !== null,
  );
  const bestInterval = periodExtremes.reduce<(typeof periodExtremes)[number] | null>(
    (best, item) => (!best || item.current > best.current ? item : best),
    null,
  );
  const worstInterval = periodExtremes.reduce<(typeof periodExtremes)[number] | null>(
    (worst, item) => (!worst || item.current < worst.current ? item : worst),
    null,
  );
  const contrib = p.holdings
    .filter((h) => Number.isFinite(h.pnl))
    .map((h) => ({ name: h.asset.symbol, v: h.pnl, pct: h.pnlPct }))
    .sort((a, b) => b.v - a.v);
  const exposures = [
    {
      title: p.t("byClass"),
      rows: groupBy(
        p.holdings.filter((h) => Number.isFinite(h.value)),
        (h) => p.t(h.asset.type),
      ),
    },
    {
      title: c.bySector,
      rows: groupBy(
        p.holdings.filter((h) => Number.isFinite(h.value)),
        (h) => p.label(h.asset.sector),
      ),
    },
    {
      title: c.byRegion,
      rows: groupBy(
        p.holdings.filter((h) => Number.isFinite(h.value)),
        (h) => p.label(h.asset.region),
      ),
    },
    {
      title: p.t("byCurrency"),
      rows: groupBy(
        p.holdings.filter((h) => Number.isFinite(h.value)),
        (h) => assetCurrency(h.asset),
      ),
    },
  ];
  const pricedHoldings = p.holdings.filter(
    (holding) => Number.isFinite(holding.asset.price) && holding.asset.price > 0,
  );
  const missingQuoteCount = p.holdings.length - pricedHoldings.length;
  const quoteTimes = pricedHoldings
    .map((holding) => holding.asset.quoteAt)
    .filter(
      (timestamp): timestamp is string => !!timestamp && Number.isFinite(Date.parse(timestamp)),
    )
    .sort((a, b) => Date.parse(b) - Date.parse(a));
  const latestQuote = quoteTimes[0]
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(quoteTimes[0]),
      )
    : "—";
  const reportSections: AnalyticsReportSection[] = [
    {
      title: c.summary,
      columns: [c.metric, c.value],
      rows: [
        [c.reportPeriod, range ? rangeLabel(range) : c.unavailable],
        [c.currency, p.currency],
        [p.t("netWorth"), p.money(total)],
        [p.t("selectedPeriod"), currentReturn === null ? "—" : pct(currentReturn)],
        [c.selectedBenchmark, benchmark === "none" ? c.benchmarkNone : benchmark],
        [c.volatility, risk ? pct(risk.volatility) : c.unavailable],
        [c.drawdown, risk ? pct(risk.maxDrawdown) : c.unavailable],
        [c.sharpe, risk ? risk.sharpe.toFixed(2) : c.unavailable],
        [c.sortino, risk ? risk.sortino.toFixed(2) : c.unavailable],
      ],
    },
    ...exposures.map((exposure) => ({
      title: exposure.title,
      columns: [c.category, c.marketValue, c.weight],
      rows: exposure.rows.map((row) => [
        row.name,
        p.money(row.value),
        portfolioValuationAvailable && total > 0
          ? `${((row.value / total) * 100).toFixed(2)}%`
          : "—",
      ]),
    })),
    {
      title: c.holdings,
      columns: [c.asset, c.quantity, c.marketValue, c.weight, c.unrealizedPnl, c.return],
      rows: p.holdings.map((holding) => [
        `${holding.asset.symbol} — ${holding.asset.name}`,
        Number.isFinite(holding.quantity) ? holding.quantity : null,
        p.money(holding.value),
        portfolioValuationAvailable && total > 0
          ? `${((holding.value / total) * 100).toFixed(2)}%`
          : "—",
        p.money(holding.pnl, { sign: true }),
        pct(holding.pnlPct),
      ]),
    },
    {
      title: c.periodReturns,
      columns: [c.interval, c.return],
      rows: returns.map((item) => [
        `${formatDate(item.t)}${compare ? ` / ${formatDate(item.previousT)}` : ""}`,
        item.current === null ? c.unavailable : pct(item.current),
      ]),
    },
    ...(benchmark !== "none"
      ? [
          {
            title: `${c.benchmark}: ${benchmark}`,
            columns: [c.interval, c.return],
            rows: benchmarkData.map((item) => [
              item.label,
              `${pct(item.portfolio)} / ${pct(item.benchmark)}`,
            ]),
          },
        ]
      : []),
    {
      title: c.pnlAttribution,
      columns: [c.asset, c.contribution],
      rows: contrib.map((item) => [item.name, p.money(item.v, { sign: true })]),
    },
    {
      title: c.dataQuality,
      columns: [c.metric, c.value],
      rows: [
        [c.availableQuotes, pricedHoldings.length],
        [c.missingQuotes, missingQuoteCount],
        [c.latestQuote, latestQuote],
        [c.historyScopeLabel, c.historyScope],
        [
          c.historyStatus,
          !historyQuery.data
            ? "—"
            : historyQuery.data.unavailable
              ? c.unavailable
              : historyQuery.data.points.length
                ? c.available
                : c.historyInsufficient,
        ],
        [c.currency, c.currencyNote],
      ],
    },
  ];
  const report: AnalyticsReport = {
    title: c.reportTitle,
    generated: `${c.reportGenerated}: ${new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date())}`,
    sections: reportSections,
  };
  const downloadReport = () => {
    const blob = new Blob(["\uFEFF", analyticsReportCsv(report)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `capispot-analytics-${today}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const printReport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error(c.popupBlocked);
      return;
    }
    printWindow.document.open();
    printWindow.document.write(analyticsReportHtml(report));
    printWindow.document.close();
    window.setTimeout(() => printWindow.print(), 400);
  };

  if (!p.user || (!p.holdings.length && !p.transactions.length))
    return (
      <Card className="mx-auto max-w-2xl py-10 text-center">
        <h1 className="font-display text-2xl font-bold">{p.t("analytics")}</h1>
        <h2 className="mt-4 font-display text-xl font-semibold">{empty.title}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {empty.body}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {p.user ? (
            <Link
              to="/holdings"
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              {empty.add}
            </Link>
          ) : (
            <>
              <Link
                to="/auth"
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                {empty.signIn}
              </Link>
              <Link
                to="/demo"
                className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold"
              >
                {empty.sample}
              </Link>
            </>
          )}
        </div>
      </Card>
    );

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <h1 className="font-display text-2xl font-bold lg:col-span-3">{p.t("analytics")}</h1>
      <Card className="lg:col-span-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display font-semibold">{p.t("returnsByPeriod")}</h3>
          <div className="flex flex-wrap gap-1">
            {[...RETURN_PERIODS, "CUSTOM" as const].map((x) => (
              <Button
                key={x}
                size="sm"
                variant={period === x ? "default" : "secondary"}
                aria-pressed={period === x}
                onClick={() => setPeriod(x)}
              >
                {x === "CUSTOM" ? p.t("customPeriod") : x}
              </Button>
            ))}
          </div>
        </div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          {period === "CUSTOM" && (
            <div className="flex flex-wrap gap-3">
              <label className="grid gap-1 text-xs text-muted-foreground" htmlFor="returns-start">
                {p.t("startDate")}
                <Input
                  id="returns-start"
                  type="date"
                  className="w-44 text-foreground"
                  value={startDate}
                  max={endDate || today}
                  onChange={(e) => setStartDate(e.target.value)}
                  aria-invalid={!range}
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground" htmlFor="returns-end">
                {p.t("endDate")}
                <Input
                  id="returns-end"
                  type="date"
                  className="w-44 text-foreground"
                  value={endDate}
                  min={startDate}
                  max={today}
                  onChange={(e) => setEndDate(e.target.value)}
                  aria-invalid={!range}
                />
              </label>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm" htmlFor="returns-compare">
            <Switch id="returns-compare" checked={compare} onCheckedChange={setCompare} />
            {p.t("comparePrevious")}
          </label>
        </div>
        {!range && (
          <p role="alert" className="mb-4 text-sm text-destructive">
            {p.t("invalidPeriod")}
          </p>
        )}
        {range && (
          <div className="mb-4 flex flex-wrap gap-x-8 gap-y-3 text-sm" aria-live="polite">
            <div>
              <p className="text-muted-foreground">{p.t("selectedPeriod")}</p>
              <p className="font-semibold">{currentReturn === null ? "—" : pct(currentReturn)}</p>
              <p className="text-xs text-muted-foreground">{rangeLabel(range)}</p>
            </div>
            {compare && (
              <>
                <div>
                  <p className="text-muted-foreground">{p.t("previousPeriod")}</p>
                  <p className="font-semibold">
                    {previousReturn === null ? "—" : pct(previousReturn)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {rangeLabel(previousRange(range))}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{p.t("returnDifference")}</p>
                  <p className="font-semibold">
                    {currentReturn === null || previousReturn === null
                      ? "—"
                      : `${(currentReturn - previousReturn).toFixed(2)} ${p.t("percentagePoints")}`}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
        {range && currentReturn === null && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {historyQuery.isFetching
              ? "…"
              : history[0] && range.start < history[0].t
                ? c.historyStarts.replace("{date}", formatDate(history[0].t))
                : p.t("noPeriodData")}
          </p>
        )}
        {range && currentReturn !== null && (
          <div
            role="img"
            aria-label={`${p.t("performance")} ${c.periodReturns} ${p.t("chart")}, ${returns.length} ${p.t("dataPoints")}${returns.length ? `, ${p.t("latestValue")} ${returns.at(-1)!.current == null ? "—" : pct(returns.at(-1)!.current!)}` : ""}.`}
            className="h-60"
          >
            <ResponsiveContainer>
              <BarChart data={returns}>
                <defs>
                  <linearGradient id={`${gradientId}-positive`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--success)" />
                    <stop offset="100%" stopColor="var(--success)" stopOpacity={0.65} />
                  </linearGradient>
                  <linearGradient id={`${gradientId}-negative`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--destructive)" />
                    <stop offset="100%" stopColor="var(--destructive)" stopOpacity={0.65} />
                  </linearGradient>
                  <linearGradient id={`${gradientId}-previous`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.65} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  vertical={false}
                  strokeOpacity={0.55}
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <YAxis
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  width={40}
                />
                <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.7} />
                <Tooltip
                  cursor={{ fill: "var(--secondary)" }}
                  content={(props) => (
                    <ChartTooltipContent
                      {...props}
                      formatValue={(value) => pct(Number(value))}
                      formatLabel={(_, payload) => {
                        const row = payload[0]?.payload;
                        return row
                          ? `${formatDate(row["t"] as number)}${compare ? ` / ${formatDate(row["previousT"] as number)}` : ""}`
                          : "";
                      }}
                    />
                  )}
                />
                <Bar
                  dataKey="current"
                  name={p.t("selectedPeriod")}
                  maxBarSize={36}
                  radius={[4, 4, 4, 4]}
                  activeBar={{ filter: "brightness(1.15)" }}
                >
                  {returns.map((r, i) => (
                    <Cell
                      key={i}
                      fill={
                        (r.current ?? 0) >= 0
                          ? `url(#${gradientId}-positive)`
                          : `url(#${gradientId}-negative)`
                      }
                    />
                  ))}
                </Bar>
                {compare && (
                  <Bar
                    dataKey="previous"
                    name={p.t("previousPeriod")}
                    fill={`url(#${gradientId}-previous)`}
                    maxBarSize={36}
                    radius={[4, 4, 4, 4]}
                    activeBar={{ filter: "brightness(1.15)" }}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {range && currentReturn !== null && (
          <ChartDataTable
            summary={p.t("viewChartData")}
            caption={`${p.t("performance")} ${c.periodReturns}`}
            headers={[
              p.t("date"),
              p.t("selectedPeriod"),
              ...(compare ? [p.t("previousPeriod")] : []),
            ]}
            rows={returns.map((item) => [
              formatDate(item.t),
              item.current == null ? "—" : pct(item.current),
              ...(compare ? [item.previous == null ? "—" : pct(item.previous)] : []),
            ])}
          />
        )}
        {compare && range && (
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-success" />
              {p.t("selectedPeriod")}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-chart-2" />
              {p.t("previousPeriod")}
            </span>
            {previousReturn === null && <span>{p.t("noComparisonData")}</span>}
          </div>
        )}
      </Card>
      <Breakdown
        title={p.t("byAsset")}
        colorOffset={4}
        data={groupBy(
          p.holdings.filter((h) => Number.isFinite(h.value)),
          (h) => h.asset.symbol,
        )}
      />
      <Breakdown
        title={p.t("byCurrency")}
        colorOffset={3}
        data={groupBy(
          p.holdings.filter((h) => Number.isFinite(h.value)),
          (h) => assetCurrency(h.asset),
        )}
      />
      <Breakdown
        title={p.t("byClass")}
        colorOffset={1}
        data={groupBy(
          p.holdings.filter((h) => Number.isFinite(h.value)),
          (h) => p.t(h.asset.type),
        )}
      />
      <Card className="lg:col-span-3">
        <h3 className="font-display mb-1 font-semibold">{c.attribution}</h3>
        <p className="mb-4 text-xs text-muted-foreground">{c.attributionNote}</p>
        <div
          role="img"
          aria-label={`${c.attribution}: ${contrib.map((item) => `${item.name}, ${p.money(item.v, { sign: true })}`).join("; ")}.`}
        >
          {(() => {
            const max = Math.max(...contrib.map((x) => Math.abs(x.v)), 1);
            const net = contrib.reduce((s, x) => s + x.v, 0);
            return (
              <>
                <div className="mb-4 flex items-baseline gap-2">
                  <span
                    className={`font-display text-2xl font-bold tabular-nums ${net >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {p.money(net, { sign: true })}
                  </span>
                </div>
                <ul className="divide-y divide-border/60">
                  {contrib.map((x) => {
                    const up = x.v >= 0;
                    const width = (Math.abs(x.v) / max) * 50;
                    return (
                      <li
                        key={x.name}
                        className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 py-2.5 sm:grid-cols-[5.5rem_1fr_auto_4.5rem]"
                      >
                        <span className="truncate text-sm font-semibold">{x.name}</span>
                        <div className="relative h-2.5 rounded-full bg-muted/70">
                          <span className="absolute inset-y-[-3px] left-1/2 w-px bg-border" />
                          <span
                            className={`absolute inset-y-0 rounded-full ${up ? "bg-success" : "bg-destructive"}`}
                            style={
                              up
                                ? { left: "50%", width: `${width}%` }
                                : { right: "50%", width: `${width}%` }
                            }
                          />
                        </div>
                        <span
                          className={`numeric-display text-right text-sm font-semibold tabular-nums ${up ? "text-success" : "text-destructive"}`}
                        >
                          {p.money(x.v, { sign: true })}
                        </span>
                        <span
                          className={`hidden rounded-full px-2 py-0.5 text-center text-xs font-medium tabular-nums sm:block ${up ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}
                        >
                          {up ? "+" : ""}
                          {x.pct.toFixed(1)}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            );
          })()}
        </div>
      </Card>
      <Card className="lg:col-span-3">
        <h3 className="font-display mb-1 font-semibold">{c.dataQuality}</h3>
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-muted-foreground">{c.availableQuotes}</p>
            <p className="font-semibold">{pricedHoldings.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{c.missingQuotes}</p>
            <p className="font-semibold">{missingQuoteCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{c.latestQuote}</p>
            <p className="font-semibold">{latestQuote}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{c.historyStatus}</p>
            <p className="font-semibold">
              {historyQuery.isFetching
                ? "…"
                : historyQuery.data?.unavailable
                  ? c.unavailable
                  : historyQuery.data?.points.length
                    ? c.available
                    : historyQuery.data
                      ? c.historyInsufficient
                      : "—"}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{c.currencyNote}</p>
        <p className="mt-1 text-xs text-muted-foreground">{c.historyScope}</p>
        {p.holdings.some((holding) => !holding.asset.quoteAt) && (
          <p className="mt-1 text-xs text-muted-foreground">{c.quoteTimestampMissing}</p>
        )}
      </Card>
      <ProGate
        className="lg:col-span-3"
        title={p.lang === "bg" ? "Припокриване на ETF-и" : "ETF overlap"}
        desc={
          p.lang === "bg"
            ? "Виж скритата експозиция към общи компании във фондовете и директните позиции."
            : "See shared underlying company exposure across ETFs and direct holdings."
        }
        preview={<div className="h-36 rounded-lg bg-primary/20" />}
      >
        <EtfOverlapCard />
      </ProGate>
      <ProGate
        className="lg:col-span-3"
        title={c.benchmark}
        desc={c.reportDescription}
        preview={
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-36 rounded-lg bg-primary/20" />
            <div className="h-36 rounded-lg bg-muted" />
          </div>
        }
      >
        <div className="grid gap-5 lg:grid-cols-3">
          <section className="lg:col-span-2" aria-labelledby="analytics-benchmark-title">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 id="analytics-benchmark-title" className="font-semibold">
                  {c.benchmark}
                </h4>
                <p className="text-xs text-muted-foreground">{c.benchmarkDescription}</p>
              </div>
              <label className="grid gap-1 text-xs text-muted-foreground">
                {c.benchmarkLabel}
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  value={benchmark}
                  onChange={(event) => setBenchmark(savedBenchmark(event.currentTarget.value))}
                >
                  <option value="none">{c.benchmarkNone}</option>
                  {BENCHMARKS.map((item) => (
                    <option key={item.symbol} value={item.symbol}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {benchmark !== "none" && benchmarkData.length > 0 ? (
              <div
                role="img"
                aria-label={`${c.benchmark}: ${c.portfolioReturn} ${benchmarkData.length ? pct(benchmarkData.at(-1)!.portfolio) : "—"}; ${c.indexPriceReturn} ${benchmarkData.length ? pct(benchmarkData.at(-1)!.benchmark) : "—"}.`}
                className="h-64"
              >
                <ResponsiveContainer>
                  <LineChart data={benchmarkData}>
                    <CartesianGrid
                      stroke="var(--border)"
                      strokeDasharray="3 3"
                      vertical={false}
                      strokeOpacity={0.55}
                    />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    />
                    <YAxis
                      tickFormatter={(value: number) => `${value.toFixed(0)}%`}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                      width={44}
                    />
                    <Tooltip
                      content={(props) => (
                        <ChartTooltipContent
                          {...props}
                          formatValue={(value) => pct(Number(value))}
                        />
                      )}
                    />
                    <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.7} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="portfolio"
                      name={c.portfolioReturn}
                      stroke="var(--primary)"
                      dot={false}
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="benchmark"
                      name={c.indexPriceReturn}
                      stroke="var(--chart-2)"
                      dot={false}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : benchmark !== "none" ? (
              <p
                role={benchmarkQuery.isError ? "alert" : "status"}
                className="py-12 text-center text-sm text-muted-foreground"
              >
                {benchmarkQuery.isFetching
                  ? "…"
                  : benchmarkQuery.data?.unavailable || benchmarkQuery.isError
                    ? c.benchmarkUnavailable
                    : c.benchmarkUnavailable}
              </p>
            ) : null}
            {benchmarkData.length > 0 && (
              <ChartDataTable
                summary={p.t("viewChartData")}
                caption={c.benchmark}
                headers={[p.t("date"), c.portfolioReturn, c.indexPriceReturn]}
                rows={benchmarkData.map((item) => [
                  item.label,
                  pct(item.portfolio),
                  pct(item.benchmark),
                ])}
              />
            )}
            <p className="mt-2 text-xs text-muted-foreground">{c.benchmarkCaveat}</p>
          </section>
          <section aria-labelledby="analytics-risk-title">
            <h4 id="analytics-risk-title" className="font-semibold">
              {c.risk}
            </h4>
            <p className="mb-3 text-xs text-muted-foreground">{c.riskDescription}</p>
            {risk ? (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">{c.volatility}</dt>
                  <dd className="font-semibold">{pct(risk.volatility, false)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{c.drawdown}</dt>
                  <dd className="font-semibold">{pct(risk.maxDrawdown, false)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{c.sharpe}</dt>
                  <dd className="font-semibold">{risk.sharpe.toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{c.sortino}</dt>
                  <dd className="font-semibold">{risk.sortino.toFixed(2)}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">{c.riskUnavailable}</p>
            )}
            <div className="mt-4 grid gap-2 text-sm">
              <p>
                <span className="text-muted-foreground">{c.bestPeriod}: </span>
                {bestInterval ? `${bestInterval.label} (${pct(bestInterval.current)})` : "—"}
              </p>
              <p>
                <span className="text-muted-foreground">{c.worstPeriod}: </span>
                {worstInterval ? `${worstInterval.label} (${pct(worstInterval.current)})` : "—"}
              </p>
            </div>
          </section>
          <section
            className="sm:col-span-2 lg:col-span-3"
            aria-labelledby="analytics-exposure-title"
          >
            <h4 id="analytics-exposure-title" className="mb-3 font-semibold">
              {c.exposures}
            </h4>
            <div className="grid gap-4 md:grid-cols-2">
              {exposures
                .filter(
                  (exposure) => exposure.title === c.bySector || exposure.title === c.byRegion,
                )
                .map((exposure) => (
                  <Breakdown key={exposure.title} title={exposure.title} data={exposure.rows} />
                ))}
            </div>
          </section>
          <section className="sm:col-span-2 lg:col-span-3 border-t border-border pt-4">
            <h4 className="font-semibold">{c.report}</h4>
            <p className="mb-3 text-xs text-muted-foreground">{c.reportDescription}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={downloadReport}>
                {c.downloadCsv}
              </Button>
              <Button size="sm" variant="secondary" onClick={printReport}>
                {c.savePdf}
              </Button>
            </div>
          </section>
        </div>
      </ProGate>
      <ProGate
        className="lg:col-span-3"
        title={proCopy[p.lang].heatmap}
        desc={proCopy[p.lang].heatmapDesc}
        preview={<HeatmapSilhouette />}
      >
        <Heatmap />
      </ProGate>
    </div>
  );
}

function Breakdown({
  title,
  data,
  colorOffset = 0,
}: {
  title: string;
  data: { name: string; value: number }[];
  colorOffset?: number;
}) {
  const p = usePortfolio();
  return (
    <Card>
      <h3 className="font-display mb-3 font-semibold">{title}</h3>
      <AllocationBreakdown
        data={data}
        colorOffset={colorOffset}
        totalLabel={p.lang === "bg" ? "Обща стойност" : "Total value"}
        formatValue={(value, compact) => p.money(value, compact ? { compact: true } : undefined)}
      />
    </Card>
  );
}
