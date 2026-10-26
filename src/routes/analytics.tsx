import { Heatmap, HeatmapSilhouette, ProGate } from "@/components/ProFeatures";
import { proCopy } from "@/lib/pro-i18n";
import { languageLocale } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPortfolioHistory } from "@/lib/history.functions";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
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

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
];
const tip = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--foreground)",
};

function Analytics() {
  const p = usePortfolio();
  const [period, setPeriod] = useState<ReturnPeriod | "CUSTOM">("1Y");
  const [anchor] = useState(() => Date.parse(`${dateInput(Date.now())}T00:00:00Z`) + DAY);
  const today = dateInput(anchor - DAY);
  const [startDate, setStartDate] = useState(dateInput(anchor - 30 * DAY));
  const [endDate, setEndDate] = useState(today);
  const [compare, setCompare] = useState(false);
  const total = p.holdings.reduce((s, h) => s + h.value, 0);
  const cost = p.holdings.reduce((s, h) => s + h.costBasis, 0);
  const locale = languageLocale(p.lang);
  const historyFn = useServerFn(getPortfolioHistory);
  const historyQuery = useQuery({
    queryKey: ["portfolio-history", p.user?.id, p.transactions, "ALL", p.currency],
    queryFn: () => historyFn({ data: { period: "ALL", currency: p.currency } }),
    enabled: !!p.user,
    staleTime: 60000,
  });
  const history: { t: number; v: number }[] = historyQuery.data?.points ?? [];
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
  const contrib = p.holdings
    .filter((h) => Number.isFinite(h.pnl))
    .map((h) => ({ name: h.asset.symbol, v: h.pnl }))
    .sort((a, b) => b.v - a.v);

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
            {historyQuery.isFetching ? "…" : p.t("noPeriodData")}
          </p>
        )}
        {range && currentReturn !== null && (
          <div className="h-60">
            <ResponsiveContainer>
              <BarChart data={returns}>
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
                <Tooltip
                  cursor={{ fill: "var(--secondary)" }}
                  formatter={(v: number) => pct(v)}
                  labelFormatter={(_, payload) => {
                    const row = payload[0]?.payload;
                    return row
                      ? `${formatDate(row.t)}${compare ? ` / ${formatDate(row.previousT)}` : ""}`
                      : "";
                  }}
                  contentStyle={tip}
                />
                <Bar dataKey="current" name={p.t("selectedPeriod")} radius={[6, 6, 6, 6]}>
                  {returns.map((r, i) => (
                    <Cell
                      key={i}
                      fill={(r.current ?? 0) >= 0 ? "var(--success)" : "var(--destructive)"}
                    />
                  ))}
                </Bar>
                {compare && (
                  <Bar
                    dataKey="previous"
                    name={p.t("previousPeriod")}
                    fill="var(--chart-2)"
                    radius={[6, 6, 6, 6]}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
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
        data={groupBy(
          p.holdings.filter((h) => Number.isFinite(h.value)),
          (h) => h.asset.symbol,
        )}
      />
      <Breakdown
        title={p.t("byCurrency")}
        data={groupBy(
          p.holdings.filter((h) => Number.isFinite(h.value)),
          (h) => assetCurrency(h.asset),
        )}
      />
      <Breakdown
        title={p.t("byClass")}
        data={groupBy(
          p.holdings.filter((h) => Number.isFinite(h.value)),
          (h) => p.t(h.asset.type),
        )}
      />
      <Card className="lg:col-span-3">
        <h3 className="font-display mb-3 font-semibold">{p.t("contribution")}</h3>
        <div style={{ height: Math.max(160, contrib.length * 30) }}>
          <ResponsiveContainer>
            <BarChart data={contrib} layout="vertical">
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={60}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "var(--secondary)" }}
                formatter={(v: number) => p.money(v, { sign: true })}
                contentStyle={tip}
              />
              <Bar dataKey="v" radius={[4, 4, 4, 4]}>
                {contrib.map((c, i) => (
                  <Cell key={i} fill={c.v >= 0 ? "var(--success)" : "var(--destructive)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
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

function Breakdown({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  const p = usePortfolio();
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <Card>
      <h3 className="font-display mb-2 font-semibold">{title}</h3>
      <div className="h-40">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="60%"
              outerRadius="95%"
              paddingAngle={2}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => p.money(v)} contentStyle={tip} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 space-y-1.5 text-sm">
        {data.slice(0, 8).map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            <span className="flex-1">{d.name}</span>
            <span className="font-semibold">{((d.value / total) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
