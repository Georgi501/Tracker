import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePortfolio } from "@/lib/store";
import { languageLocale } from "@/lib/i18n";
import { extrasCopy } from "@/lib/extras-i18n";
import {
  CHART_RANGES,
  marketDetails,
  type ChartRange,
  type MarketCandle,
} from "@/lib/market.functions";
import {
  readAlerts,
  readWatchlist,
  writeAlerts,
  writeWatchlist,
  type PriceAlert,
} from "@/lib/watchlist";
import type { MarketAsset } from "@/lib/market-search";

export function useWatchState() {
  const [list, setList] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  useEffect(() => {
    const sync = () => {
      setList(readWatchlist());
      setAlerts(readAlerts());
    };
    sync();
    window.addEventListener("folio-watch", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("folio-watch", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return { list, alerts };
}

function Sparkline({
  closes,
  range,
  currency,
  locale,
  labels,
}: {
  closes: MarketCandle[];
  range: ChartRange;
  currency: string | null;
  locale: string;
  labels: { date: string; close: string; open: string; high: string; low: string };
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tooltipSide, setTooltipSide] = useState<"left" | "right">("right");
  const vals = closes.map((x) => x.c);
  const min = Math.min(...vals),
    max = Math.max(...vals),
    span = max - min || 1;
  const points = vals.map((v, i) => ({
    x: (i / (vals.length - 1)) * 300,
    y: 80 - ((v - min) / span) * 76 - 2,
  }));
  const pts = points.map(({ x, y }) => `${x},${y}`).join(" ");
  const up = vals[vals.length - 1]! >= vals[0]!;
  const active = activeIndex == null ? null : closes[activeIndex];
  const money = (value: number | null) =>
    value == null
      ? "—"
      : new Intl.NumberFormat(locale, {
          style: "currency",
          currency: currency ?? "USD",
          maximumFractionDigits: 2,
        }).format(value);
  const date = active
    ? new Date(active.t).toLocaleString(locale, {
        dateStyle: "medium",
        timeStyle: range === "1D" || range === "1W" ? "short" : undefined,
      })
    : "";
  const updateActivePoint = (clientX: number, element: SVGSVGElement) => {
    const bounds = element.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width));
    setActiveIndex(Math.round(ratio * (closes.length - 1)));
    const leftSpace = clientX - bounds.left;
    const rightSpace = bounds.right - clientX;
    setTooltipSide(
      rightSpace >= 204 || (rightSpace < 204 && leftSpace < 204 && rightSpace >= leftSpace)
        ? "right"
        : "left",
    );
  };
  return (
    <div className="relative">
      <svg
        viewBox="0 0 300 80"
        preserveAspectRatio="none"
        className="h-20 w-full touch-pan-y"
        role="img"
        aria-label={`${labels.date}: ${labels.close}, ${labels.open}, ${labels.high}, ${labels.low}`}
        onPointerMove={(event) => updateActivePoint(event.clientX, event.currentTarget)}
        onPointerDown={(event) => updateActivePoint(event.clientX, event.currentTarget)}
        onPointerLeave={() => setActiveIndex(null)}
      >
        <polyline
          points={pts}
          fill="none"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          className={up ? "stroke-success" : "stroke-destructive"}
          style={{ stroke: up ? "var(--success, var(--primary))" : "var(--destructive)" }}
        />
        {activeIndex != null && (
          <circle
            cx={points[activeIndex]!.x}
            cy={points[activeIndex]!.y}
            r="3"
            fill={up ? "var(--success, var(--primary))" : "var(--destructive)"}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      {active && activeIndex != null && (
        <div
          className={`pointer-events-none absolute top-0 z-10 w-48 rounded-lg border border-border bg-popover p-3 text-xs shadow-md ${
            tooltipSide === "left" ? "-translate-x-full" : ""
          }`}
          style={{
            left: `calc(${(activeIndex / (closes.length - 1)) * 100}% ${tooltipSide === "left" ? "- 12px" : "+ 12px"})`,
          }}
        >
          <p className="mb-2 font-semibold">
            {labels.date}: {date}
          </p>
          <dl className="space-y-1">
            {(
              [
                [labels.close, active.c],
                [labels.open, active.o],
                [labels.high, active.h],
                [labels.low, active.l],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium tabular-nums">{money(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

export function AssetExtras({ asset, price }: { asset: MarketAsset; price: number | null }) {
  const p = usePortfolio();
  const c = extrasCopy[p.lang];
  const detailsFn = useServerFn(marketDetails);
  const [range, setRange] = useState<ChartRange>("1Y");
  const d = useQuery({
    queryKey: ["market-details", asset.symbol, asset.type, "1Y"],
    queryFn: () => detailsFn({ data: { symbol: asset.symbol, type: asset.type, range: "1Y" } }),
    staleTime: 600000,
  });
  const ch = useQuery({
    queryKey: ["market-details", asset.symbol, asset.type, range],
    queryFn: () => detailsFn({ data: { symbol: asset.symbol, type: asset.type, range } }),
    staleTime: range === "1D" ? 60000 : 600000,
  });
  const { list, alerts } = useWatchState();
  const symbol = asset.symbol.toUpperCase();
  const watching = list.includes(symbol);
  const [dir, setDir] = useState<"above" | "below">("above");
  const [target, setTarget] = useState("");
  const fmt = (n: number) =>
    new Intl.NumberFormat(languageLocale(p.lang), { maximumFractionDigits: 2 }).format(n);
  const toggle = () =>
    writeWatchlist(watching ? list.filter((s) => s !== symbol) : [...list, symbol].slice(0, 30));
  const addAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const t = Number(target.replace(",", "."));
    if (!(t > 0)) return;
    writeAlerts([...alerts, { symbol, direction: dir, target: t }]);
    if (!watching) writeWatchlist([...list, symbol].slice(0, 30));
    setTarget("");
  };
  const data = d.data;
  const pos =
    data?.low != null && data.high != null && price != null && data.high > data.low
      ? Math.min(100, Math.max(0, ((price - data.low) / (data.high - data.low)) * 100))
      : null;
  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4">
      <Button
        variant={watching ? "secondary" : "outline"}
        className="h-11 w-full sm:w-auto"
        onClick={toggle}
        aria-pressed={watching}
      >
        <Star className={watching ? "fill-current" : ""} />
        {watching ? c.watching : c.watch}
      </Button>
      <div>
        <div
          role="group"
          aria-label={c.chart1y}
          className="mb-2 grid grid-cols-4 gap-1 sm:flex sm:flex-wrap"
        >
          {CHART_RANGES.map((r) => (
            <Button
              key={r}
              type="button"
              size="sm"
              variant={r === range ? "default" : "ghost"}
              aria-pressed={r === range}
              className="h-9"
              onClick={() => setRange(r)}
            >
              {r === "MAX" ? "Max" : r}
            </Button>
          ))}
        </div>
        {ch.isFetching && !ch.data ? (
          <div className="h-20 animate-pulse rounded-md bg-muted" />
        ) : ch.data && ch.data.closes.length > 1 ? (
          <Sparkline
            closes={ch.data.closes}
            range={range}
            currency={ch.data.currency}
            locale={languageLocale(p.lang)}
            labels={{
              date: c.chartDate,
              close: c.chartClose,
              open: c.chartOpen,
              high: c.chartHigh,
              low: c.chartLow,
            }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{c.noChart}</p>
        )}
        {ch.data &&
          ch.data.closes.length > 1 &&
          (() => {
            const f = ch.data.closes[0]!.c,
              l = ch.data.closes.at(-1)!.c,
              r = (l / f - 1) * 100;
            return (
              <p
                className={`mt-1 text-sm font-semibold ${r >= 0 ? "text-success" : "text-destructive"}`}
              >
                {r >= 0 ? "+" : ""}
                {r.toFixed(2)}% · {range === "MAX" ? "Max" : range}
              </p>
            );
          })()}
      </div>
      {data?.low != null && data.high != null && (
        <div>
          <p className="mb-1 text-xs text-muted-foreground">{c.range52}</p>
          <div className="relative h-2 rounded-full bg-muted">
            {pos != null && (
              <span
                className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
                style={{ left: `${pos}%` }}
              />
            )}
          </div>
          <div className="mt-1 flex justify-between text-xs">
            <span>
              {c.low} {fmt(data.low)}
            </span>
            <span>
              {c.high} {fmt(data.high)}
            </span>
          </div>
        </div>
      )}
      <form onSubmit={addAlert} className="space-y-2">
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Bell size={12} />
          {c.alerts}
        </p>
        <div className="flex gap-2">
          <select
            aria-label={c.alerts}
            value={dir}
            onChange={(e) => setDir(e.target.value as "above" | "below")}
            className="h-11 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="above">{c.alertAbove}</option>
            <option value="below">{c.alertBelow}</option>
          </select>
          <Input
            inputMode="decimal"
            aria-label={c.alertTarget}
            placeholder={c.alertTarget}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="h-11 min-w-0 flex-1"
          />
          <Button type="submit" className="h-11">
            {c.alertAdd}
          </Button>
        </div>
        {alerts
          .filter((a) => a.symbol === symbol)
          .map((a, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              {a.direction === "above" ? c.alertAbove : c.alertBelow} {fmt(a.target)}
            </p>
          ))}
      </form>
    </div>
  );
}
