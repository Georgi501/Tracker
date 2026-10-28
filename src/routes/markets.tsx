import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Newspaper, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, Delta } from "@/components/AppShell";
import { usePortfolio, pct } from "@/lib/store";
import { languageLocale } from "@/lib/i18n";
import { marketCopy } from "@/lib/market-i18n";
import {
  MARKET_ASSETS,
  marketSearchSchema,
  searchCatalog,
  ucitsInfo,
  type MarketAsset,
} from "@/lib/market-search";
import { marketQuote, searchMarket, type MarketNews } from "@/lib/market.functions";
import { AssetExtras } from "@/components/AssetExtras";
import { CompanyLogo } from "@/components/CompanyLogo";
import { KeyStats } from "@/components/KeyStats";
import { CompanyOverview } from "@/components/CompanyOverview";
import { ProCompanyResearch } from "@/components/ProCompanyResearch";
import { ProFinancials } from "@/components/ProFinancials";
import { z } from "zod";

const NEWS_LABEL = {
  en: "News",
  bg: "Новини",
  de: "Nachrichten",
  es: "Noticias",
  it: "Notizie",
} as const;

export const Route = createFileRoute("/markets")({
  head: () => ({
    meta: [
      { title: "Asset search — Capispot Portfolio Tracker" },
      {
        name: "description",
        content:
          "Search stocks, ETFs and crypto by company name or ticker and inspect the latest available quote.",
      },
      { property: "og:title", content: "Asset search — Capispot" },
      {
        property: "og:description",
        content: "Find Meta, Netflix and other assets with market quote details.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (s) => z.object({ q: z.string().max(60).optional().catch(undefined) }).parse(s),
  component: Markets,
});

function Markets() {
  const p = usePortfolio();
  const c = marketCopy[p.lang];
  const search = useServerFn(searchMarket);
  const fetchQuote = useServerFn(marketQuote);
  const { q } = Route.useSearch();
  const [query, setQuery] = useState(q ?? "");
  useEffect(() => {
    const next = q ?? "";
    setQuery(next);
    setResults(searchCatalog(next));
  }, [q]);
  const [results, setResults] = useState<MarketAsset[]>(MARKET_ASSETS);
  const [selected, setSelected] = useState<MarketAsset | null>(null);
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof marketQuote>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [limited, setLimited] = useState(false);
  const [news, setNews] = useState<MarketNews[]>([]);
  const searchId = useRef(0);
  const quoteId = useRef(0);
  const loadQuote = useCallback(
    async (asset: MarketAsset) => {
      const id = ++quoteId.current;
      setSelected(asset);
      setQuote(null);
      setQuoteBusy(true);
      try {
        const result = await fetchQuote({ data: { symbol: asset.symbol, type: asset.type } });
        if (id === quoteId.current) setQuote(result);
      } catch {
        if (id === quoteId.current) setQuote({ quote: null, reason: "unavailable" });
      } finally {
        if (id === quoteId.current) setQuoteBusy(false);
      }
    },
    [fetchQuote],
  );
  useEffect(() => {
    if (!selected) return;
    const timer = setInterval(() => {
      void loadQuote(selected);
    }, 60000);
    return () => clearInterval(timer);
  }, [loadQuote, selected]);
  const runSearch = useCallback(
    async (raw: string) => {
      const id = ++searchId.current;
      if (!raw.trim()) {
        setResults(MARKET_ASSETS);
        setNews([]);
        setLimited(false);
        setBusy(false);
        return;
      }
      const validated = marketSearchSchema.safeParse({ query: raw });
      if (!validated.success) return;
      setBusy(true);
      setResults(searchCatalog(raw));
      try {
        const result = await search({ data: validated.data });
        if (id === searchId.current) {
          setResults(result.assets);
          setNews(result.news);
          setLimited(result.unavailable);
        }
      } catch {
        if (id === searchId.current) setLimited(true);
      } finally {
        if (id === searchId.current) setBusy(false);
      }
    },
    [search],
  );
  useEffect(() => {
    const timer = setTimeout(() => {
      void runSearch(query);
    }, 350);
    const currentSearchId = searchId;
    return () => {
      clearTimeout(timer);
      ++currentSearchId.current;
    };
  }, [query, runSearch]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void runSearch(query);
  };
  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold">{c.markets}</h1>
      <form onSubmit={submit} className="flex max-w-2xl gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
          <Input
            aria-label={c.search}
            autoComplete="off"
            placeholder={c.placeholder}
            maxLength={60}
            value={query}
            onChange={(e) => {
              ++searchId.current;
              setBusy(false);
              setQuery(e.target.value);
              setResults(searchCatalog(e.target.value));
              setLimited(false);
            }}
            className="h-10 pl-9"
          />
        </div>
        <Button type="submit" disabled={busy} className="h-10">
          <Search />
          {c.search}
        </Button>
      </form>
      <section className="min-w-0">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          {busy ? c.searching : c.results}
        </h2>
        <ul className="divide-y divide-border">
          {results.map((a) => (
            <li key={a.symbol}>
              <Button
                variant="ghost"
                onClick={() =>
                  selected && selected.symbol === a.symbol ? setSelected(null) : void loadQuote(a)
                }
                className="h-auto min-h-16 w-full justify-start whitespace-normal px-3 py-3 text-left"
                aria-pressed={selected?.symbol === a.symbol}
                aria-expanded={selected?.symbol === a.symbol}
              >
                <CompanyLogo symbol={a.symbol} type={a.type} />
                <span className="min-w-0 flex-1">
                  <span className="block break-words font-semibold">{a.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {a.symbol} · {p.t(a.type)}
                  </span>
                </span>
                <ChevronDown
                  className={`shrink-0 text-muted-foreground transition-transform ${selected?.symbol === a.symbol ? "rotate-180" : ""}`}
                />
              </Button>
              {selected && selected.symbol === a.symbol && (
                <Card className="mb-2 ml-3 mr-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {selected.symbol} · {p.t(selected.type)}
                      </p>
                      <h3 className="font-display break-words text-xl font-semibold">
                        {selected.name}
                      </h3>
                      {(() => {
                        const u = ucitsInfo(selected.symbol);
                        if (!u) return null;
                        const bg = p.lang === "bg";
                        return (
                          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                            {[
                              "UCITS",
                              u.isin,
                              {
                                IE: bg ? "Ирландия" : "Ireland",
                                LU: bg ? "Люксембург" : "Luxembourg",
                                DE: bg ? "Германия" : "Germany",
                              }[u.domicile],
                              u.policy === "acc"
                                ? bg
                                  ? "Акумулиращ"
                                  : "Accumulating"
                                : bg
                                  ? "Разпределящ"
                                  : "Distributing",
                              u.index,
                            ].map((t) => (
                              <span
                                key={t}
                                className="rounded-full bg-primary/15 px-2 py-0.5 font-semibold text-primary"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={quoteBusy}
                      aria-label={c.refresh}
                      title={c.refresh}
                      onClick={() => void loadQuote(selected)}
                    >
                      <RefreshCw className={quoteBusy ? "animate-spin" : ""} />
                    </Button>
                  </div>
                  <div className="mt-4" aria-live="polite">
                    <p className="text-sm text-muted-foreground">{c.latest}</p>
                    <p className="font-display mt-2 text-3xl font-bold">
                      {quoteBusy
                        ? "…"
                        : quote?.quote
                          ? new Intl.NumberFormat(languageLocale(p.lang), {
                              style: "currency",
                              currency: quote.quote.currency,
                            }).format(quote.quote.price)
                          : "—"}
                    </p>
                    {quote?.quote && (
                      <>
                        <p className="mt-2 text-sm">
                          <Delta value={quote.quote.change ?? Number.NaN}>
                            {pct(quote.quote.change ?? Number.NaN)}
                          </Delta>{" "}
                          <span className="text-muted-foreground">{c.change}</span>
                        </p>
                        <p className="mt-4 text-xs text-muted-foreground">
                          {c.updated}:{" "}
                          {new Date(quote.quote.at).toLocaleString(languageLocale(p.lang))}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {c.source}: {quote.quote.source} · {quote.quote.currency}
                        </p>
                      </>
                    )}
                    {!quoteBusy && quote && !quote.quote && (
                      <p role="status" className="mt-3 text-sm text-muted-foreground">
                        {c.unavailable}
                      </p>
                    )}
                  </div>
                  {selected.type !== "crypto" && (
                    <KeyStats symbol={selected.symbol} lang={p.lang} />
                  )}
                  <AssetExtras asset={selected} price={quote?.quote?.price ?? null} />
                  {selected.type === "stock" && (
                    <ProFinancials symbol={selected.symbol} lang={p.lang} />
                  )}
                  {selected.type === "stock" && (
                    <ProCompanyResearch symbol={selected.symbol} lang={p.lang} />
                  )}
                  <CompanyOverview asset={selected} lang={p.lang} />
                </Card>
              )}
            </li>
          ))}
        </ul>
        {!results.length && <p className="py-8 text-sm text-muted-foreground">{c.empty}</p>}
        {limited && (
          <p role="status" className="mt-3 text-sm text-muted-foreground">
            {c.limited}
          </p>
        )}
      </section>
      {news.length > 0 && (
        <section className="min-w-0">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Newspaper size={16} />
            {NEWS_LABEL[p.lang]}
          </h2>
          <ul className="divide-y divide-border">
            {news.map((n) => (
              <li key={n.id}>
                <a
                  href={n.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-md px-3 py-3 hover:bg-secondary"
                >
                  <span className="block font-semibold leading-snug">{n.title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {n.publisher}
                    {n.at
                      ? ` · ${new Date(n.at).toLocaleString(languageLocale(p.lang), { dateStyle: "medium", timeStyle: "short" })}`
                      : ""}
                    {n.tickers.length ? ` · ${n.tickers.join(", ")}` : ""}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
