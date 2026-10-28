import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Star } from "lucide-react";
import { AssetNews } from "@/components/AssetNews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePortfolio } from "@/lib/store";
import { languageLocale } from "@/lib/i18n";
import { extrasCopy } from "@/lib/extras-i18n";
import { CHART_RANGES, marketDetails, type ChartRange } from "@/lib/market.functions";
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

function Sparkline({ closes }: { closes: { t: number; c: number }[] }) {
  const vals = closes.map((x) => x.c);
  const min = Math.min(...vals),
    max = Math.max(...vals),
    span = max - min || 1;
  const pts = vals
    .map((v, i) => `${(i / (vals.length - 1)) * 300},${80 - ((v - min) / span) * 76 - 2}`)
    .join(" ");
  const up = vals[vals.length - 1]! >= vals[0]!;
  return (
    <svg viewBox="0 0 300 80" preserveAspectRatio="none" className="h-20 w-full" role="img">
      <polyline
        points={pts}
        fill="none"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        className={up ? "stroke-success" : "stroke-destructive"}
        style={{ stroke: up ? "var(--success, var(--primary))" : "var(--destructive)" }}
      />
    </svg>
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
          <Sparkline closes={ch.data.closes} />
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
      <AssetNews symbol={asset.symbol} lang={p.lang} />
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
