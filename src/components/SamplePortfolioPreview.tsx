import { experienceCopy } from "@/lib/experience-i18n";
import { languageLocale, type Lang } from "@/lib/i18n";
import { SAMPLE_GAIN, SAMPLE_HOLDINGS, SAMPLE_TOTAL_VALUE } from "@/lib/sample-portfolio";
import {
  SAMPLE_PERIODS,
  sampleAllocation,
  sampleDividendYield,
  sampleMwrr,
  samplePeriodData,
  type SamplePeriod,
} from "@/lib/sample-preview";
import { samplePreviewCopy } from "@/lib/sample-preview-copy";
import { useReducedMotion } from "framer-motion";
import * as m from "framer-motion/m";
import { ArrowDownRight, ArrowUpRight, Info, Landmark, Layers3 } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltipContent } from "./ChartTooltipContent";
import { DashboardMotion } from "./DashboardMotion";
const colors = ["var(--primary)", "var(--success)", "var(--violet)", "var(--sun)"];

export function SamplePortfolioPreview({
  lang,
  defaultExpanded = false,
}: {
  lang: Lang;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const detailsId = useId();
  const c = samplePreviewCopy[lang];
  const locale = languageLocale(lang);
  const gradient = useId();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [period, setPeriod] = useState<SamplePeriod>("1Y");
  const [active, setActive] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const series = useMemo(() => samplePeriodData(period), [period]);
  const money = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
  const percent = (n: number, signed = true) =>
    new Intl.NumberFormat(locale, {
      style: "percent",
      maximumFractionDigits: 2,
      signDisplay: signed ? "exceptZero" : "auto",
    }).format(n / 100);
  const date = (t: number, full = false) =>
    new Intl.DateTimeFormat(
      locale,
      period === "1D"
        ? { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }
        : {
            month: "short",
            ...(full
              ? { day: "numeric", year: "numeric" }
              : period === "1W" || period === "1M"
                ? { day: "numeric" }
                : {}),
            timeZone: "UTC",
          },
    ).format(t);
  const selected = active === null ? null : series.points[active];
  return (
    <DashboardMotion>
      <figure className="hero-shot analytics-surface min-w-0 overflow-hidden rounded-2xl border border-border/80 p-4 shadow-xl shadow-black/10 sm:p-5">
        <figcaption className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Layers3 size={14} aria-hidden />
          {c.badge}
        </figcaption>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{c.value}</p>
            <p className="numeric-display mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              {money(selected?.value ?? SAMPLE_TOTAL_VALUE)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">{c.periodReturn}</p>
            <p
              className={`numeric-display mt-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${series.change >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
            >
              {series.change >= 0 ? (
                <ArrowUpRight size={13} aria-hidden />
              ) : (
                <ArrowDownRight size={13} aria-hidden />
              )}
              {percent(series.returnPercent)}
            </p>
          </div>
        </div>
        <div
          role="group"
          aria-label={c.range}
          className="mt-4 grid grid-cols-5 gap-1 rounded-full bg-secondary/65 p-1"
        >
          {SAMPLE_PERIODS.map((range) => (
            <m.button
              key={range}
              type="button"
              aria-pressed={period === range}
              onClick={() => {
                setPeriod(range);
                setActive(null);
              }}
              whileTap={{ scale: reduce ? 1 : 0.96 }}
              className={`min-h-11 rounded-full px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${period === range ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"}`}
            >
              {range}
            </m.button>
          ))}
        </div>
        <div
          className="mt-3 h-40 touch-pan-y sm:h-44"
          role="group"
          aria-label={`${c.badge}, ${period}`}
        >
          {mounted ? (
            <ResponsiveContainer
              width="100%"
              height="100%"
              initialDimension={{ width: 480, height: 208 }}
            >
              <AreaChart
                id={`${gradient}-chart`}
                data={[...series.points]}
                accessibilityLayer
                margin={{ top: 12, left: 0, right: 4, bottom: 0 }}
                onMouseMove={(state) =>
                  setActive(
                    typeof state.activeTooltipIndex === "number" ? state.activeTooltipIndex : null,
                  )
                }
                onMouseLeave={() => setActive(null)}
              >
                <defs>
                  <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeDasharray="3 5"
                  strokeOpacity={0.65}
                />
                <XAxis
                  dataKey="t"
                  tickFormatter={(t) => date(Number(t))}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={28}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                />
                <YAxis hide domain={["dataMin", "dataMax"]} />
                <Tooltip
                  cursor={{ stroke: "var(--primary)", strokeDasharray: "3 4" }}
                  content={(props) => (
                    <ChartTooltipContent
                      {...props}
                      formatLabel={(t) => date(Number(t), true)}
                      formatValue={(value) => money(Number(value))}
                    />
                  )}
                />
                <Area
                  dataKey="value"
                  name={c.value}
                  type="monotone"
                  stroke="var(--primary)"
                  strokeWidth={2.25}
                  fill={`url(#${gradient})`}
                  isAnimationActive={false}
                  activeDot={{ r: 4, stroke: "var(--background)", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <svg viewBox="0 0 480 208" className="h-full w-full" role="img" aria-label={c.value}>
              <polyline
                points={series.points
                  .map(
                    (point, index) =>
                      `${12 + (index / (series.points.length - 1)) * 456},${180 - ((point.value - Math.min(...series.points.map((p) => p.value))) / Math.max(1, Math.max(...series.points.map((p) => p.value)) - Math.min(...series.points.map((p) => p.value)))) * 160}`,
                  )
                  .join(" ")}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2.25"
              />
            </svg>
          )}
        </div>
        <div className="mb-4 flex justify-between text-[10px] tabular-nums text-muted-foreground">
          <span>{date(series.points[0]!.t, true)}</span>
          <span>{date(series.points.at(-1)!.t, true)}</span>
        </div>
        <div id={detailsId} hidden={!expanded}>
          <dl className="grid grid-cols-2 gap-2 border-y border-border/65 py-3 sm:grid-cols-3">
            {[
              { label: c.unrealized, value: money(SAMPLE_GAIN), hint: "" },
              { label: c.yield, value: percent(sampleDividendYield, false), hint: c.yieldHint },
              {
                label: c.mwrr,
                value: sampleMwrr === null ? "—" : percent(sampleMwrr),
                hint: c.mwrrHint,
              },
            ].map((metric) => (
              <div
                key={metric.label}
                className="min-w-0 rounded-xl bg-secondary/35 p-2.5 last:col-span-2 sm:last:col-span-1"
              >
                <dt className="text-[10px] font-medium leading-relaxed text-muted-foreground">
                  {metric.label}
                  {metric.hint && (
                    <span className="ml-1 inline-flex" title={metric.hint}>
                      <Info size={11} aria-label={metric.hint} />
                    </span>
                  )}
                </dt>
                <dd className="numeric-display mt-1 text-base font-semibold text-success">
                  {metric.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {c.allocation}
          </p>
          <div
            className="flex h-2.5 overflow-hidden rounded-full"
            role="img"
            aria-label={sampleAllocation
              .map((item) => `${c.classes[item.cls]} ${percent(item.share * 100, false)}`)
              .join(", ")}
          >
            {sampleAllocation.map((item, index) => (
              <span
                key={item.cls}
                style={{ width: `${item.share * 100}%`, background: colors[index] }}
              />
            ))}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
            {sampleAllocation.map((item, index) => (
              <li key={item.cls} className="inline-flex items-center gap-1.5 text-[10px]">
                <span
                  aria-hidden
                  className="size-1.5 rounded-full"
                  style={{ background: colors[index] }}
                />
                <span className="text-muted-foreground">{c.classes[item.cls]}</span>
                <span className="tabular-nums font-semibold">
                  {new Intl.NumberFormat(locale, {
                    style: "percent",
                    maximumFractionDigits: 1,
                  }).format(item.share)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div id={`${detailsId}-holdings`} hidden={!expanded}>
          <ul aria-label={c.holdings} className="mt-3 flex flex-wrap gap-1.5">
            {SAMPLE_HOLDINGS.map((asset) => (
              <li
                key={asset.symbol}
                className="rounded-full border border-border/70 bg-background/35 px-2 py-1 text-[10px] font-semibold"
                title={asset.name}
              >
                {asset.symbol}
                <span className="ml-1 text-muted-foreground tabular-nums">
                  {new Intl.NumberFormat(locale, {
                    style: "percent",
                    maximumFractionDigits: 0,
                  }).format((asset.qty * asset.value) / SAMPLE_TOTAL_VALUE)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
            <span className="mr-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Landmark size={12} aria-hidden />
              {c.imports}
            </span>
            {["Trading 212", "IBKR", "Revolut"].map((broker) => (
              <span
                key={broker}
                className="rounded-full bg-secondary/70 px-2 py-1 text-[10px] font-medium"
              >
                {broker}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={`${detailsId} ${detailsId}-holdings`}
          onClick={() => setExpanded((value) => !value)}
          className="mt-3 min-h-11 w-full rounded-xl border border-border px-3 text-xs font-semibold text-primary hover:bg-secondary"
        >
          {expanded ? experienceCopy[lang].hideDetails : experienceCopy[lang].showDetails}
        </button>
        <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">{c.note}</p>
      </figure>
    </DashboardMotion>
  );
}
