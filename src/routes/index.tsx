import { languageLocale } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { getPortfolioHistory } from "@/lib/history.functions";
import { historyReturn, type HistoryPeriod } from "@/lib/history";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CountUp } from "@/components/Motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, Delta } from "@/components/AppShell";
import { AllocationCard } from "@/components/AllocationCard";
import { DashboardMovers } from "@/components/DashboardMovers";
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
        <h1 className="font-display mt-1 break-words text-3xl font-bold tracking-tight tabular-nums sm:text-4xl md:text-5xl">
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
                {history.isFetching ? <Skeleton className="h-48 w-full" /> : p.t("noPeriodData")}
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
                  <Tooltip
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
              {history.isFetching ? <Skeleton className="h-48 w-full" /> : p.t("noPeriodData")}
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
                <Tooltip
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
              <SelectTrigger aria-label={c.compare} className="w-full text-foreground sm:w-52">
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
      </Card>
      <div className="dashboard-metrics grid grid-cols-2 gap-2 sm:grid-cols-1 sm:gap-2.5">
        <Metric
          label={p.t("totalPnl")}
          value={p.user ? <CountUp value={pnl} format={(n) => p.money(n, { sign: true })} /> : "—"}
          sub={pct((pnl / cost) * 100)}
          n={pnl}
        />
        <Metric
          label={p.t("dayChange")}
          value={p.user ? <CountUp value={day} format={(n) => p.money(n, { sign: true })} /> : "—"}
          sub={pct((day / (total - day)) * 100)}
          n={day}
        />
        <div className="contents sm:grid sm:grid-cols-2 sm:gap-2.5">
          <Metric label={`${p.t("ttwror")} · ${period}`} value={pct(tw)} n={tw} />
          <Metric label={p.t("irr")} value={pct(irrV)} n={irrV} />
        </div>
        <div className="contents sm:grid sm:grid-cols-2 sm:gap-2.5">
          <Metric
            label={p.t("invested")}
            value={p.user ? <CountUp value={cost} format={(n) => p.money(n)} /> : "—"}
          />
          <Metric
            label={p.lang === "bg" ? "Реализирана P&L" : "Realized P&L"}
            value={
              p.user ? <CountUp value={realized} format={(n) => p.money(n, { sign: true })} /> : "—"
            }
            n={realized}
          />
        </div>
      </div>
      <PortfolioHealth />
      <WeeklyDigest />
      <DashboardMovers />
      <AllocationCard />
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
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  n,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  n?: number;
}) {
  return (
    <Card className="dashboard-metric min-w-0 p-2.5">
      <p className="text-[10px] font-semibold uppercase leading-snug tracking-[0.08em] text-muted-foreground sm:text-[11px]">
        {label}
      </p>
      <p className="font-display mt-0.5 break-words text-sm font-semibold tracking-tight tabular-nums sm:text-lg">
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
