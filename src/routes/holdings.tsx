import { languageLocale, type Lang } from "@/lib/i18n";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Search, Trash2, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, Delta } from "@/components/AppShell";
import { AddTransactionDialog, type TxPreset } from "@/components/AddTransactionDialog";
import { pct, usePortfolio } from "@/lib/store";
import type { AssetType } from "@/lib/portfolio";
import { marketQuote, searchMarket } from "@/lib/market.functions";
import { marketSearchSchema, searchCatalog, type MarketAsset } from "@/lib/market-search";

export const Route = createFileRoute("/holdings")({
  head: () => ({
    meta: [
      { title: "Holdings — folio. Portfolio Tracker" },
      { name: "description", content: "Every position with quantity, price, average cost, market value and unrealised P/L, plus live market search." },
      { property: "og:title", content: "Holdings — folio." },
      { property: "og:description", content: "Search your positions and live market quotes, then add a buy in one click." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Holdings,
});

const TYPES: (AssetType | "all")[] = ["all", "stock", "etf", "crypto", "cash", "realEstate"];

const COPY: Record<Lang, Record<"placeholder" | "market" | "searching" | "none" | "add" | "owned" | "empty" | "emptyHint" | "addFirst" | "unavailable" | "popular" | "remove" | "confirmRemove", string>> = {
  en: { placeholder: "Search holdings or any ticker (META, VWCE.DE, BTC)…", market: "Live market", searching: "Searching…", none: "No market results.", add: "Add", owned: "In portfolio", empty: "Your portfolio is empty", emptyHint: "Search any stock, ETF or crypto above to see its live price and add it.", addFirst: "Add first position", unavailable: "Quote unavailable", popular: "Popular", remove: "Delete position", confirmRemove: "Delete {s} and all its transactions?" },
  bg: { placeholder: "Търси позиции или тикер (META, VWCE.DE, BTC)…", market: "Пазар на живо", searching: "Търсене…", none: "Няма пазарни резултати.", add: "Добави", owned: "В портфейла", empty: "Портфейлът ти е празен", emptyHint: "Потърси акция, ETF или крипто отгоре, за да видиш цената на живо и да я добавиш.", addFirst: "Добави първа позиция", unavailable: "Няма котировка", popular: "Популярни", remove: "Изтрий позиция", confirmRemove: "Да изтрия ли {s} и всички негови трансакции?" },
  de: { placeholder: "Positionen oder Ticker suchen (META, VWCE.DE, BTC)…", market: "Live-Markt", searching: "Suche…", none: "Keine Marktergebnisse.", add: "Hinzufügen", owned: "Im Portfolio", empty: "Dein Portfolio ist leer", emptyHint: "Suche oben eine Aktie, einen ETF oder Krypto, um den Live-Kurs zu sehen und hinzuzufügen.", addFirst: "Erste Position hinzufügen", unavailable: "Kurs nicht verfügbar", popular: "Beliebt", remove: "Position löschen", confirmRemove: "{s} und alle Transaktionen löschen?" },
  es: { placeholder: "Busca posiciones o un ticker (META, VWCE.DE, BTC)…", market: "Mercado en vivo", searching: "Buscando…", none: "Sin resultados de mercado.", add: "Añadir", owned: "En cartera", empty: "Tu cartera está vacía", emptyHint: "Busca arriba una acción, ETF o cripto para ver su precio en vivo y añadirla.", addFirst: "Añadir primera posición", unavailable: "Cotización no disponible", popular: "Populares", remove: "Eliminar posición", confirmRemove: "¿Eliminar {s} y todas sus transacciones?" },
  it: { placeholder: "Cerca posizioni o un ticker (META, VWCE.DE, BTC)…", market: "Mercato live", searching: "Ricerca…", none: "Nessun risultato di mercato.", add: "Aggiungi", owned: "In portafoglio", empty: "Il tuo portafoglio è vuoto", emptyHint: "Cerca sopra un'azione, un ETF o una cripto per vederne il prezzo live e aggiungerla.", addFirst: "Aggiungi prima posizione", unavailable: "Quotazione non disponibile", popular: "Popolari", remove: "Elimina posizione", confirmRemove: "Eliminare {s} e tutte le sue transazioni?" },
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

  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 350); return () => clearTimeout(t); }, [q]);

  const market = useQuery({
    queryKey: ["holdings-market-search", debounced],
    queryFn: () => searchFn({ data: marketSearchSchema.parse({ query: debounced }) }),
    enabled: debounced.length >= 1,
    staleTime: 60_000,
  });

  const rows = p.holdings.filter(
    (h) => (type === "all" || h.asset.type === type) &&
      (h.asset.name + h.asset.symbol).toLowerCase().includes(q.toLowerCase()),
  );
  const num = (n: number) => n.toLocaleString(languageLocale(p.lang), { maximumFractionDigits: 6 });
  const owned = new Set(p.assets.map((a) => a.symbol.toUpperCase()));

  const openAdd = (next: TxPreset | null) => {
    if (!p.user) { navigate({ to: "/auth" }); return; }
    setPreset(next ?? { symbol: "", name: "", type: "stock" });
  };
  const removeAsset = async (id: string, symbol: string) => {
    if (!window.confirm(c.confirmRemove.replace("{s}", symbol))) return;
    const { error } = await supabase.from("transactions").delete().eq("asset_id", id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("assets").delete().eq("id", id);
    await p.reload();
    toast.success(`${symbol} ✓`);
  };


  return (
    <div className="space-y-5">
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h1 className="font-display mr-auto text-2xl font-bold">{p.t("holdings")}</h1>
          <div className="relative w-full sm:w-96">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} maxLength={60} autoComplete="off" onChange={(e) => setQ(e.target.value)} placeholder={c.placeholder} aria-label={c.placeholder}
              className="w-full rounded-full border border-input bg-background py-2.5 pl-9 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring" />
            {q && (
              <button onClick={() => setQ("")} aria-label={p.t("close")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={15} /></button>
            )}
          </div>
        </div>

        {!q && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">{c.popular}:</span>
            {POPULAR.map((s) => (
              <button key={s} onClick={() => setQ(s)} className="rounded-full border border-border px-3 py-1 font-semibold hover:bg-secondary">{s}</button>
            ))}
          </div>
        )}

        {q.trim() && (
          <div className="mb-5 rounded-xl border border-border bg-secondary/40 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <TrendingUp size={13} /> {c.market}
            </p>
            {(q.trim() !== debounced || market.isFetching) && <p role="status" className="py-3 text-sm text-muted-foreground">{c.searching}</p>}
            {q.trim() === debounced && market.data && !market.data.assets.length && <p className="py-3 text-sm text-muted-foreground">{c.none}</p>}
            <div className="divide-y divide-border">
              {(q.trim() === debounced && market.data ? market.data.assets : searchCatalog(q)).slice(0, 8).map((a) => (
                <MarketRow key={a.symbol} asset={a} owned={owned.has(a.symbol.toUpperCase())} copy={c} onAdd={openAdd} />
              ))}
            </div>
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-1">
          {TYPES.map((t) => (
            <button key={t} onClick={() => setType(t)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${type === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {t === "all" ? p.t("all") : p.t(t)}
            </button>
          ))}
        </div>

        {!p.holdings.length ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="font-display text-lg font-semibold">{c.empty}</p>
            <p className="max-w-sm text-sm text-muted-foreground">{c.emptyHint}</p>
            <button onClick={() => openAdd(null)} className="mt-1 flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              <Plus size={16} /> {c.addFirst}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 font-medium">{p.t("name")}</th>
                  <th className="text-right font-medium">{p.t("qty")}</th>
                  <th className="text-right font-medium">{p.t("price")}</th>
                  <th className="text-right font-medium">{p.t("avgCost")}</th>
                  <th className="text-right font-medium">{p.t("value")}</th>
                  <th className="text-right font-medium">{p.t("pnl")}</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((h) => (
                  <tr key={h.asset.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                    <td className="py-3">
                      <p className="font-semibold">{h.asset.name}</p>
                      <p className="text-xs text-muted-foreground">{h.asset.symbol} · {p.t(h.asset.type)}</p>
                    </td>
                    <td className="text-right">{num(h.quantity)}</td>
                    <td className="text-right">
                      {p.money(h.asset.price)}
                      <p className="text-xs"><Delta value={h.asset.change24h}>{pct(h.asset.change24h)}</Delta></p>
                    </td>
                    <td className="text-right">{p.money(h.avgCost)}</td>
                    <td className="text-right font-semibold">{p.money(h.value)}</td>
                    <td className="text-right">
                      <Delta value={h.pnl}>
                        <span className="font-semibold">{p.money(h.pnl, { sign: true })}</span>
                        <p className="text-xs">{pct(h.pnlPct)}</p>
                      </Delta>
                    </td>
                    <td className="pl-2 text-right">
                      <button onClick={() => void removeAsset(h.asset.id, h.asset.symbol)} aria-label={`${c.remove} ${h.asset.symbol}`} title={c.remove}
                        className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <p className="py-10 text-center text-muted-foreground">{p.t("noResults")}</p>}
          </div>
        )}
      </Card>
      <AddTransactionDialog open={!!preset} preset={preset} onClose={() => setPreset(null)} />
    </div>
  );
}

function MarketRow({ asset, owned, copy, onAdd }: {
  asset: MarketAsset; owned: boolean; copy: (typeof COPY)["en"]; onAdd: (p: TxPreset) => void;
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
    try { return v.toLocaleString(locale, { style: "currency", currency: cur, maximumFractionDigits: v < 10 ? 4 : 2 }); }
    catch { return `${v.toFixed(2)} ${cur}`; }
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
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{asset.symbol} <span className="font-normal text-muted-foreground">· {p.t(asset.type)}</span></p>
        <p className="truncate text-xs text-muted-foreground">{asset.name}</p>
      </div>
      <div className="text-right text-sm">
        {quote.isLoading ? <span className="inline-block h-4 w-16 animate-pulse rounded bg-muted" />
          : qt ? (
            <>
              <p className="font-semibold">{fmt(qt.price, qt.currency)}</p>
              {qt.change != null && <p className="text-xs"><Delta value={qt.change}>{pct(qt.change)}</Delta></p>}
            </>
          ) : <p className="text-xs text-muted-foreground">{copy.unavailable}</p>}
      </div>
      <button onClick={() => onAdd(qt && (qt.currency === "USD" || qt.currency === "EUR")
        ? { symbol: asset.symbol, name: asset.name, type: asset.type, price: qt.price, currency: qt.currency }
        : { symbol: asset.symbol, name: asset.name, type: asset.type, price: presetPrice, currency: p.currency })}
        className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${owned ? "border border-border hover:bg-secondary" : "bg-primary text-primary-foreground hover:opacity-90"}`}>
        <Plus size={13} /> {owned ? copy.owned : copy.add}
      </button>
    </div>
  );
}
