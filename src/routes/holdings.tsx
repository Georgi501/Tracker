import { languageLocale, type Lang } from "@/lib/i18n";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowUp, ArrowUpDown, Plus, Search, Trash2, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CompanyLogo } from "@/components/CompanyLogo";
import { QuoteFreshness } from "@/components/QuoteFreshness";
import { Card, Delta } from "@/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { AddTransactionDialog, type TxPreset } from "@/components/AddTransactionDialog";
import { pct, usePortfolio } from "@/lib/store";
import type { AssetType } from "@/lib/portfolio";
import { marketQuote, searchMarket } from "@/lib/market.functions";
import { getSparklines } from "@/lib/sparklines.functions";
import { EmptyIllustration, Sparkline } from "@/components/Motion";
import { marketSearchSchema, searchCatalog, type MarketAsset } from "@/lib/market-search";

export const Route = createFileRoute("/holdings")({
  head: () => ({
    meta: [
      { title: "Holdings — Capispot Portfolio Tracker" },
      {
        name: "description",
        content:
          "Every position with quantity, price, average cost, market value and unrealised P/L, plus live market search.",
      },
      { property: "og:title", content: "Holdings — Capispot" },
      {
        property: "og:description",
        content: "Search your positions and live market quotes, then add a buy in one click.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Holdings,
});

const TYPES: (AssetType | "all")[] = ["all", "stock", "etf", "crypto", "cash", "realEstate"];

type SortKey = "name" | "qty" | "price" | "change" | "avgCost" | "value" | "pnl" | "pnlPct";
type HoldingRow = ReturnType<typeof usePortfolio>["holdings"][number];
function sortValue(h: HoldingRow, k: SortKey): number {
  switch (k) {
    case "qty":
      return h.quantity;
    case "price":
      return h.asset.price;
    case "change":
      return h.asset.change24h;
    case "avgCost":
      return h.avgCost;
    case "value":
      return h.value;
    case "pnl":
      return h.pnl;
    case "pnlPct":
      return h.pnlPct;
    default:
      return 0;
  }
}

const COPY: Record<
  Lang,
  Record<
    | "placeholder"
    | "market"
    | "searching"
    | "none"
    | "add"
    | "owned"
    | "empty"
    | "emptyHint"
    | "addHolding"
    | "addFirst"
    | "unavailable"
    | "popular"
    | "remove"
    | "confirmRemove",
    string
  >
> = {
  en: {
    placeholder: "Search holdings or any ticker (META, VWCE.DE, BTC)…",
    market: "Live market",
    searching: "Searching…",
    none: "No market results.",
    add: "Add",
    owned: "In portfolio",
    empty: "Your portfolio is empty",
    emptyHint: "Search any stock, ETF or crypto above to see its live price and add it.",
    addHolding: "Add holding",
    addFirst: "Add first position",
    unavailable: "Quote unavailable",
    popular: "Popular",
    remove: "Delete position",
    confirmRemove: "Delete {s} and all its transactions?",
  },
  bg: {
    placeholder: "Търси позиции или тикер (META, VWCE.DE, BTC)…",
    market: "Пазар на живо",
    searching: "Търсене…",
    none: "Няма пазарни резултати.",
    add: "Добави",
    owned: "В портфейла",
    empty: "Портфейлът ти е празен",
    emptyHint: "Потърси акция, ETF или крипто отгоре, за да видиш цената на живо и да я добавиш.",
    addHolding: "Добави холдинг",
    addFirst: "Добави първа позиция",
    unavailable: "Няма котировка",
    popular: "Популярни",
    remove: "Изтрий позиция",
    confirmRemove: "Да изтрия ли {s} и всички негови трансакции?",
  },
  de: {
    placeholder: "Positionen oder Ticker suchen (META, VWCE.DE, BTC)…",
    market: "Live-Markt",
    searching: "Suche…",
    none: "Keine Marktergebnisse.",
    add: "Hinzufügen",
    owned: "Im Portfolio",
    empty: "Dein Portfolio ist leer",
    emptyHint:
      "Suche oben eine Aktie, einen ETF oder Krypto, um den Live-Kurs zu sehen und hinzuzufügen.",
    addHolding: "Position hinzufügen",
    addFirst: "Erste Position hinzufügen",
    unavailable: "Kurs nicht verfügbar",
    popular: "Beliebt",
    remove: "Position löschen",
    confirmRemove: "{s} und alle Transaktionen löschen?",
  },
  es: {
    placeholder: "Busca posiciones o un ticker (META, VWCE.DE, BTC)…",
    market: "Mercado en vivo",
    searching: "Buscando…",
    none: "Sin resultados de mercado.",
    add: "Añadir",
    owned: "En cartera",
    empty: "Tu cartera está vacía",
    emptyHint: "Busca arriba una acción, ETF o cripto para ver su precio en vivo y añadirla.",
    addHolding: "Añadir posición",
    addFirst: "Añadir primera posición",
    unavailable: "Cotización no disponible",
    popular: "Populares",
    remove: "Eliminar posición",
    confirmRemove: "¿Eliminar {s} y todas sus transacciones?",
  },
  it: {
    placeholder: "Cerca posizioni o un ticker (META, VWCE.DE, BTC)…",
    market: "Mercato live",
    searching: "Ricerca…",
    none: "Nessun risultato di mercato.",
    add: "Aggiungi",
    owned: "In portafoglio",
    empty: "Il tuo portafoglio è vuoto",
    emptyHint:
      "Cerca sopra un'azione, un ETF o una cripto per vederne il prezzo live e aggiungerla.",
    addHolding: "Aggiungi posizione",
    addFirst: "Aggiungi prima posizione",
    unavailable: "Quotazione non disponibile",
    popular: "Popolari",
    remove: "Elimina posizione",
    confirmRemove: "Eliminare {s} e tutte le sue transazioni?",
  },
};

const POPULAR = ["AAPL", "META", "NVDA", "VWCE.DE", "BTC", "ETH"];

function Holdings() {
  const p = usePortfolio();
  const c = COPY[p.lang];
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [type, setType] = useState<AssetType | "all">("all");
  const [preset, setPreset] = useState<TxPreset | null>(null);
  const searchFn = useServerFn(searchMarket);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const market = useQuery({
    queryKey: ["holdings-market-search", debounced],
    queryFn: () => searchFn({ data: marketSearchSchema.parse({ query: debounced }) }),
    enabled: debounced.length >= 1,
    staleTime: 60_000,
  });

  const sparkFn = useServerFn(getSparklines);
  const sparkItems = p.holdings
    .flatMap((h) =>
      h.asset.type === "stock" || h.asset.type === "etf" || h.asset.type === "crypto"
        ? [{ symbol: h.asset.symbol, type: h.asset.type }]
        : [],
    )
    .slice(0, 40);
  const sparkKey = sparkItems.map((s) => s.symbol).join(",");
  const sparks = useQuery({
    queryKey: ["holdings-sparklines", sparkKey],
    queryFn: () => sparkFn({ data: { items: sparkItems } }),
    enabled: sparkItems.length > 0,
    staleTime: 6 * 3600_000,
  });
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "value", dir: -1 });
  const toggleSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "name" ? 1 : -1 },
    );
  const rows = p.holdings
    .filter(
      (h) =>
        (type === "all" || h.asset.type === type) &&
        (h.asset.name + h.asset.symbol).toLowerCase().includes(q.toLowerCase()),
    )
    .sort((a, b) => {
      if (sort.key === "name") return a.asset.name.localeCompare(b.asset.name) * sort.dir;
      const av = sortValue(a, sort.key),
        bv = sortValue(b, sort.key);
      // Missing quotes always sink to the bottom regardless of direction.
      if (!Number.isFinite(av)) return Number.isFinite(bv) ? 1 : 0;
      if (!Number.isFinite(bv)) return -1;
      return (av - bv) * sort.dir;
    });
  const Th = ({
    k,
    label,
    left,
    className = "",
  }: {
    k: SortKey;
    label: string;
    left?: boolean;
    className?: string;
  }) => (
    <th
      className={`py-2 font-medium ${left ? "" : "text-right"} ${className}`}
      aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
    >
      <button
        onClick={() => toggleSort(k)}
        className={`inline-flex items-center gap-1 hover:text-foreground ${sort.key === k ? "text-foreground" : ""}`}
      >
        {label}
        {sort.key === k ? (
          sort.dir === 1 ? (
            <ArrowUp size={12} />
          ) : (
            <ArrowDown size={12} />
          )
        ) : (
          <ArrowUpDown size={12} className="opacity-40" />
        )}
      </button>
    </th>
  );
  const sortLabels: Record<SortKey, string> = {
    name: p.t("name"),
    qty: p.t("qty"),
    price: p.t("price"),
    change: "24h %",
    avgCost: p.t("avgCost"),
    value: p.t("value"),
    pnl: p.t("pnl"),
    pnlPct: `${p.t("pnl")} %`,
  };
  const num = (n: number) => n.toLocaleString(languageLocale(p.lang), { maximumFractionDigits: 6 });
  const owned = new Set(p.assets.map((a) => a.symbol.toUpperCase()));

  const openAdd = (next: TxPreset | null) => {
    if (!p.user) {
      navigate({ to: "/auth" });
      return;
    }
    setPreset(next ?? { symbol: "", name: "", type: "stock" });
  };
  const removeAsset = async (id: string, symbol: string) => {
    const bg = p.lang === "bg";
    const [assetRow, txRows] = await Promise.all([
      supabase.from("assets").select("*").eq("id", id).single(),
      supabase.from("transactions").select("*").eq("asset_id", id),
    ]);
    if (assetRow.error || txRows.error) {
      toast.error((assetRow.error ?? txRows.error)?.message ?? "Error");
      return;
    }
    const { error } = await supabase.from("transactions").delete().eq("asset_id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    const removed = await supabase.from("assets").delete().eq("id", id);
    if (removed.error) {
      toast.error(removed.error.message);
      return;
    }
    await p.reload();
    toast(bg ? `${symbol} е премахнат` : `${symbol} removed`, {
      duration: 8000,
      action: {
        label: bg ? "Отмени" : "Undo",
        onClick: () => {
          void (async () => {
            const a = await supabase.from("assets").insert(assetRow.data);
            const t = txRows.data.length
              ? await supabase.from("transactions").insert(txRows.data)
              : { error: null };
            if (a.error || t.error) toast.error((a.error ?? t.error)?.message ?? "Error");
            else toast.success(bg ? `${symbol} е възстановен` : `${symbol} restored`);
            await p.reload();
          })();
        },
      },
    });
  };

  return (
    <div className="space-y-5">
      {p.holdings.length > 0 &&
        (() => {
          const total = p.holdings.reduce((s, h) => s + h.value, 0);
          const day = p.holdings.reduce((s, h) => s + h.dayChange, 0);
          const prev = total - day;
          const bg = p.lang === "bg";
          return (
            <Card>
              <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {bg ? "Обща стойност" : "Holdings Summary"}
                  </p>
                  <p className="font-display mt-1 text-3xl font-bold tabular-nums">
                    {p.money(total)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {bg ? "Дневна промяна" : "Day Change"}
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    <Delta value={day}>
                      {p.money(day, { sign: true })} ({prev > 0 ? pct((day / prev) * 100) : "—"})
                    </Delta>
                  </p>
                </div>
              </div>
            </Card>
          );
        })()}
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h1 className="font-display mr-auto text-2xl font-bold">{p.t("holdings")}</h1>
          <button
            type="button"
            onClick={() => openAdd(null)}
            className="bg-brand-gradient shadow-glow press flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus size={16} />
            {c.addHolding}
          </button>
          <div className="relative w-full sm:w-96">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={q}
              maxLength={60}
              autoComplete="off"
              onChange={(e) => setQ(e.target.value)}
              placeholder={c.placeholder}
              aria-label={c.placeholder}
              className="w-full rounded-full border border-input bg-background py-3 pl-9 pr-9 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/20"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                aria-label={p.t("close")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {!q && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">{c.popular}:</span>
            {POPULAR.map((s) => (
              <button
                key={s}
                onClick={() => setQ(s)}
                className="press rounded-full border border-border px-3 py-1.5 font-semibold hover:border-primary hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {q.trim() && (
          <div className="mb-5 rounded-xl border border-border bg-secondary/40 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <TrendingUp size={13} /> {c.market}
            </p>
            {(q.trim() !== debounced || market.isFetching) && (
              <p role="status" className="py-3 text-sm text-muted-foreground">
                {c.searching}
              </p>
            )}
            {q.trim() === debounced && market.data && !market.data.assets.length && (
              <p className="py-3 text-sm text-muted-foreground">{c.none}</p>
            )}
            <div className="divide-y divide-border">
              {(q.trim() === debounced && market.data ? market.data.assets : searchCatalog(q))
                .slice(0, 8)
                .map((a) => (
                  <MarketRow
                    key={a.symbol}
                    asset={a}
                    owned={owned.has(a.symbol.toUpperCase())}
                    copy={c}
                    onAdd={openAdd}
                  />
                ))}
            </div>
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-1">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${type === t ? "bg-brand-gradient text-primary-foreground shadow-glow" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
            >
              {t === "all" ? p.t("all") : p.t(t)}
            </button>
          ))}
        </div>

        {!p.holdings.length ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <EmptyIllustration />
            <p className="font-display text-lg font-semibold">{c.empty}</p>
            <p className="max-w-sm text-sm text-muted-foreground">{c.emptyHint}</p>
            <button
              onClick={() => openAdd(null)}
              className="bg-brand-gradient shadow-glow press mt-1 flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <Plus size={16} /> {c.addFirst}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2 md:hidden">
              <ArrowUpDown size={14} className="text-muted-foreground" />
              <select
                value={sort.key}
                onChange={(e) => toggleSort(e.target.value as SortKey)}
                aria-label="Sort"
                className="flex-1 rounded-full border border-input bg-background px-3 py-2 text-sm"
              >
                {(Object.keys(sortLabels) as SortKey[]).map((k) => (
                  <option key={k} value={k}>
                    {sortLabels[k]}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setSort((s) => ({ ...s, dir: s.dir === 1 ? -1 : 1 }))}
                aria-label="Toggle direction"
                className="press rounded-full border border-border p-2"
              >
                {sort.dir === 1 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
              </button>
            </div>
            <ul className="space-y-2.5 md:hidden">
              {rows.map((h, i) => (
                <li
                  key={h.asset.id}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className="rise-in flex items-center gap-3 rounded-2xl border border-border bg-background/60 p-3"
                >
                  <CompanyLogo symbol={h.asset.symbol} type={h.asset.type} />
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/asset/$symbol"
                      params={{ symbol: h.asset.symbol }}
                      className="block truncate font-semibold hover:text-primary"
                    >
                      {h.asset.name}
                    </Link>
                    <StaleBadge at={h.asset.quoteAt} price={h.asset.price} bg={p.lang === "bg"} />
                    <p className="text-xs text-muted-foreground">
                      {num(h.quantity)} · {h.asset.symbol} ·{" "}
                      <Delta value={h.asset.change24h}>{pct(h.asset.change24h)}</Delta>
                    </p>
                    <QuoteFreshness
                      at={h.asset.quoteAt}
                      lang={p.lang}
                      crypto={h.asset.type === "crypto"}
                      compact
                    />
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{p.money(h.value)}</p>
                    <p className="text-xs">
                      <Delta value={h.pnl}>
                        {p.money(h.pnl, { sign: true })} · {pct(h.pnlPct)}
                      </Delta>
                    </p>
                  </div>
                  <button
                    onClick={() => void removeAsset(h.asset.id, h.asset.symbol)}
                    aria-label={`${c.remove} ${h.asset.symbol}`}
                    className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
              {!rows.length && (
                <p className="py-10 text-center text-muted-foreground">{p.t("noResults")}</p>
              )}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr className="border-b border-border">
                    <Th k="name" label={p.t("name")} left />
                    <Th k="qty" label={p.t("qty")} className="px-2" />
                    <Th k="price" label={p.t("price")} className="px-2" />
                    <th className="w-24 px-2 text-right font-medium">30d</th>
                    <Th k="change" label="24h %" />
                    <Th k="avgCost" label={p.t("avgCost")} />
                    <Th k="value" label={p.t("value")} />
                    <Th k="pnl" label={p.t("pnl")} />
                    <Th k="pnlPct" label={`${p.t("pnl")} %`} />
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((h) => (
                    <tr
                      key={h.asset.id}
                      className="border-b border-border last:border-0 hover:bg-secondary/50"
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <CompanyLogo symbol={h.asset.symbol} type={h.asset.type} />
                          <div>
                            <Link
                              to="/asset/$symbol"
                              params={{ symbol: h.asset.symbol }}
                              className="font-semibold hover:text-primary"
                            >
                              {h.asset.name}
                            </Link>
                            <StaleBadge
                              at={h.asset.quoteAt}
                              price={h.asset.price}
                              bg={p.lang === "bg"}
                            />
                            <p className="text-xs text-muted-foreground">
                              {h.asset.symbol} · {p.t(h.asset.type)}
                            </p>
                            <QuoteFreshness
                              at={h.asset.quoteAt}
                              lang={p.lang}
                              crypto={h.asset.type === "crypto"}
                              compact
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-2 text-right">{num(h.quantity)}</td>
                      <td className="px-2 text-right">{p.money(h.asset.price)}</td>
                      <td className="px-2">
                        <div className="flex justify-end">
                          {sparks.data?.[h.asset.symbol] ? (
                            <Sparkline data={sparks.data[h.asset.symbol] ?? []} />
                          ) : sparks.isLoading &&
                            h.asset.type !== "cash" &&
                            h.asset.type !== "realEstate" ? (
                            <Skeleton className="h-5 w-20" />
                          ) : null}
                        </div>
                      </td>
                      <td className="text-right">
                        <Delta value={h.asset.change24h}>{pct(h.asset.change24h)}</Delta>
                      </td>
                      <td className="text-right">{p.money(h.avgCost)}</td>
                      <td className="text-right font-semibold">{p.money(h.value)}</td>
                      <td className="text-right">
                        <Delta value={h.pnl}>
                          <span className="font-semibold">{p.money(h.pnl, { sign: true })}</span>
                        </Delta>
                      </td>
                      <td className="text-right">
                        <Delta value={h.pnlPct}>{pct(h.pnlPct)}</Delta>
                      </td>
                      <td className="pl-2 text-right">
                        <button
                          onClick={() => void removeAsset(h.asset.id, h.asset.symbol)}
                          aria-label={`${c.remove} ${h.asset.symbol}`}
                          title={c.remove}
                          className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && (
                <p className="py-10 text-center text-muted-foreground">{p.t("noResults")}</p>
              )}
            </div>
          </>
        )}
      </Card>
      <AddTransactionDialog open={!!preset} preset={preset} onClose={() => setPreset(null)} />
    </div>
  );
}

function MarketRow({
  asset,
  owned,
  copy,
  onAdd,
}: {
  asset: MarketAsset;
  owned: boolean;
  copy: (typeof COPY)["en"];
  onAdd: (p: TxPreset) => void;
}) {
  const p = usePortfolio();
  const quoteFn = useServerFn(marketQuote);
  const quote = useQuery({
    queryKey: ["market-quote", asset.symbol, asset.type],
    queryFn: () => quoteFn({ data: { symbol: asset.symbol, type: asset.type } }),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const qt = quote.data?.quote;
  const locale = languageLocale(p.lang);
  const fmt = (v: number, cur: string) => {
    try {
      return v.toLocaleString(locale, {
        style: "currency",
        currency: cur,
        maximumFractionDigits: v < 10 ? 4 : 2,
      });
    } catch {
      return `${v.toFixed(2)} ${cur}`;
    }
  };
  // Convert the native quote into the dialog's display currency using the live EUR/USD rate only.
  const presetPrice = (() => {
    if (!qt) return undefined;
    if (qt.currency === p.currency) return qt.price;
    if (!p.eurPerUsd) return undefined;
    if (qt.currency === "USD" && p.currency === "EUR") return qt.price * p.eurPerUsd;
    if (qt.currency === "EUR" && p.currency === "USD") return qt.price / p.eurPerUsd;
    return undefined;
  })();
  return (
    <div className="flex items-center gap-3 py-2.5">
      <CompanyLogo symbol={asset.symbol} type={asset.type} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {asset.symbol}{" "}
          <span className="font-normal text-muted-foreground">· {p.t(asset.type)}</span>
        </p>
        <p className="truncate text-xs text-muted-foreground">{asset.name}</p>
      </div>
      <div className="text-right text-sm">
        {quote.isLoading ? (
          <span className="inline-block h-4 w-16 animate-pulse rounded bg-muted" />
        ) : qt ? (
          <>
            <p className="font-semibold">{fmt(qt.price, qt.currency)}</p>
            {qt.change != null && (
              <p className="text-xs">
                <Delta value={qt.change}>{pct(qt.change)}</Delta>
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">{copy.unavailable}</p>
        )}
      </div>
      <button
        onClick={() =>
          onAdd(
            qt && (qt.currency === "USD" || qt.currency === "EUR")
              ? {
                  symbol: asset.symbol,
                  name: asset.name,
                  type: asset.type,
                  price: qt.price,
                  currency: qt.currency,
                }
              : {
                  symbol: asset.symbol,
                  name: asset.name,
                  type: asset.type,
                  price: presetPrice,
                  currency: p.currency,
                },
          )
        }
        className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${owned ? "border border-border hover:bg-secondary" : "bg-primary text-primary-foreground hover:opacity-90"}`}
      >
        <Plus size={13} /> {owned ? copy.owned : copy.add}
      </button>
    </div>
  );
}

/** Flags quotes older than 4 days (covers weekends/holidays) or missing; never substitutes a price. */
function StaleBadge({ at, price, bg }: { at?: string | undefined; price: number; bg: boolean }) {
  const timestamp = at ? Date.parse(at) : Number.NaN;
  const missing = !(price > 0) || !Number.isFinite(timestamp);
  const old = !missing && Date.now() - timestamp > 4 * 86400000;
  if (!missing && !old) return null;
  return (
    <span
      title={Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : undefined}
      className="mt-0.5 inline-block rounded-full bg-destructive/15 px-2 text-[10px] font-semibold text-destructive"
    >
      {missing ? (bg ? "няма цена" : "no quote") : bg ? "остаряла цена" : "stale price"}
    </span>
  );
}
