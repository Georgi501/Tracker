import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check, Pencil, Star, Target, TrendingDown, TrendingUp, X } from "lucide-react";
import { Card } from "@/components/AppShell";
import { CompanyLogo } from "@/components/CompanyLogo";
import { useWatchState } from "@/components/AssetExtras";
import { usePortfolio } from "@/lib/store";
import { languageLocale, type Lang } from "@/lib/i18n";
import { MARKET_ASSETS } from "@/lib/market-search";
import { marketDcf, marketDetails, marketQuote, type ChartRange } from "@/lib/market.functions";
import { dcfValue, scenario, valuationGap } from "@/lib/dcf";
import { inBuyZone, readTargets, writeTargets, writeWatchlist } from "@/lib/watchlist";
import { useEffect } from "react";

export const Route = createFileRoute("/watchlist")({
  head: () => ({ meta: [
    { title: "Watchlist — folio. Portfolio Tracker" },
    { name: "description", content: "Track favourite stocks, ETFs and crypto with logos, top gainers and losers, buy targets and DCF fair value." },
    { property: "og:title", content: "Watchlist — folio." },
    { property: "og:description", content: "Gainers, losers, buy zone and intrinsic value for your watchlist." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Watchlist,
});

const PERIODS: ChartRange[] = ["1D", "1W", "1M", "3M", "1Y"];
const SUGGEST = ["AAPL", "MSFT", "NVDA", "META", "AMZN", "VWCE.DE", "BTC"];
type K = "title" | "sub" | "gainers" | "losers" | "opps" | "zone" | "withTarget" | "noneZone" | "empty" | "emptyHint" | "asset" | "graph" | "last" | "buy" | "iv" | "set" | "under" | "over" | "na" | "noData" | "remove" | "browse";
const COPY: Record<Lang, Record<K, string>> = {
  en: { title: "Watchlist", sub: "Live prices, movers and fair value for the assets you follow.", gainers: "Top gainers", losers: "Top losers", opps: "Opportunities", zone: "In buy zone", withTarget: "With target", noneZone: "No asset is at or below your buy price yet.", empty: "Your watchlist is empty", emptyHint: "Tap a ticker to start following it.", asset: "Asset", graph: "Price graph", last: "Last price", buy: "Buy price", iv: "Intrinsic value", set: "Set", under: "Undervalued", over: "Overvalued", na: "n/a", noData: "No data for this period.", remove: "Remove", browse: "Search markets" },
  bg: { title: "Watchlist", sub: "Цени на живо, най-големи движения и справедлива стойност за активите, които следиш.", gainers: "Най-голям ръст", losers: "Най-голям спад", opps: "Възможности", zone: "В зона за покупка", withTarget: "Със зададена цел", noneZone: "Още няма актив на или под твоята цена за покупка.", empty: "Watchlist-ът ти е празен", emptyHint: "Натисни тикер, за да започнеш да го следиш.", asset: "Актив", graph: "Графика", last: "Последна цена", buy: "Цена за покупка", iv: "Справедлива стойност", set: "Задай", under: "Подценена", over: "Надценена", na: "няма", noData: "Няма данни за периода.", remove: "Премахни", browse: "Търси на пазара" },
  de: { title: "Watchlist", sub: "Live-Kurse, Top-Bewegungen und fairer Wert deiner beobachteten Werte.", gainers: "Top-Gewinner", losers: "Top-Verlierer", opps: "Chancen", zone: "In Kaufzone", withTarget: "Mit Ziel", noneZone: "Noch kein Wert auf oder unter deinem Kaufpreis.", empty: "Deine Watchlist ist leer", emptyHint: "Tippe auf einen Ticker, um ihm zu folgen.", asset: "Wert", graph: "Kursgrafik", last: "Letzter Kurs", buy: "Kaufpreis", iv: "Innerer Wert", set: "Setzen", under: "Unterbewertet", over: "Überbewertet", na: "k. A.", noData: "Keine Daten für den Zeitraum.", remove: "Entfernen", browse: "Märkte durchsuchen" },
  es: { title: "Watchlist", sub: "Precios en vivo, mayores movimientos y valor justo de tus activos.", gainers: "Mayores subidas", losers: "Mayores caídas", opps: "Oportunidades", zone: "En zona de compra", withTarget: "Con objetivo", noneZone: "Ningún activo está aún en o bajo tu precio de compra.", empty: "Tu watchlist está vacía", emptyHint: "Toca un ticker para seguirlo.", asset: "Activo", graph: "Gráfico", last: "Último precio", buy: "Precio de compra", iv: "Valor intrínseco", set: "Fijar", under: "Infravalorada", over: "Sobrevalorada", na: "n/d", noData: "Sin datos para el periodo.", remove: "Quitar", browse: "Buscar mercados" },
  it: { title: "Watchlist", sub: "Prezzi live, maggiori movimenti e valore equo dei titoli che segui.", gainers: "Maggiori rialzi", losers: "Maggiori ribassi", opps: "Opportunità", zone: "In zona acquisto", withTarget: "Con obiettivo", noneZone: "Nessun titolo è ancora al o sotto il tuo prezzo d'acquisto.", empty: "La tua watchlist è vuota", emptyHint: "Tocca un ticker per seguirlo.", asset: "Titolo", graph: "Grafico", last: "Ultimo prezzo", buy: "Prezzo d'acquisto", iv: "Valore intrinseco", set: "Imposta", under: "Sottovalutata", over: "Sopravvalutata", na: "n/d", noData: "Nessun dato per il periodo.", remove: "Rimuovi", browse: "Cerca mercati" },
};

const assetOf = (s: string) => MARKET_ASSETS.find((a) => a.symbol.toUpperCase() === s) ?? { symbol: s, name: s, type: "stock" as const };

function Spark({ closes, className = "h-10 w-28" }: { closes: { c: number }[]; className?: string }) {
  if (closes.length < 2) return <span className="text-xs text-muted-foreground">—</span>;
  const v = closes.map((x) => x.c); const min = Math.min(...v), max = Math.max(...v), span = max - min || 1;
  const pts = v.map((y, i) => `${(i / (v.length - 1)) * 100},${38 - ((y - min) / span) * 34}`).join(" ");
  const up = v.at(-1)! >= v[0]!; const col = up ? "var(--success)" : "var(--destructive)";
  return <svg viewBox="0 0 100 40" preserveAspectRatio="none" className={className} aria-hidden>
    <polygon points={`0,40 ${pts} 100,40`} style={{ fill: `color-mix(in oklab, ${col} 15%, transparent)` }} />
    <polyline points={pts} fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke" style={{ stroke: col }} />
  </svg>;
}

function Watchlist() {
  const p = usePortfolio(); const c = COPY[p.lang]; const locale = languageLocale(p.lang);
  const { list } = useWatchState();
  const [period, setPeriod] = useState<ChartRange>("1D");
  const [targets, setTargets] = useState<Record<string, number>>({});
  useEffect(() => { const s = () => setTargets(readTargets()); s(); window.addEventListener("folio-watch", s); return () => window.removeEventListener("folio-watch", s); }, []);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const detailsFn = useServerFn(marketDetails); const quoteFn = useServerFn(marketQuote); const dcfFn = useServerFn(marketDcf);
  const assets = list.map(assetOf);
  const charts = useQueries({ queries: assets.map((a) => ({ queryKey: ["market-details", a.symbol, a.type, period], queryFn: () => detailsFn({ data: { symbol: a.symbol, type: a.type, range: period } }), staleTime: period === "1D" ? 60_000 : 600_000 })) });
  const quotes = useQueries({ queries: assets.map((a) => ({ queryKey: ["market-quote", a.symbol, a.type], queryFn: () => quoteFn({ data: { symbol: a.symbol, type: a.type } }), refetchInterval: 60_000 })) });
  const dcfs = useQueries({ queries: assets.map((a) => ({ queryKey: ["market-dcf", a.symbol], queryFn: () => a.type === "stock" ? dcfFn({ data: { symbol: a.symbol } }) : Promise.resolve(null), staleTime: 86_400_000 })) });

  const rows = assets.map((a, i) => {
    const closes = charts[i]?.data?.closes ?? [];
    const ret = closes.length > 1 ? (closes.at(-1)!.c / closes[0]!.c - 1) * 100 : null;
    const q = quotes[i]?.data?.quote ?? null;
    const d = dcfs[i]?.data;
    let iv: number | null = null;
    // Only real fundamentals with matching currencies and a confirmed growth figure produce a fair value.
    const g = d?.revenueGrowth ?? d?.earningsGrowth;
    if (d && g != null && d.fcf && d.shares && d.currency && d.currency === d.finCurrency) iv = dcfValue({ fcf: d.fcf, cash: d.cash ?? 0, debt: d.debt ?? 0, shares: d.shares, ...scenario("base", g) });
    return { a, closes, ret, q, iv, loading: !!charts[i]?.isLoading };
  });
  const fmt = (n: number, cur?: string | null) => { try { return cur ? new Intl.NumberFormat(locale, { style: "currency", currency: cur, maximumFractionDigits: n < 10 ? 4 : 2 }).format(n) : n.toLocaleString(locale, { maximumFractionDigits: 2 }); } catch { return n.toFixed(2); } };
  const withRet = rows.filter((r) => r.ret != null).sort((x, y) => y.ret! - x.ret!);
  const gainers = withRet.filter((r) => r.ret! > 0).slice(0, 5);
  const losers = withRet.filter((r) => r.ret! < 0).reverse().slice(0, 5);
  const zone = rows.filter((r) => inBuyZone(r.q?.price, targets[r.a.symbol]));
  const toggleWatch = (s: string) => writeWatchlist(list.includes(s) ? list.filter((x) => x !== s) : [...list, s].slice(0, 30));
  const saveTarget = (s: string) => {
    const n = Number(draft.replace(",", ".")); const next = { ...targets };
    if (n > 0) next[s] = n; else delete next[s];
    writeTargets(next); setEditing(null);
  };

  const Bars = ({ items, up }: { items: typeof rows; up: boolean }) => {
    const max = Math.max(...items.map((r) => Math.abs(r.ret!)), 0.01);
    if (!items.length) return <p className="py-10 text-center text-sm text-muted-foreground">{c.noData}</p>;
    return <div className="flex h-48 items-end justify-around gap-2 pt-2">
      {items.map((r) => <div key={r.a.symbol} className="flex min-w-0 flex-1 flex-col items-center gap-1">
        <span className={`text-xs font-bold ${up ? "text-success" : "text-destructive"}`}>{up ? "+" : ""}{r.ret!.toFixed(1)}%</span>
        <div className="flex w-full max-w-14 flex-col items-center justify-end rounded-t-xl pt-1.5 transition-all duration-700"
          style={{ height: `${18 + (Math.abs(r.ret!) / max) * 82}px`, background: `linear-gradient(to top, color-mix(in oklab, var(${up ? "--success" : "--destructive"}) 20%, transparent), var(${up ? "--success" : "--destructive"}))` }}>
          <CompanyLogo symbol={r.a.symbol} type={r.a.type} size={26} />
        </div>
        <span className="w-full truncate text-center text-[0.7rem] font-semibold">{r.a.symbol.replace(/\..*$/, "")}</span>
      </div>)}
    </div>;
  };

  return <div className="space-y-5">
    <div>
      <h1 className="font-display text-2xl font-bold">{c.title}</h1>
      <p className="text-sm text-muted-foreground">{c.sub}</p>
    </div>

    {!list.length ? <Card className="text-center">
      <Star className="mx-auto mb-2 text-primary" />
      <h2 className="font-display text-lg font-semibold">{c.empty}</h2>
      <p className="mb-4 text-sm text-muted-foreground">{c.emptyHint}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {SUGGEST.map((s) => { const a = assetOf(s); return <button key={s} onClick={() => toggleWatch(s)} className="press flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 text-sm font-semibold hover:border-primary">
          <CompanyLogo symbol={a.symbol} type={a.type} size={26} />{s}</button>; })}
      </div>
      <Link to="/markets" className="mt-4 inline-block text-sm font-semibold text-primary">{c.browse} →</Link>
    </Card> : <>
      <div role="group" className="flex gap-1 overflow-x-auto">
        {PERIODS.map((r) => <button key={r} onClick={() => setPeriod(r)} aria-pressed={period === r}
          className={`press rounded-full px-4 py-1.5 text-sm font-semibold ${period === r ? "bg-brand-gradient text-primary-foreground shadow-glow" : "bg-secondary text-muted-foreground"}`}>{r}</button>)}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-1 flex items-center gap-2 font-semibold"><Target size={16} className="text-primary" />{c.opps}</h2>
          <div className="my-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-secondary p-3"><p className="font-display text-2xl font-bold text-success">{zone.length}</p><p className="text-xs text-muted-foreground">{c.zone}</p></div>
            <div className="rounded-xl bg-secondary p-3"><p className="font-display text-2xl font-bold">{Object.keys(targets).filter((s) => list.includes(s)).length}/{list.length}</p><p className="text-xs text-muted-foreground">{c.withTarget}</p></div>
          </div>
          {zone.length ? <ul className="space-y-2">{zone.map((r) => <li key={r.a.symbol} className="flex items-center gap-2 text-sm"><CompanyLogo symbol={r.a.symbol} type={r.a.type} size={28} /><span className="flex-1 font-semibold">{r.a.symbol}</span><span>{fmt(r.q!.price, r.q!.currency)}</span></li>)}</ul>
            : <p className="text-sm text-muted-foreground">{c.noneZone}</p>}
        </Card>
        <Card><h2 className="flex items-center gap-2 font-semibold"><TrendingUp size={16} className="text-success" />{c.gainers} · {period}</h2><Bars items={gainers} up /></Card>
        <Card><h2 className="flex items-center gap-2 font-semibold"><TrendingDown size={16} className="text-destructive" />{c.losers} · {period}</h2><Bars items={losers} up={false} /></Card>
      </div>

      <Card className="p-0">
        <div className="hidden grid-cols-[minmax(0,2fr)_8rem_1fr_1fr_1.3fr_2rem] gap-3 border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
          <span>{c.asset}</span><span>{c.graph}</span><span className="text-right">{c.last}</span><span className="text-right">{c.buy}</span><span className="text-right">{c.iv}</span><span />
        </div>
        <ul className="divide-y divide-border">
          {rows.map((r) => {
            const t = targets[r.a.symbol]; const gap = r.iv != null && r.iv > 0 && r.q ? valuationGap(r.iv, r.q.price) : null;
            return <li key={r.a.symbol} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 md:grid-cols-[minmax(0,2fr)_8rem_1fr_1fr_1.3fr_2rem]">
              <Link to="/asset/$symbol" params={{ symbol: r.a.symbol }} className="flex min-w-0 items-center gap-3">
                <CompanyLogo symbol={r.a.symbol} type={r.a.type} />
                <span className="min-w-0"><span className="block truncate font-semibold">{r.a.name}</span><span className="block text-xs text-muted-foreground">{r.a.symbol}{r.ret != null && <b className={`ml-2 ${r.ret >= 0 ? "text-success" : "text-destructive"}`}>{r.ret >= 0 ? "+" : ""}{r.ret.toFixed(2)}%</b>}</span></span>
              </Link>
              <div className="justify-self-end md:justify-self-start">{r.loading ? <span className="block h-10 w-28 animate-pulse rounded bg-muted" /> : <Spark closes={r.closes} />}</div>
              <p className="text-sm md:text-right"><span className="text-xs text-muted-foreground md:hidden">{c.last}: </span><b>{r.q ? fmt(r.q.price, r.q.currency) : "—"}</b></p>
              <div className="text-right text-sm">
                {editing === r.a.symbol ? <span className="inline-flex items-center gap-1">
                  <input autoFocus inputMode="decimal" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveTarget(r.a.symbol)} className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm" aria-label={c.buy} />
                  <button onClick={() => saveTarget(r.a.symbol)} aria-label={c.set} className="text-success"><Check size={16} /></button>
                </span> : <button onClick={() => { setEditing(r.a.symbol); setDraft(t ? String(t) : ""); }} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${t ? (inBuyZone(r.q?.price, t) ? "bg-success/15 text-success" : "bg-secondary") : "border border-dashed border-border text-muted-foreground"}`}>
                  <span className="md:hidden">{c.buy}: </span>{t ? fmt(t, r.q?.currency) : c.set}<Pencil size={11} />
                </button>}
              </div>
              <div className="text-sm md:text-right">
                <span className="text-xs text-muted-foreground md:hidden">{c.iv}: </span>
                {r.iv != null && r.iv > 0 && gap != null ? <span><b>{fmt(r.iv, r.q?.currency)}</b> <span className={`ml-1 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${gap >= 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{gap >= 0 ? <Check size={11} /> : <X size={11} />}{gap >= 0 ? c.under : c.over} {Math.abs(gap * 100).toFixed(0)}%</span></span>
                  : <span className="text-xs text-muted-foreground">{c.na}</span>}
              </div>
              <button onClick={() => toggleWatch(r.a.symbol)} aria-label={`${c.remove} ${r.a.symbol}`} title={c.remove} className="justify-self-end text-primary"><Star size={16} className="fill-current" /></button>
            </li>;
          })}
        </ul>
      </Card>
    </>}
  </div>;
}
