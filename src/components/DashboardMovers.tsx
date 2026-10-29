import { Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Card } from "@/components/AppShell";
import { CompanyLogo } from "@/components/CompanyLogo";
import { useWatchState } from "@/components/AssetExtras";
import { usePortfolio } from "@/lib/store";
import { languageLocale } from "@/lib/i18n";
import { MARKET_ASSETS } from "@/lib/market-search";
import { marketDetails, type ChartRange } from "@/lib/market.functions";

const POPULAR = [
  "AAPL",
  "MSFT",
  "NVDA",
  "META",
  "AMZN",
  "GOOGL",
  "AVGO",
  "BRK-B",
  "LLY",
  "JPM",
  "WMT",
  "ORCL",
  "COST",
  "TSLA",
  "BTC",
];
const RANGES: ChartRange[] = ["1D", "1W", "1M", "3M", "YTD", "1Y"];
const T = {
  bg: {
    title: "Компании, които следиш",
    popular: "Популярни компании",
    gain: "Ръст",
    noGainers: "Няма активи с ръст за този период.",
    loss: "Спадащи",
    noDecliners: "Няма спадащи активи за този период.",
    all: "Watchlist →",
    none: "Няма данни",
    unavailable: "Пазарните данни не можаха да се заредят.",
    retry: "Опитай отново",
  },
  en: {
    title: "Companies you follow",
    popular: "Popular companies",
    gain: "Gainers",
    noGainers: "No advancing assets for this period.",
    loss: "Decliners",
    noDecliners: "No declining assets for this period.",
    all: "Watchlist →",
    none: "No data",
    unavailable: "Market data could not be loaded.",
    retry: "Retry",
  },
  de: {
    title: "Beobachtete Unternehmen",
    popular: "Beliebte Unternehmen",
    gain: "Gewinner",
    noGainers: "Keine steigenden Werte in diesem Zeitraum.",
    loss: "Verlierer",
    noDecliners: "Keine rückläufigen Werte in diesem Zeitraum.",
    all: "Watchlist →",
    none: "Keine Daten",
    unavailable: "Marktdaten konnten nicht geladen werden.",
    retry: "Erneut versuchen",
  },
  es: {
    title: "Empresas que sigues",
    popular: "Empresas populares",
    gain: "Subidas",
    noGainers: "No hay activos al alza en este periodo.",
    loss: "Caídas",
    noDecliners: "No hay activos a la baja en este periodo.",
    all: "Watchlist →",
    none: "Sin datos",
    unavailable: "No se pudieron cargar los datos de mercado.",
    retry: "Reintentar",
  },
  it: {
    title: "Aziende che segui",
    popular: "Aziende popolari",
    gain: "Rialzi",
    noGainers: "Nessun asset in rialzo in questo periodo.",
    loss: "Ribassi",
    noDecliners: "Nessun asset in calo in questo periodo.",
    all: "Watchlist →",
    none: "Nessun dato",
    unavailable: "Impossibile caricare i dati di mercato.",
    retry: "Riprova",
  },
} as const;

const assetOf = (s: string) =>
  MARKET_ASSETS.find((a) => a.symbol.toUpperCase() === s) ?? {
    symbol: s,
    name: s,
    type: "stock" as const,
  };

function Spark({ v }: { v: number[] }) {
  if (v.length < 2) return <div className="h-8" />;
  const min = Math.min(...v),
    span = Math.max(...v) - min || 1;
  const pts = v
    .map((y, i) => `${(i / (v.length - 1)) * 100},${30 - ((y - min) / span) * 26}`)
    .join(" ");
  const col = v.at(-1)! >= v[0]! ? "var(--success)" : "var(--destructive)";
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-8 w-full" aria-hidden>
      <polygon
        points={`0,32 ${pts} 100,32`}
        style={{ fill: `color-mix(in oklab, ${col} 18%, transparent)` }}
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

export function DashboardMovers() {
  const p = usePortfolio();
  const c = T[p.lang];
  const { list } = useWatchState();
  const [range, setRange] = useState<ChartRange>("1D");
  const tickerDrag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startScrollLeft: number;
    dragging: boolean;
  } | null>(null);
  const suppressTickerClick = useRef(false);
  const symbols = (list.length ? list : POPULAR).slice(0, 12);
  const assets = symbols.map(assetOf);
  const fn = useServerFn(marketDetails);
  const charts = useQueries({
    queries: assets.map((a) => ({
      queryKey: ["market-details", a.symbol, a.type, range],
      queryFn: () => fn({ data: { symbol: a.symbol, type: a.type, range } }),
      staleTime: range === "1D" ? 60_000 : 600_000,
    })),
  });
  const rows = assets.map((a, i) => {
    const closes = (charts[i]?.data?.closes ?? []).map((x) => x.c).filter((n) => n > 0);
    const ret = closes.length > 1 ? (closes.at(-1)! / closes[0]! - 1) * 100 : null;
    return {
      a,
      closes,
      ret,
      cur: charts[i]?.data?.currency ?? undefined,
      loading: !!charts[i]?.isLoading,
    };
  });
  const unavailable = charts.some((chart) => chart.isError || chart.data?.unavailable);
  const ranked = rows.filter((r) => r.ret != null).sort((x, y) => y.ret! - x.ret!);
  const gainers = ranked.filter((r) => r.ret! > 0).slice(0, 3);
  const weakest = ranked
    .filter((r) => r.ret! < 0)
    .reverse()
    .slice(0, 3);
  const fmt = (n: number, cur?: string) => {
    try {
      return new Intl.NumberFormat(languageLocale(p.lang), {
        style: "currency",
        currency: cur || "USD",
        maximumFractionDigits: 2,
      }).format(n);
    } catch {
      return n.toFixed(2);
    }
  };

  const Mover = ({ r, up }: { r: (typeof rows)[number]; up: boolean }) => (
    <li>
      <Link
        to="/asset/$symbol"
        params={{ symbol: r.a.symbol }}
        className="flex items-center gap-2 rounded-lg py-1.5 transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <CompanyLogo symbol={r.a.symbol} type={r.a.type} size={28} />
        <span className="flex-1 truncate text-sm font-semibold">
          {r.a.symbol.replace(/\..*$/, "")}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${up ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}
        >
          {up ? "+" : ""}
          {r.ret!.toFixed(2)}%
        </span>
      </Link>
    </li>
  );

  const tickerCard = (r: (typeof rows)[number], copy = false) => (
    <Link
      key={r.a.symbol}
      to="/asset/$symbol"
      params={{ symbol: r.a.symbol }}
      tabIndex={copy ? -1 : undefined}
      className="market-ticker-item card-interactive press w-40 shrink-0 rounded-2xl border border-border bg-card p-3"
    >
      <div className="flex items-center gap-2">
        <CompanyLogo symbol={r.a.symbol} type={r.a.type} size={32} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{r.a.symbol.replace(/\..*$/, "")}</p>
          <p className="truncate text-[0.7rem] text-muted-foreground">{r.a.name}</p>
        </div>
      </div>
      <div className="mt-2">
        <Spark v={r.closes} />
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-1">
        <span className="truncate text-sm font-semibold">
          {r.closes.length ? fmt(r.closes.at(-1)!, r.cur) : r.loading ? "…" : "—"}
        </span>
        {r.ret != null && (
          <span className={`text-xs font-bold ${r.ret >= 0 ? "text-success" : "text-destructive"}`}>
            {r.ret >= 0 ? "+" : ""}
            {r.ret.toFixed(2)}%
          </span>
        )}
      </div>
    </Link>
  );

  return (
    <Card className="min-w-0 lg:col-span-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display font-semibold">{list.length ? c.title : c.popular}</h3>
        <div className="flex items-center gap-1">
          {RANGES.map((x) => (
            <button
              key={x}
              onClick={() => setRange(x)}
              aria-pressed={range === x}
              className={`press rounded-full px-2.5 py-1 text-xs font-semibold ${range === x ? "bg-brand-gradient text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              {x}
            </button>
          ))}
          <Link to="/watchlist" className="ml-2 text-sm font-semibold text-primary">
            {c.all}
          </Link>
        </div>
      </div>
      {unavailable && (
        <p role="alert" className="mb-2 text-sm text-destructive">
          {c.unavailable}{" "}
          <button
            type="button"
            onClick={() => void Promise.all(charts.map((chart) => chart.refetch()))}
            className="font-semibold underline"
          >
            {c.retry}
          </button>
        </p>
      )}
      <div
        className={`-mx-1 px-1 pb-2 ${list.length ? "flex snap-x gap-3 overflow-x-auto" : "market-ticker"}`}
        onPointerDown={(event) => {
          if (list.length || event.pointerType === "mouse") return;
          tickerDrag.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startScrollLeft: event.currentTarget.scrollLeft,
            dragging: false,
          };
        }}
        onPointerMove={(event) => {
          const drag = tickerDrag.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          const dx = event.clientX - drag.startX;
          const dy = event.clientY - drag.startY;
          if (!drag.dragging) {
            if (Math.abs(dx) < 8 || Math.abs(dy) > Math.abs(dx)) return;
            drag.dragging = true;
            suppressTickerClick.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.classList.add("is-dragging");
          }
          event.currentTarget.scrollLeft = drag.startScrollLeft - dx * 2;
        }}
        onPointerUp={(event) => {
          const drag = tickerDrag.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          if (drag.dragging) {
            event.currentTarget.classList.remove("is-dragging");
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }
          tickerDrag.current = null;
        }}
        onPointerCancel={(event) => {
          if (tickerDrag.current?.pointerId !== event.pointerId) return;
          event.currentTarget.classList.remove("is-dragging");
          tickerDrag.current = null;
          suppressTickerClick.current = false;
        }}
        onClickCapture={(event) => {
          if (!suppressTickerClick.current) return;
          event.preventDefault();
          event.stopPropagation();
          suppressTickerClick.current = false;
        }}
      >
        {list.length ? (
          rows.map((r) => tickerCard(r))
        ) : (
          <div className="market-ticker-track">
            {[false, true].map((copy) => (
              <div
                key={String(copy)}
                className="market-ticker-group"
                aria-hidden={copy || undefined}
              >
                {rows.map((r) => tickerCard(r, copy))}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase text-success">▲ {c.gain}</p>
          {gainers.length ? (
            <ul>
              {gainers.map((r) => (
                <Mover key={r.a.symbol} r={r} up />
              ))}
            </ul>
          ) : (
            <p className="py-2 text-xs text-muted-foreground">
              {ranked.length ? c.noGainers : c.none}
            </p>
          )}
        </div>
        <div>
          <p
            className={`text-xs font-semibold uppercase ${weakest.some((r) => r.ret! < 0) ? "text-destructive" : "text-muted-foreground"}`}
          >
            ▼ {c.loss}
          </p>
          {weakest.length ? (
            <ul>
              {weakest.map((r) => (
                <Mover key={r.a.symbol} r={r} up={r.ret! >= 0} />
              ))}
            </ul>
          ) : (
            <p className="py-2 text-xs text-muted-foreground">{c.none}</p>
          )}
        </div>
      </div>
    </Card>
  );
}
