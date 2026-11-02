import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check, Pencil, Plus, Star, Target, TrendingDown, TrendingUp, X } from "lucide-react";
import { Card } from "@/components/AppShell";
import { CompanyLogo } from "@/components/CompanyLogo";
import { QuoteFreshness } from "@/components/QuoteFreshness";
import { ProGate } from "@/components/ProFeatures";
import { useWatchState } from "@/components/AssetExtras";
import { usePortfolio } from "@/lib/store";
import { languageLocale, type Lang } from "@/lib/i18n";
import { MARKET_ASSETS } from "@/lib/market-search";
import { marketDcf, marketDetails, marketQuote, type ChartRange } from "@/lib/market.functions";
import { dcfValueFromFundamentals, scenario, valuationGap } from "@/lib/dcf";
import { isQuoteFresh } from "@/lib/portfolio";
import {
  clearTargetReview,
  inBuyZone,
  readTargets,
  readTargetReviews,
  writeTargetReview,
  writeTargets,
  writeWatchlist,
} from "@/lib/watchlist";
import { useEffect } from "react";
import { z } from "zod";

export const Route = createFileRoute("/watchlist")({
  head: () => ({
    meta: [
      { title: "Watchlist — Capispot Portfolio Tracker" },
      {
        name: "description",
        content:
          "Track favourite stocks, ETFs and crypto with logos, top gainers and losers, buy targets and DCF fair value.",
      },
      { property: "og:title", content: "Watchlist — Capispot" },
      {
        property: "og:description",
        content: "Gainers, losers, buy zone and intrinsic value for your watchlist.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search) =>
    z
      .object({
        symbol: z
          .string()
          .regex(/^[A-Za-z0-9.^:=_-]{1,20}$/)
          .optional()
          .catch(undefined),
      })
      .parse(search),
  component: Watchlist,
});

const PERIODS: ChartRange[] = ["1D", "1W", "1M", "3M", "YTD", "1Y"];
const SUGGEST = ["AAPL", "MSFT", "NVDA", "META", "AMZN", "VWCE.DE", "BTC"];
type K =
  | "title"
  | "sub"
  | "gainers"
  | "losers"
  | "opps"
  | "zone"
  | "withTarget"
  | "noneZone"
  | "empty"
  | "emptyHint"
  | "asset"
  | "graph"
  | "last"
  | "buy"
  | "iv"
  | "set"
  | "under"
  | "over"
  | "na"
  | "comparisonUnavailable"
  | "dcfLoadError"
  | "noData"
  | "remove"
  | "browse"
  | "addMore"
  | "analysis"
  | "analysisDesc"
  | "fairValue"
  | "fairValueDesc"
  | "loadError"
  | "retry"
  | "unavailable"
  | "noMatch"
  | "clearSearch";
const COPY: Record<Lang, Record<K, string>> = {
  en: {
    title: "Watchlist",
    sub: "Market quotes, movers and fair value for the assets you follow.",
    gainers: "Top gainers",
    losers: "Top losers",
    opps: "Opportunities",
    zone: "In buy zone",
    withTarget: "With target",
    noneZone: "No asset is at or below your buy price yet.",
    empty: "Your watchlist is empty",
    emptyHint: "Tap a ticker to start following it.",
    asset: "Asset",
    graph: "Price graph",
    last: "Last price",
    buy: "Buy price",
    iv: "DCF estimate",
    set: "Set",
    under: "Undervalued",
    over: "Overvalued",
    na: "n/a",
    comparisonUnavailable: "Current-price comparison is unavailable.",
    dcfLoadError: "DCF data could not be loaded.",
    noData: "No data for this period.",
    remove: "Remove",
    browse: "Search markets",
    addMore: "Add more",
    analysis: "Watchlist analysis",
    analysisDesc: "Top movers and buy-zone analysis are part of Pro.",
    fairValue: "DCF estimates",
    fairValueDesc: "Simplified DCF estimates and price comparisons are part of Pro.",
    loadError: "Could not load market data.",
    retry: "Retry",
    unavailable: "Unavailable",
    noMatch: "This asset is not currently on your watchlist.",
    clearSearch: "Show full watchlist",
  },
  bg: {
    title: "Watchlist",
    sub: "Пазарни котировки, движения и справедлива стойност за активите, които следиш.",
    gainers: "Най-голям ръст",
    losers: "Най-голям спад",
    opps: "Възможности",
    zone: "В зона за покупка",
    withTarget: "Със зададена цел",
    noneZone: "Още няма актив на или под твоята цена за покупка.",
    empty: "Watchlist-ът ти е празен",
    emptyHint: "Натисни тикер, за да започнеш да го следиш.",
    asset: "Актив",
    graph: "Графика",
    last: "Последна цена",
    buy: "Цена за покупка",
    iv: "DCF оценка",
    set: "Задай",
    under: "Подценена",
    over: "Надценена",
    na: "няма",
    comparisonUnavailable: "Сравнението с текущата цена не е налично.",
    dcfLoadError: "DCF данните не можаха да се заредят.",
    noData: "Няма данни за периода.",
    remove: "Премахни",
    browse: "Търси на пазара",
    addMore: "Добави още",
    analysis: "Анализ на Watchlist-а",
    analysisDesc: "Класациите и анализът на зоните за покупка са част от Pro.",
    fairValue: "DCF оценки",
    fairValueDesc: "Опростените DCF оценки и сравненията с цената са част от Pro.",
    loadError: "Пазарните данни не можаха да се заредят.",
    retry: "Опитай отново",
    unavailable: "Недостъпно",
    noMatch: "Този актив в момента не е в списъка ти за наблюдение.",
    clearSearch: "Покажи целия списък",
  },
  de: {
    title: "Watchlist",
    sub: "Marktkurse, Bewegungen und fairer Wert deiner beobachteten Werte.",
    gainers: "Top-Gewinner",
    losers: "Top-Verlierer",
    opps: "Chancen",
    zone: "In Kaufzone",
    withTarget: "Mit Ziel",
    noneZone: "Noch kein Wert auf oder unter deinem Kaufpreis.",
    empty: "Deine Watchlist ist leer",
    emptyHint: "Tippe auf einen Ticker, um ihm zu folgen.",
    asset: "Wert",
    graph: "Kursgrafik",
    last: "Letzter Kurs",
    buy: "Kaufpreis",
    iv: "DCF-Schätzung",
    set: "Setzen",
    under: "Unterbewertet",
    over: "Überbewertet",
    na: "k. A.",
    comparisonUnavailable: "Vergleich mit dem aktuellen Kurs nicht verfügbar.",
    dcfLoadError: "DCF-Daten konnten nicht geladen werden.",
    noData: "Keine Daten für den Zeitraum.",
    remove: "Entfernen",
    browse: "Märkte durchsuchen",
    addMore: "Weitere hinzufügen",
    analysis: "Watchlist-Analyse",
    analysisDesc: "Top-Bewegungen und Kaufzonen-Analysen sind Teil von Pro.",
    fairValue: "DCF-Schätzungen",
    fairValueDesc: "Vereinfachte DCF-Schätzungen und Kursvergleiche sind Teil von Pro.",
    loadError: "Marktdaten konnten nicht geladen werden.",
    retry: "Erneut versuchen",
    unavailable: "Nicht verfügbar",
    noMatch: "Dieser Wert ist derzeit nicht auf deiner Watchlist.",
    clearSearch: "Gesamte Watchlist anzeigen",
  },
  es: {
    title: "Watchlist",
    sub: "Cotizaciones, movimientos y valor razonable de tus activos.",
    gainers: "Mayores subidas",
    losers: "Mayores caídas",
    opps: "Oportunidades",
    zone: "En zona de compra",
    withTarget: "Con objetivo",
    noneZone: "Ningún activo está aún en o bajo tu precio de compra.",
    empty: "Tu watchlist está vacía",
    emptyHint: "Toca un ticker para seguirlo.",
    asset: "Activo",
    graph: "Gráfico",
    last: "Último precio",
    buy: "Precio de compra",
    iv: "Estimación DCF",
    set: "Fijar",
    under: "Infravalorada",
    over: "Sobrevalorada",
    na: "n/d",
    comparisonUnavailable: "Comparación con el precio actual no disponible.",
    dcfLoadError: "No se pudieron cargar los datos DCF.",
    noData: "Sin datos para el periodo.",
    remove: "Quitar",
    browse: "Buscar mercados",
    addMore: "Añadir más",
    analysis: "Análisis de watchlist",
    analysisDesc: "Los principales movimientos y el análisis de zonas de compra son parte de Pro.",
    fairValue: "Estimaciones DCF",
    fairValueDesc:
      "Las estimaciones DCF simplificadas y las comparaciones de precios son parte de Pro.",
    loadError: "No se pudieron cargar los datos de mercado.",
    retry: "Reintentar",
    unavailable: "No disponible",
    noMatch: "Este activo no está actualmente en tu lista.",
    clearSearch: "Mostrar toda la lista",
  },
  it: {
    title: "Watchlist",
    sub: "Quotazioni, movimenti e fair value degli asset che segui.",
    gainers: "Maggiori rialzi",
    losers: "Maggiori ribassi",
    opps: "Opportunità",
    zone: "In zona acquisto",
    withTarget: "Con obiettivo",
    noneZone: "Nessun titolo è ancora al o sotto il tuo prezzo d'acquisto.",
    empty: "La tua watchlist è vuota",
    emptyHint: "Tocca un ticker per seguirlo.",
    asset: "Titolo",
    graph: "Grafico",
    last: "Ultimo prezzo",
    buy: "Prezzo d'acquisto",
    iv: "Stima DCF",
    set: "Imposta",
    under: "Sottovalutata",
    over: "Sopravvalutata",
    na: "n/d",
    comparisonUnavailable: "Confronto con il prezzo attuale non disponibile.",
    dcfLoadError: "Impossibile caricare i dati DCF.",
    noData: "Nessun dato per il periodo.",
    remove: "Rimuovi",
    browse: "Cerca mercati",
    addMore: "Aggiungi altri",
    analysis: "Analisi watchlist",
    analysisDesc: "I migliori movimenti e l'analisi delle zone d'acquisto fanno parte di Pro.",
    fairValue: "Stime DCF",
    fairValueDesc: "Le stime DCF semplificate e i confronti con il prezzo fanno parte di Pro.",
    loadError: "Impossibile caricare i dati di mercato.",
    retry: "Riprova",
    unavailable: "Non disponibile",
    noMatch: "Questo asset non è attualmente nella tua lista.",
    clearSearch: "Mostra tutta la lista",
  },
};
const TARGET_REVIEW_COPY: Record<Lang, { review: string; reviewed: string }> = {
  en: { review: "Mark target reviewed", reviewed: "Reviewed" },
  bg: { review: "Отбележи целта като прегледана", reviewed: "Прегледана" },
  de: { review: "Ziel als geprüft markieren", reviewed: "Geprüft" },
  es: { review: "Marcar objetivo revisado", reviewed: "Revisado" },
  it: { review: "Segna obiettivo come rivisto", reviewed: "Rivisto" },
};

const assetOf = (s: string) =>
  MARKET_ASSETS.find((a) => a.symbol.toUpperCase() === s) ?? {
    symbol: s,
    name: s,
    type: "stock" as const,
  };

function Spark({
  closes,
  className = "h-10 w-28",
}: {
  closes: { c: number }[];
  className?: string;
}) {
  if (closes.length < 2) return <span className="text-xs text-muted-foreground">—</span>;
  const v = closes.map((x) => x.c);
  const min = Math.min(...v),
    max = Math.max(...v),
    span = max - min || 1;
  const pts = v
    .map((y, i) => `${(i / (v.length - 1)) * 100},${38 - ((y - min) / span) * 34}`)
    .join(" ");
  const up = v.at(-1)! >= v[0]!;
  const col = up ? "var(--success)" : "var(--destructive)";
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className={className} aria-hidden>
      <polygon
        points={`0,40 ${pts} 100,40`}
        style={{ fill: `color-mix(in oklab, ${col} 15%, transparent)` }}
      />
      <polyline
        points={pts}
        fill="none"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        style={{ stroke: col }}
      />
    </svg>
  );
}

function Watchlist() {
  const p = usePortfolio();
  const c = COPY[p.lang];
  const { symbol: requestedSymbol } = Route.useSearch();
  const locale = languageLocale(p.lang);
  const { list } = useWatchState();
  const [period, setPeriod] = useState<ChartRange>("1D");
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [targetReviews, setTargetReviews] = useState<Record<string, string>>({});
  useEffect(() => {
    const s = () => {
      setTargets(readTargets());
      setTargetReviews(readTargetReviews());
    };
    s();
    window.addEventListener("folio-watch", s);
    return () => window.removeEventListener("folio-watch", s);
  }, []);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [visibleSymbols, setVisibleSymbols] = useState<Set<string>>(() => new Set());
  const detailsFn = useServerFn(marketDetails);
  const quoteFn = useServerFn(marketQuote);
  const dcfFn = useServerFn(marketDcf);
  const assets = list
    .map(assetOf)
    .filter(
      (asset) => !requestedSymbol || asset.symbol.toUpperCase() === requestedSymbol.toUpperCase(),
    );
  const assetKey = assets.map((asset) => asset.symbol).join(",");
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setVisibleSymbols(new Set(assetKey ? assetKey.split(",") : []));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleSymbols((current) => {
          const next = new Set(current);
          let changed = false;
          for (const entry of entries) {
            const symbol = (entry.target as HTMLElement).dataset["watchSymbol"];
            if (!symbol) continue;
            if (entry.isIntersecting && !next.has(symbol)) {
              next.add(symbol);
              changed = true;
            } else if (!entry.isIntersecting && next.has(symbol)) {
              next.delete(symbol);
              changed = true;
            }
          }
          return changed ? next : current;
        });
      },
      { rootMargin: "200px 0px" },
    );
    document.querySelectorAll<HTMLElement>("[data-watch-symbol]").forEach((row) => {
      observer.observe(row);
    });
    return () => observer.disconnect();
  }, [assetKey]);
  const charts = useQueries({
    queries: assets.map((a) => ({
      queryKey: ["market-details", a.symbol, a.type, period],
      queryFn: () => detailsFn({ data: { symbol: a.symbol, type: a.type, range: period } }),
      staleTime: period === "1D" ? 60_000 : 600_000,
    })),
  });
  const quotes = useQueries({
    queries: assets.map((a) => ({
      queryKey: ["market-quote", a.symbol, a.type],
      queryFn: () => quoteFn({ data: { symbol: a.symbol, type: a.type } }),
      refetchInterval: visibleSymbols.has(a.symbol) ? 60_000 : false,
    })),
  });
  const dcfs = useQueries({
    queries: assets.map((a) => ({
      queryKey: ["market-dcf", a.symbol],
      queryFn: () =>
        a.type === "stock" ? dcfFn({ data: { symbol: a.symbol } }) : Promise.resolve(null),
      staleTime: 15 * 60_000,
      enabled: p.isPro && visibleSymbols.has(a.symbol),
    })),
  });

  const rows = assets.map((a, i) => {
    const closes = charts[i]?.data?.closes ?? [];
    const ret = closes.length > 1 ? (closes.at(-1)!.c / closes[0]!.c - 1) * 100 : null;
    const q = quotes[i]?.data?.quote ?? null;
    const d = dcfs[i]?.data;
    const iv = d ? dcfValueFromFundamentals(d, scenario("base", d.revenueGrowth ?? 0.05)) : null;
    return {
      a,
      closes,
      ret,
      q,
      iv,
      dcfCurrency: d?.currency ?? null,
      loading: !!charts[i]?.isLoading,
      chartError: !!charts[i]?.isError,
      chartUnavailable: !!charts[i]?.data?.unavailable,
      quoteError: !!quotes[i]?.isError,
      quoteUnavailable: quotes[i]?.data?.reason === "unavailable",
      quoteLoading: !!quotes[i]?.isLoading,
      dcfLoading: !!dcfs[i]?.isLoading,
      dcfFetched: !!dcfs[i]?.isFetched,
      dcfError: !!dcfs[i]?.isError,
      visible: visibleSymbols.has(a.symbol),
      retryChart: () => void charts[i]?.refetch(),
      retryQuote: () => void quotes[i]?.refetch(),
      retryDcf: () => void dcfs[i]?.refetch(),
      quoteAt: quotes[i]?.data?.quote?.at,
    };
  });
  const fmt = (n: number, cur?: string | null) => {
    try {
      return cur
        ? new Intl.NumberFormat(locale, {
            style: "currency",
            currency: cur,
            maximumFractionDigits: n < 10 ? 4 : 2,
          }).format(n)
        : n.toLocaleString(locale, { maximumFractionDigits: 2 });
    } catch {
      return n.toFixed(2);
    }
  };
  const withRet = rows.filter((r) => r.ret != null).sort((x, y) => y.ret! - x.ret!);
  const gainers = withRet.filter((r) => r.ret! > 0).slice(0, 5);
  const losers = withRet
    .filter((r) => r.ret! < 0)
    .reverse()
    .slice(0, 5);
  const zone = rows.filter((r) => inBuyZone(r.q?.price, targets[r.a.symbol]));
  const toggleWatch = (s: string) =>
    writeWatchlist(list.includes(s) ? list.filter((x) => x !== s) : [...list, s].slice(0, 30));
  const saveTarget = (s: string) => {
    const n = Number(draft.replace(",", "."));
    const next = { ...targets };
    if (n > 0) {
      next[s] = n;
      writeTargetReview(s);
    } else {
      delete next[s];
      clearTargetReview(s);
    }
    writeTargets(next);
    setEditing(null);
  };

  const Bars = ({ items, up }: { items: typeof rows; up: boolean }) => {
    const max = Math.max(...items.map((r) => Math.abs(r.ret!)), 0.01);
    if (!items.length)
      return <p className="py-10 text-center text-sm text-muted-foreground">{c.noData}</p>;
    return (
      <div className="flex h-48 items-end justify-around gap-2 pt-2">
        {items.map((r) => (
          <div key={r.a.symbol} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className={`text-xs font-bold ${up ? "text-success" : "text-destructive"}`}>
              {up ? "+" : ""}
              {r.ret!.toFixed(1)}%
            </span>
            <div
              className="flex w-full max-w-14 flex-col items-center justify-end rounded-t-xl pt-1.5 transition-all duration-700"
              style={{
                height: `${18 + (Math.abs(r.ret!) / max) * 82}px`,
                background: `linear-gradient(to top, color-mix(in oklab, var(${up ? "--success" : "--destructive"}) 20%, transparent), var(${up ? "--success" : "--destructive"}))`,
              }}
            >
              <CompanyLogo symbol={r.a.symbol} type={r.a.type} size={26} />
            </div>
            <span className="w-full truncate text-center text-[0.7rem] font-semibold">
              {r.a.symbol.replace(/\..*$/, "")}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{c.title}</h1>
          <p className="text-sm text-muted-foreground">{c.sub}</p>
        </div>
        {list.length > 0 && (
          <Link
            to="/markets"
            className="press inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus size={16} aria-hidden />
            {c.addMore}
          </Link>
        )}
      </div>

      {!list.length ? (
        <Card className="text-center">
          <Star className="mx-auto mb-2 text-primary" />
          <h2 className="font-display text-lg font-semibold">{c.empty}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{c.emptyHint}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGEST.map((s) => {
              const a = assetOf(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleWatch(s)}
                  className="press flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 text-sm font-semibold hover:border-primary"
                >
                  <CompanyLogo symbol={a.symbol} type={a.type} size={26} />
                  {s}
                </button>
              );
            })}
          </div>
          <Link to="/markets" className="mt-4 inline-block text-sm font-semibold text-primary">
            {c.browse} →
          </Link>
        </Card>
      ) : requestedSymbol && !assets.length ? (
        <Card className="text-center">
          <p className="text-sm text-muted-foreground">{c.noMatch}</p>
          <Link
            to="/watchlist"
            search={{}}
            className="mt-2 inline-block text-sm font-semibold text-primary hover:underline"
          >
            {c.clearSearch} →
          </Link>
        </Card>
      ) : (
        <>
          <Card className="p-0">
            <div
              className={`hidden gap-3 border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid ${p.isPro ? "grid-cols-[minmax(0,2fr)_8rem_1fr_1fr_1.3fr_2rem]" : "grid-cols-[minmax(0,2fr)_8rem_1fr_1fr_2rem]"}`}
            >
              <span>{c.asset}</span>
              <span>{c.graph}</span>
              <span className="text-right">{c.last}</span>
              <span className="text-right">{c.buy}</span>
              {p.isPro && <span className="text-right">{c.iv}</span>}
              <span />
            </div>
            <ul className="divide-y divide-border">
              {rows.map((r) => {
                const t = targets[r.a.symbol];
                const quoteCurrencyMatches =
                  !!r.q?.currency &&
                  !!r.dcfCurrency &&
                  r.q.currency.toUpperCase() === r.dcfCurrency.toUpperCase();
                const gap =
                  r.iv != null && r.iv > 0 && r.q && quoteCurrencyMatches && isQuoteFresh(r.quoteAt)
                    ? valuationGap(r.iv, r.q.price)
                    : null;
                return (
                  <li
                    key={r.a.symbol}
                    data-watch-symbol={r.a.symbol}
                    className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 ${p.isPro ? "md:grid-cols-[minmax(0,2fr)_8rem_1fr_1fr_1.3fr_2rem]" : "md:grid-cols-[minmax(0,2fr)_8rem_1fr_1fr_2rem]"}`}
                  >
                    <Link
                      to="/asset/$symbol"
                      params={{ symbol: r.a.symbol }}
                      className="flex min-w-0 items-center gap-3"
                    >
                      <CompanyLogo symbol={r.a.symbol} type={r.a.type} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{r.a.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {r.a.symbol}
                          {r.ret != null && (
                            <b
                              className={`ml-2 ${r.ret >= 0 ? "text-success" : "text-destructive"}`}
                            >
                              {r.ret >= 0 ? "+" : ""}
                              {r.ret.toFixed(2)}%
                            </b>
                          )}
                        </span>
                      </span>
                    </Link>
                    <div className="justify-self-end md:justify-self-start">
                      {r.loading ? (
                        <span className="block h-10 w-28 animate-pulse rounded bg-muted" />
                      ) : r.chartError || r.chartUnavailable ? (
                        <button
                          type="button"
                          onClick={r.retryChart}
                          className="text-xs font-semibold text-destructive underline"
                        >
                          {c.retry}
                        </button>
                      ) : (
                        <Spark closes={r.closes} />
                      )}
                    </div>
                    <p className="text-sm md:text-right">
                      <span className="text-xs text-muted-foreground md:hidden">{c.last}: </span>
                      <b>
                        {r.q
                          ? fmt(r.q.price, r.q.currency)
                          : r.quoteError || r.quoteUnavailable
                            ? c.unavailable
                            : r.quoteLoading
                              ? "…"
                              : "—"}
                      </b>
                      {(r.quoteError || r.quoteUnavailable) && (
                        <button
                          type="button"
                          onClick={r.retryQuote}
                          className="ml-1 text-xs font-semibold text-destructive underline"
                        >
                          {c.retry}
                        </button>
                      )}
                      {r.quoteAt && (
                        <QuoteFreshness
                          at={r.quoteAt}
                          lang={p.lang}
                          crypto={r.a.type === "crypto"}
                          compact
                        />
                      )}
                    </p>
                    <div className="text-right text-sm">
                      {editing === r.a.symbol ? (
                        <span className="inline-flex items-center gap-1">
                          <input
                            autoFocus
                            inputMode="decimal"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && saveTarget(r.a.symbol)}
                            className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm"
                            aria-label={c.buy}
                          />
                          <button
                            onClick={() => saveTarget(r.a.symbol)}
                            aria-label={c.set}
                            className="text-success"
                          >
                            <Check size={16} />
                          </button>
                        </span>
                      ) : (
                        <div>
                          <button
                            onClick={() => {
                              setEditing(r.a.symbol);
                              setDraft(t ? String(t) : "");
                            }}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${t ? (inBuyZone(r.q?.price, t) ? "bg-success/15 text-success" : "bg-secondary") : "border border-dashed border-border text-muted-foreground"}`}
                          >
                            <span className="md:hidden">{c.buy}: </span>
                            {t ? fmt(t, r.q?.currency) : c.set}
                            <Pencil size={11} />
                          </button>
                          {t && (
                            <button
                              type="button"
                              onClick={() => writeTargetReview(r.a.symbol)}
                              className="mt-1 block w-full text-[10px] text-muted-foreground hover:text-foreground"
                            >
                              {targetReviews[r.a.symbol]
                                ? `${TARGET_REVIEW_COPY[p.lang].reviewed}: ${new Date(`${targetReviews[r.a.symbol]}T12:00:00`).toLocaleDateString(locale, { dateStyle: "medium" })}`
                                : TARGET_REVIEW_COPY[p.lang].review}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {p.isPro && (
                      <div className="text-sm md:text-right">
                        <span className="text-xs text-muted-foreground md:hidden">{c.iv}: </span>
                        {(!r.visible && !r.dcfFetched) || r.dcfLoading ? (
                          <span role="status">…</span>
                        ) : r.dcfError ? (
                          <button
                            type="button"
                            onClick={r.retryDcf}
                            className="text-xs text-destructive underline"
                          >
                            {c.dcfLoadError} {c.retry}
                          </button>
                        ) : r.iv != null && r.iv > 0 ? (
                          <span>
                            <b>{fmt(r.iv, r.dcfCurrency)}</b>{" "}
                            {gap != null ? (
                              <span
                                className={`ml-1 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${gap >= 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}
                              >
                                {gap >= 0 ? <Check size={11} /> : <X size={11} />}
                                {gap >= 0 ? c.under : c.over} {Math.abs(gap * 100).toFixed(0)}%
                              </span>
                            ) : (
                              <span className="block text-xs text-muted-foreground">
                                {c.comparisonUnavailable}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{c.na}</span>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => toggleWatch(r.a.symbol)}
                      aria-label={`${c.remove} ${r.a.symbol}`}
                      title={c.remove}
                      className="justify-self-end text-primary"
                    >
                      <Star size={16} className="fill-current" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
          <ProGate
            title={c.analysis}
            desc={c.analysisDesc}
            preview={
              <div className="grid h-48 grid-cols-3 items-end gap-3 p-3">
                {[
                  [35, 70, 48],
                  [65, 40, 82],
                  [50, 75, 30],
                ].map((bars, i) => (
                  <div
                    key={i}
                    className="flex h-full items-end justify-around gap-1 rounded-lg bg-secondary/70 p-2"
                  >
                    {bars.map((height, j) => (
                      <span
                        key={j}
                        className={`w-1/5 rounded-t ${i === 2 ? "bg-destructive/40" : "bg-success/40"}`}
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            }
            className="p-3"
          >
            <div role="group" className="mb-3 flex gap-1 overflow-x-auto">
              {PERIODS.map((r) => (
                <button
                  key={r}
                  onClick={() => setPeriod(r)}
                  aria-pressed={period === r}
                  className={`press rounded-full px-4 py-1.5 text-sm font-semibold ${period === r ? "bg-brand-gradient text-primary-foreground shadow-glow" : "bg-secondary text-muted-foreground"}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <Card>
                <h2 className="mb-1 flex items-center gap-2 font-semibold">
                  <Target size={16} className="text-primary" />
                  {c.opps}
                </h2>
                <div className="my-3 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl bg-secondary p-3">
                    <p className="font-display text-2xl font-bold text-success">{zone.length}</p>
                    <p className="text-xs text-muted-foreground">{c.zone}</p>
                  </div>
                  <div className="rounded-xl bg-secondary p-3">
                    <p className="font-display text-2xl font-bold">
                      {Object.keys(targets).filter((s) => list.includes(s)).length}/{list.length}
                    </p>
                    <p className="text-xs text-muted-foreground">{c.withTarget}</p>
                  </div>
                </div>
                {zone.length ? (
                  <ul className="space-y-2">
                    {zone.map((r) => (
                      <li key={r.a.symbol} className="flex items-center gap-2 text-sm">
                        <CompanyLogo symbol={r.a.symbol} type={r.a.type} size={28} />
                        <span className="flex-1 font-semibold">{r.a.symbol}</span>
                        <span>{fmt(r.q!.price, r.q!.currency)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">{c.noneZone}</p>
                )}
              </Card>
              <Card>
                <h2 className="flex items-center gap-2 font-semibold">
                  <TrendingUp size={16} className="text-success" />
                  {c.gainers} · {period}
                </h2>
                <Bars items={gainers} up />
              </Card>
              <Card>
                <h2 className="flex items-center gap-2 font-semibold">
                  <TrendingDown size={16} className="text-destructive" />
                  {c.losers} · {period}
                </h2>
                <Bars items={losers} up={false} />
              </Card>
            </div>
          </ProGate>
          {!p.isPro && (
            <ProGate
              title={c.fairValue}
              desc={c.fairValueDesc}
              preview={
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="h-8 w-8 rounded-full bg-primary/25" />
                      <span className="h-3 flex-1 rounded bg-muted" />
                      <span className="h-5 w-20 rounded bg-success/25" />
                    </div>
                  ))}
                </div>
              }
            >
              <span>{c.iv}</span>
            </ProGate>
          )}
        </>
      )}
    </div>
  );
}
