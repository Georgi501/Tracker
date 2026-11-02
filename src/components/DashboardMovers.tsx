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
import { rangeChange, sharedSparklineScale, sparklineReturns } from "@/lib/ticker-movement";

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
    asOf: "Към",
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
    asOf: "As of",
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
    asOf: "Stand",
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
    asOf: "A fecha de",
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
    asOf: "Al",
  },
} as const;

const assetOf = (s: string) =>
  MARKET_ASSETS.find((a) => a.symbol.toUpperCase() === s) ?? {
    symbol: s,
    name: s,
    type: "stock" as const,
  };

function Spark({ values, scale }: { values: number[]; scale: number }) {
  if (values.length < 2) return <div className="h-6" />;
  const pts = values
    .map((value, index) => `${(index / (values.length - 1)) * 100},${16 - (value / scale) * 13}`)
    .join(" ");
  const col = values.at(-1)! >= 0 ? "var(--success)" : "var(--destructive)";
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-6 w-full" aria-hidden>
      <line
        x1="0"
        y1="16"
        x2="100"
        y2="16"
        stroke="var(--border)"
        strokeDasharray="2 3"
        strokeWidth="1"
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
      queryKey: ["market-details", "movement-v2", a.symbol, a.type, range],
      queryFn: () => fn({ data: { symbol: a.symbol, type: a.type, range } }),
      staleTime: range === "1D" ? 60_000 : 600_000,
    })),
  });
  const rows = assets.map((a, i) => {
    const data = charts[i]?.data;
    const closes = (data?.closes ?? []).map((x) => x.c).filter((n) => n > 0);
    const latestCandle = data?.closes.at(-1);
    const price = data?.lastPrice ?? closes.at(-1) ?? null;
    const dailyChange = data?.dailyChangePct ?? null;
    const referencePrice =
      range === "1D" && dailyChange != null && price != null && 1 + dailyChange / 100 > 0
        ? price / (1 + dailyChange / 100)
        : null;
    return {
      a,
      closes,
      price,
      change: range === "1D" ? dailyChange : rangeChange(closes, price),
      sparkline: sparklineReturns(closes, referencePrice, price),
      priceAt:
        data?.lastPriceAt ?? (latestCandle?.t ? new Date(latestCandle.t).toISOString() : null),
      cur: data?.currency ?? undefined,
      loading: !!charts[i]?.isLoading,
    };
  });
  const sparklineScale = sharedSparklineScale(
    rows.map((row) => row.sparkline),
    range,
  );
  const unavailable = charts.some((chart) => chart.isError || chart.data?.unavailable);
  const ranked = rows.filter((r) => r.change != null).sort((x, y) => y.change! - x.change!);
  const gainers = ranked.filter((r) => r.change! > 0).slice(0, 3);
  const weakest = ranked
    .filter((r) => r.change! < 0)
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
  const fmtPriceAt = (value: string) =>
    new Intl.DateTimeFormat(languageLocale(p.lang), {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));

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
          {r.change!.toFixed(2)}%
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
      className="market-ticker-item card-interactive press w-40 shrink-0 rounded-xl border border-border/70 bg-card/90 p-2.5"
    >
      <div className="flex items-center gap-2">
        <CompanyLogo symbol={r.a.symbol} type={r.a.type} size={32} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{r.a.symbol.replace(/\..*$/, "")}</p>
          <p className="truncate text-[0.7rem] text-muted-foreground">{r.a.name}</p>
        </div>
      </div>
      <div className="mt-1.5">
        <Spark values={r.sparkline} scale={sparklineScale} />
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-1">
        <span className="truncate text-base font-bold tabular-nums">
          {r.price != null ? fmt(r.price, r.cur) : r.loading ? "…" : "—"}
        </span>
        {r.change != null && (
          <span
            className={`shrink-0 text-xs font-bold ${r.change >= 0 ? "text-success" : "text-destructive"}`}
          >
            {r.change >= 0 ? "+" : ""}
            {r.change.toFixed(2)}%
          </span>
        )}
      </div>
      {r.priceAt && (
        <p
          className="mt-0.5 truncate text-[10px] leading-4 text-muted-foreground"
          title={`${c.asOf} ${new Date(r.priceAt).toLocaleString(languageLocale(p.lang))}`}
        >
          {c.asOf} {fmtPriceAt(r.priceAt)}
        </p>
      )}
    </Link>
  );

  return (
    <Card className="min-w-0 lg:col-span-3">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h3 className="font-display font-semibold">{list.length ? c.title : c.popular}</h3>
        <div className="flex w-full items-center gap-1 overflow-x-auto pb-1 sm:w-auto">
          {RANGES.map((x) => (
            <button
              key={x}
              onClick={() => setRange(x)}
              aria-pressed={range === x}
              className={`press shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${range === x ? "bg-brand-gradient text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              {x}
            </button>
          ))}
          <Link
            to="/watchlist"
            className="ml-auto shrink-0 whitespace-nowrap pl-2 text-sm font-semibold text-primary sm:ml-2"
          >
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
            className={`text-xs font-semibold uppercase ${weakest.some((r) => r.change! < 0) ? "text-destructive" : "text-muted-foreground"}`}
          >
            ▼ {c.loss}
          </p>
          {weakest.length ? (
            <ul>
              {weakest.map((r) => (
                <Mover key={r.a.symbol} r={r} up={r.change! >= 0} />
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
