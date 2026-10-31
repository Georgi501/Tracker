import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookmarkCheck, ChevronDown, Newspaper, RefreshCw, Search, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, Delta } from "@/components/AppShell";
import { usePortfolio, pct } from "@/lib/store";
import { languageLocale } from "@/lib/i18n";
import { marketCopy } from "@/lib/market-i18n";
import {
  MARKET_ASSETS,
  filterAndSortMarketAssets,
  marketSearchSchema,
  searchCatalog,
  ucitsInfo,
  type MarketAssetSort,
  type MarketAssetTypeFilter,
  type MarketAsset,
} from "@/lib/market-search";
import { CRYPTO_ASSETS } from "@/lib/crypto-assets";
import { marketQuote, searchMarket, type MarketNews } from "@/lib/market.functions";
import { AssetExtras, useWatchState } from "@/components/AssetExtras";
import { CompanyLogo } from "@/components/CompanyLogo";
import { KeyStats } from "@/components/KeyStats";
import { CompanyOverview } from "@/components/CompanyOverview";
import { ProCompanyResearch } from "@/components/ProCompanyResearch";
import { ProFinancials } from "@/components/ProFinancials";
import { writeWatchlist } from "@/lib/watchlist";
import { z } from "zod";

const NEWS_LABEL = {
  en: "News",
  bg: "Новини",
  de: "Nachrichten",
  es: "Noticias",
  it: "Notizie",
} as const;
const FEATURED_SYMBOLS = ["AAPL", "MSFT", "NVDA", "VWCE.DE", "BTC", "ETH"];
const FEATURED_ASSETS = FEATURED_SYMBOLS.flatMap((symbol) => {
  const asset = MARKET_ASSETS.find((candidate) => candidate.symbol === symbol);
  return asset ? [asset] : [];
});
type BrowseCategory = "featured" | "stocks" | "etfs" | "crypto";
const STOCK_ASSETS = MARKET_ASSETS.filter((asset) => asset.type === "stock").slice(0, 12);
const ETF_ASSETS = MARKET_ASSETS.filter((asset) => asset.type === "etf").slice(0, 12);
const CRYPTO_MARKET_ASSETS: MarketAsset[] = CRYPTO_ASSETS.slice(0, 12).map((asset) => ({
  ...asset,
  type: "crypto",
}));
const BROWSE_ASSETS: Record<BrowseCategory, MarketAsset[]> = {
  featured: FEATURED_ASSETS,
  stocks: STOCK_ASSETS,
  etfs: ETF_ASSETS,
  crypto: CRYPTO_MARKET_ASSETS,
};
const BROWSE_CATEGORIES: BrowseCategory[] = ["featured", "stocks", "etfs", "crypto"];

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
  const [browseCategory, setBrowseCategory] = useState<BrowseCategory | null>("featured");
  const [typeFilter, setTypeFilter] = useState<MarketAssetTypeFilter>("all");
  const [sortBy, setSortBy] = useState<MarketAssetSort>("relevance");
  const [results, setResults] = useState<MarketAsset[]>(BROWSE_ASSETS.featured);
  const watchState = useWatchState();
  const visibleResults = useMemo(
    () =>
      filterAndSortMarketAssets(
        results,
        query.trim() ? typeFilter : "all",
        sortBy,
        languageLocale(p.lang),
      ),
    [p.lang, query, results, sortBy, typeFilter],
  );
  useEffect(() => {
    const next = q ?? "";
    setQuery(next);
    setBrowseCategory(next ? null : "featured");
    setResults(next ? searchCatalog(next) : BROWSE_ASSETS.featured);
  }, [q]);
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
        setResults(BROWSE_ASSETS[browseCategory ?? "featured"]);
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
    [browseCategory, search],
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
  const toggleWatchlist = (asset: MarketAsset) => {
    const symbol = asset.symbol.toUpperCase();
    const list = watchState.list;
    if (!list.includes(symbol) && list.length >= 30) {
      toast.info(c.watchLimit);
      return;
    }
    try {
      writeWatchlist(
        list.includes(symbol) ? list.filter((item) => item !== symbol) : [...list, symbol],
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update watchlist");
    }
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
            spellCheck={false}
            placeholder={c.placeholder}
            maxLength={60}
            value={query}
            onChange={(e) => {
              ++searchId.current;
              setBusy(false);
              setQuery(e.target.value);
              const next = e.target.value;
              setBrowseCategory(next.trim() ? null : "featured");
              if (!next.trim()) setTypeFilter("all");
              setResults(next.trim() ? searchCatalog(next) : BROWSE_ASSETS.featured);
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
      {!query.trim() && (
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {c.browse}
          </h2>
          <div role="group" aria-label={c.browse} className="flex gap-2 overflow-x-auto pb-1">
            {BROWSE_CATEGORIES.map((category) => {
              const active = browseCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    ++searchId.current;
                    setBusy(false);
                    setSelected(null);
                    setBrowseCategory(category);
                    setTypeFilter("all");
                    setQuery("");
                    setResults(BROWSE_ASSETS[category]);
                    setNews([]);
                    setLimited(false);
                  }}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {c.categories[category]}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <section className="min-w-0">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {busy
              ? c.searching
              : query.trim()
                ? c.results
                : c.categories[browseCategory ?? "featured"]}
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            {query.trim() && (
              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  if (value === "all" || value === "stock" || value === "etf" || value === "crypto")
                    setTypeFilter(value);
                }}
              >
                <SelectTrigger aria-label={c.filterType} className="w-full sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{c.allTypes}</SelectItem>
                  <SelectItem value="stock">{p.t("stock")}</SelectItem>
                  <SelectItem value="etf">{p.t("etf")}</SelectItem>
                  <SelectItem value="crypto">{p.t("crypto")}</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Select
              value={sortBy}
              onValueChange={(value) => {
                if (value === "relevance" || value === "name" || value === "symbol")
                  setSortBy(value);
              }}
            >
              <SelectTrigger aria-label={c.sortBy} className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">{c.relevance}</SelectItem>
                <SelectItem value="name">{c.nameAscending}</SelectItem>
                <SelectItem value="symbol">{c.symbolAscending}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleResults.map((a) => (
            <li
              key={a.symbol}
              className="overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-secondary/20 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
            >
              <div className="flex items-center gap-2 p-2">
                <Button
                  variant="ghost"
                  onClick={() =>
                    selected && selected.symbol === a.symbol ? setSelected(null) : void loadQuote(a)
                  }
                  className="h-auto min-h-16 min-w-0 flex-1 justify-start whitespace-normal px-2 py-2 text-left"
                  aria-pressed={selected?.symbol === a.symbol}
                  aria-expanded={selected?.symbol === a.symbol}
                >
                  <CompanyLogo symbol={a.symbol} type={a.type} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="mb-1 block truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {a.symbol}
                    </span>
                    <span className="block truncate text-sm font-semibold">{a.name}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {p.t(a.type)}
                    </span>
                  </span>
                  <ChevronDown
                    className={`size-4 shrink-0 text-muted-foreground transition-transform ${selected?.symbol === a.symbol ? "rotate-180" : ""}`}
                  />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={
                    watchState.list.includes(a.symbol.toUpperCase()) ? c.watching : c.watch
                  }
                  aria-pressed={watchState.list.includes(a.symbol.toUpperCase())}
                  title={watchState.list.includes(a.symbol.toUpperCase()) ? c.watching : c.watch}
                  onClick={() => toggleWatchlist(a)}
                  className="size-9 shrink-0"
                >
                  {watchState.list.includes(a.symbol.toUpperCase()) ? (
                    <BookmarkCheck className="size-4 text-primary" />
                  ) : (
                    <Star className="size-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
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
                    <p className="numeric-display mt-2 min-h-9 text-3xl font-bold">
                      {quoteBusy ? (
                        <span
                          aria-hidden="true"
                          className="mt-1 block h-8 w-36 animate-pulse rounded bg-muted"
                        />
                      ) : quote?.quote ? (
                        new Intl.NumberFormat(languageLocale(p.lang), {
                          style: "currency",
                          currency: quote.quote.currency,
                        }).format(quote.quote.price)
                      ) : (
                        "—"
                      )}
                    </p>
                    {quoteBusy && (
                      <p role="status" className="mt-2 text-sm text-muted-foreground">
                        {c.loadingQuote}
                      </p>
                    )}
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
        {!visibleResults.length && <p className="py-8 text-sm text-muted-foreground">{c.empty}</p>}
        {limited && (
          <p role="status" className="mt-3 text-sm text-muted-foreground">
            {c.limited}
          </p>
        )}
      </section>
      {news.length > 0 &&
        (!selected || !results.some((asset) => asset.symbol === selected.symbol)) && (
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
