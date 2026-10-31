import { Pause, Play, TrendingDown, TrendingUp } from "lucide-react";
import { useQueries } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card } from "@/components/AppShell";
import { Link } from "@tanstack/react-router";
import { marketQuote } from "@/lib/market.functions";
import { MARKET_TICKER_INSTRUMENTS } from "@/lib/market-ticker";
import { languageLocale, type Lang } from "@/lib/i18n";
import { usePortfolio } from "@/lib/store";

const COPY: Record<
  Lang,
  {
    title: string;
    updated: string;
    source: string;
    delayed: string;
    unavailable: string;
    loading: string;
    pause: string;
    resume: string;
  }
> = {
  en: {
    title: "Markets today",
    updated: "Updated",
    source: "Yahoo Finance",
    delayed: "Quotes may be delayed",
    unavailable: "Unavailable",
    loading: "Loading quote",
    pause: "Pause market ticker",
    resume: "Resume market ticker",
  },
  bg: {
    title: "Пазарите днес",
    updated: "Обновено",
    source: "Yahoo Finance",
    delayed: "Котировките може да са забавени",
    unavailable: "Недостъпно",
    loading: "Зареждане на котировка",
    pause: "Пауза на пазарната лента",
    resume: "Пусни пазарната лента",
  },
  de: {
    title: "Märkte heute",
    updated: "Aktualisiert",
    source: "Yahoo Finance",
    delayed: "Kurse können verzögert sein",
    unavailable: "Nicht verfügbar",
    loading: "Kurs wird geladen",
    pause: "Marktband pausieren",
    resume: "Marktband fortsetzen",
  },
  es: {
    title: "Mercados hoy",
    updated: "Actualizado",
    source: "Yahoo Finance",
    delayed: "Las cotizaciones pueden tener retraso",
    unavailable: "No disponible",
    loading: "Cargando cotización",
    pause: "Pausar la cinta de mercado",
    resume: "Reanudar la cinta de mercado",
  },
  it: {
    title: "Mercati oggi",
    updated: "Aggiornato",
    source: "Yahoo Finance",
    delayed: "Le quotazioni potrebbero essere ritardate",
    unavailable: "Non disponibile",
    loading: "Caricamento quotazione",
    pause: "Metti in pausa il ticker",
    resume: "Riprendi il ticker",
  },
};

export function MarketTicker() {
  const { lang } = usePortfolio();
  const c = COPY[lang];
  const quoteFn = useServerFn(marketQuote);
  const [paused, setPaused] = useState(false);
  const queries = useQueries({
    queries: MARKET_TICKER_INSTRUMENTS.map((market) => ({
      queryKey: ["market-quote", market.symbol, "stock"],
      queryFn: () => quoteFn({ data: { symbol: market.symbol, type: "stock" } }),
      staleTime: 300_000,
      refetchInterval: 300_000,
    })),
  });
  const entries = MARKET_TICKER_INSTRUMENTS.map((market, index) => ({
    market,
    query: queries[index],
    quote: queries[index]?.data?.quote ?? null,
  }));
  const latestAt = entries
    .map((entry) => entry.quote?.at)
    .filter((at): at is string => !!at && Number.isFinite(Date.parse(at)))
    .sort()
    .at(-1);
  const updated = latestAt
    ? new Intl.DateTimeFormat(languageLocale(lang), { hour: "2-digit", minute: "2-digit" }).format(
        new Date(latestAt),
      )
    : null;

  const formatPrice = (price: number, currency: string | null, fx: boolean) => {
    if (fx)
      return new Intl.NumberFormat(languageLocale(lang), {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      }).format(price);
    if (currency) {
      try {
        return new Intl.NumberFormat(languageLocale(lang), {
          style: "currency",
          currency,
          maximumFractionDigits: price < 10 ? 4 : 2,
        }).format(price);
      } catch {
        return `${price.toLocaleString(languageLocale(lang), { maximumFractionDigits: 2 })} ${currency}`;
      }
    }
    return price.toLocaleString(languageLocale(lang), { maximumFractionDigits: 2 });
  };

  const tickerItems = (duplicate = false) => (
    <div className="market-ticker-group" aria-hidden={duplicate ? true : undefined}>
      {entries.map(({ market, query, quote }) => {
        const change = quote?.change;
        const up = change != null && change >= 0;
        const Icon = up ? TrendingUp : TrendingDown;
        return (
          <Link
            to="/market/$slug"
            params={{ slug: market.slug }}
            key={market.symbol}
            className="market-ticker-item flex w-40 shrink-0 items-center gap-2 rounded-xl border border-primary/15 bg-card/55 px-3 py-2.5 shadow-sm backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-44"
            title={
              quote
                ? `${c.source} · ${c.updated} ${new Date(quote.at).toLocaleString(languageLocale(lang))}`
                : `${market.symbol} · ${c.unavailable}`
            }
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-muted-foreground">
                {market.label[lang]}
              </p>
              <p className="truncate text-sm font-bold tabular-nums">
                {quote ? formatPrice(quote.price, quote.currency, market.category === "fx") : "—"}
              </p>
            </div>
            {quote ? (
              change != null ? (
                <span
                  className={`inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold tabular-nums ${up ? "text-success" : "text-destructive"}`}
                >
                  <Icon size={12} aria-hidden />
                  {change > 0 ? "+" : ""}
                  {change.toFixed(2)}%
                </span>
              ) : (
                <span className="shrink-0 text-xs text-muted-foreground">—</span>
              )
            ) : query?.isError || query?.data?.reason === "unavailable" ? (
              <span className="shrink-0 text-[10px] text-muted-foreground">{c.unavailable}</span>
            ) : (
              <span className="shrink-0 text-xs text-muted-foreground" aria-label={c.loading}>
                …
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );

  return (
    <Card className="overflow-hidden border-primary/15 bg-gradient-to-r from-primary/[0.045] via-card/65 to-chart-2/[0.06] p-3 shadow-sm backdrop-blur-xl sm:p-4 lg:col-span-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {c.title}
          </h2>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {updated ? `${c.updated} ${updated}` : c.source}
            <span aria-hidden> · </span>
            {c.source}
            <span aria-hidden> · </span>
            {c.delayed}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          aria-label={paused ? c.resume : c.pause}
          aria-pressed={paused}
          className="grid size-9 shrink-0 place-items-center rounded-full border border-border/70 bg-background/50 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {paused ? <Play size={14} aria-hidden /> : <Pause size={14} aria-hidden />}
        </button>
      </div>
      <div className="market-ticker market-index-ticker" aria-label={c.title} aria-live="off">
        <div className={`market-ticker-track ${paused ? "is-paused" : ""}`}>
          {tickerItems()}
          {tickerItems(true)}
        </div>
      </div>
    </Card>
  );
}
