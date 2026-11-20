import { AddTransactionDialog, type TxPreset } from "@/components/AddTransactionDialog";
import { AllocationCard } from "@/components/AllocationCard";
import { Card, Delta } from "@/components/AppShell";
import { CompanyLogo } from "@/components/CompanyLogo";
import { HoldingValue } from "@/components/HoldingValue";
import { EmptyIllustration, Sparkline } from "@/components/Motion";
import { QuoteFreshness } from "@/components/QuoteFreshness";
import { EmptyState } from "@/components/SectionState";
import { Skeleton } from "@/components/ui/skeleton";
import { usePositionDeletion } from "@/hooks/use-position-deletion";
import { PositionDeletionNotices } from "@/components/PositionDeletionNotices";
import { languageLocale, type Lang } from "@/lib/i18n";
import {
  computePortfolioBaseMetrics,
  formatBaseCurrencyAmount,
  type BaseCurrencyHoldingMetrics,
} from "@/lib/base-currency-accounting";
import { marketSearchSchema, searchCatalog, type MarketAsset } from "@/lib/market-search";
import { marketQuote, searchMarket } from "@/lib/market.functions";
import { isQuoteStale, type Asset, type AssetType } from "@/lib/portfolio";
import { getSparklines } from "@/lib/sparklines.functions";
import { pct, usePortfolio } from "@/lib/store";
import { uiStateCopy } from "@/lib/ui-state-copy";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  CircleAlert,
  Landmark,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/holdings")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { title: "Holdings — CapiSpot Portfolio Tracker" },
      {
        name: "description",
        content:
          "Every position with quantity, price, average cost, market value and unrealised P/L, plus market quote search.",
      },
      { property: "og:title", content: "Holdings — CapiSpot" },
      {
        property: "og:description",
        content: "Search your positions and market quotes, then add a buy in one click.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Holdings,
});

const TYPES: (AssetType | "all")[] = [
  "all",
  "stock",
  "etf",
  "crypto",
  "bond",
  "cash",
  "realEstate",
];

type SortKey = "name" | "qty" | "price" | "change" | "avgCost" | "value" | "pnl" | "pnlPct";
type HoldingRow = ReturnType<typeof usePortfolio>["holdings"][number];
function sortValue(h: HoldingRow, k: SortKey, metrics?: BaseCurrencyHoldingMetrics): number {
  switch (k) {
    case "qty":
      return h.quantity;
    case "price":
      return h.asset.price;
    case "change":
      return h.asset.change24h;
    case "avgCost":
      return metrics ? metrics.avgCost : h.avgCost;
    case "value":
      return metrics ? metrics.value : h.value;
    case "pnl":
      return metrics ? metrics.pnl : h.pnl;
    case "pnlPct":
      return metrics ? metrics.pnlPct : h.pnlPct;
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
    | "guestHint"
    | "addHolding"
    | "connectBroker"
    | "addFirst"
    | "signUp"
    | "sample"
    | "unavailable"
    | "popular"
    | "remove"
    | "lots"
    | "confirmRemove"
    | "txNotFound"
    | "lotDeleted"
    | "undo"
    | "lotRestored"
    | "invalidValues"
    | "lotUpdated"
    | "prevLotRestored"
    | "buy"
    | "sell"
    | "dividend"
    | "date"
    | "quantity"
    | "priceUsd"
    | "save"
    | "cancel"
    | "editLot"
    | "deleteLot"
    | "transferHistoryError"
    | "hasBrokerTransfers"
    | "assetRemoved"
    | "assetRestored"
    | "holdingsSummary"
    | "dayChange"
    | "partialValuation",
    string
  >
> = {
  en: {
    placeholder: "Search holdings or any ticker (META, VWCE.DE, BTC)…",
    market: "Market quotes",
    searching: "Searching…",
    none: "No market results.",
    add: "Add",
    owned: "In portfolio",
    empty: "Your portfolio is empty",
    emptyHint: "Search any stock, ETF or crypto above to see its market quote and add it.",
    guestHint: "Create an account to save positions, or explore a sample portfolio first.",
    addHolding: "Add holding",
    connectBroker: "Connect broker",
    addFirst: "Add first position",
    signUp: "Create free account",
    sample: "View sample portfolio",
    unavailable: "Quote unavailable",
    popular: "Popular",
    remove: "Delete position",
    lots: "Lots",
    confirmRemove: "Delete {s} and all its transactions?",
    txNotFound: "Transaction not found",
    lotDeleted: "Lot deleted",
    undo: "Undo",
    lotRestored: "Lot restored",
    invalidValues: "Invalid values",
    lotUpdated: "Lot updated",
    prevLotRestored: "Previous lot restored",
    buy: "Buy",
    sell: "Sell",
    dividend: "Dividend",
    date: "Date",
    quantity: "Quantity",
    priceUsd: "Price (USD)",
    save: "Save",
    cancel: "Cancel",
    editLot: "Edit lot",
    deleteLot: "Delete lot",
    transferHistoryError:
      "Account data could not be loaded, so transfer history cannot be checked.",
    hasBrokerTransfers: "This asset has recorded broker transfers and cannot be removed.",
    assetRemoved: "{s} removed",
    assetRestored: "{s} restored",
    holdingsSummary: "Holdings Summary",
    dayChange: "Day Change",
    partialValuation: "Partial valuation · missing quote:",
  },
  bg: {
    placeholder: "Търси позиции или тикер (META, VWCE.DE, BTC)…",
    market: "Пазарни котировки",
    searching: "Търсене…",
    none: "Няма пазарни резултати.",
    add: "Добави",
    owned: "В портфейла",
    empty: "Портфейлът ти е празен",
    emptyHint:
      "Потърси акция, ETF или крипто отгоре, за да видиш пазарната котировка и да я добавиш.",
    guestHint:
      "Създай профил, за да запазваш позициите си, или първо разгледай примерното портфолио.",
    addHolding: "Добави холдинг",
    connectBroker: "Свържи брокер",
    addFirst: "Добави първа позиция",
    signUp: "Създай безплатен профил",
    sample: "Разгледай примерното портфолио",
    unavailable: "Няма котировка",
    popular: "Популярни",
    remove: "Изтрий позиция",
    lots: "Лотове",
    confirmRemove: "Да изтрия ли {s} и всички негови трансакции?",
    txNotFound: "Сделката не е намерена",
    lotDeleted: "Лотът е изтрит",
    undo: "Отмени",
    lotRestored: "Лотът е възстановен",
    invalidValues: "Невалидни стойности",
    lotUpdated: "Лотът е обновен",
    prevLotRestored: "Предишният лот е възстановен",
    buy: "Покупка",
    sell: "Продажба",
    dividend: "Дивидент",
    date: "Дата",
    quantity: "Количество",
    priceUsd: "Цена (USD)",
    save: "Запази",
    cancel: "Отказ",
    editLot: "Редактирай лота",
    deleteLot: "Изтрий лота",
    transferHistoryError: "Данните не са заредени. Не мога да проверя историята на трансферите.",
    hasBrokerTransfers:
      "Този актив участва в трансфер. Не може да бъде премахнат, докато трансферите са записани.",
    assetRemoved: "{s} е премахнат",
    assetRestored: "{s} е възстановен",
    holdingsSummary: "Обща стойност",
    dayChange: "Дневна промяна",
    partialValuation: "Частична оценка · липсва котировка:",
  },
  de: {
    placeholder: "Positionen oder Ticker suchen (META, VWCE.DE, BTC)…",
    market: "Marktkurse",
    searching: "Suche…",
    none: "Keine Marktergebnisse.",
    add: "Hinzufügen",
    owned: "Im Portfolio",
    empty: "Dein Portfolio ist leer",
    emptyHint:
      "Suche oben eine Aktie, einen ETF oder Krypto, um den Marktkurs zu sehen und hinzuzufügen.",
    guestHint:
      "Erstelle ein Konto, um Positionen zu speichern, oder sieh dir zuerst ein Beispielportfolio an.",
    addHolding: "Position hinzufügen",
    connectBroker: "Broker verbinden",
    addFirst: "Erste Position hinzufügen",
    signUp: "Kostenloses Konto erstellen",
    sample: "Beispielportfolio ansehen",
    unavailable: "Kurs nicht verfügbar",
    popular: "Beliebt",
    remove: "Position löschen",
    lots: "Kauflots",
    confirmRemove: "{s} und alle Transaktionen löschen?",
    txNotFound: "Transaktion nicht gefunden",
    lotDeleted: "Lot gelöscht",
    undo: "Rückgängig",
    lotRestored: "Lot wiederhergestellt",
    invalidValues: "Ungültige Werte",
    lotUpdated: "Lot aktualisiert",
    prevLotRestored: "Vorheriges Lot wiederhergestellt",
    buy: "Kauf",
    sell: "Verkauf",
    dividend: "Dividende",
    date: "Datum",
    quantity: "Menge",
    priceUsd: "Preis (USD)",
    save: "Speichern",
    cancel: "Abbrechen",
    editLot: "Lot bearbeiten",
    deleteLot: "Lot löschen",
    transferHistoryError:
      "Kontodaten konnten nicht geladen werden, daher kann die Transferhistorie nicht geprüft werden.",
    hasBrokerTransfers:
      "Für diese Anlage sind Broker-Transfers erfasst; sie kann nicht entfernt werden.",
    assetRemoved: "{s} entfernt",
    assetRestored: "{s} wiederhergestellt",
    holdingsSummary: "Gesamtwert",
    dayChange: "Tagesänderung",
    partialValuation: "Teilbewertung · fehlender Kurs:",
  },
  es: {
    placeholder: "Busca posiciones o un ticker (META, VWCE.DE, BTC)…",
    market: "Cotizaciones de mercado",
    searching: "Buscando…",
    none: "Sin resultados de mercado.",
    add: "Añadir",
    owned: "En cartera",
    empty: "Tu cartera está vacía",
    emptyHint: "Busca arriba una acción, ETF o cripto para ver su cotización y añadirla.",
    guestHint: "Crea una cuenta para guardar posiciones o explora primero una cartera de ejemplo.",
    addHolding: "Añadir posición",
    connectBroker: "Conectar bróker",
    addFirst: "Añadir primera posición",
    signUp: "Crear cuenta gratis",
    sample: "Ver cartera de ejemplo",
    unavailable: "Cotización no disponible",
    popular: "Populares",
    remove: "Eliminar posición",
    lots: "Lotes",
    confirmRemove: "¿Eliminar {s} y todas sus transacciones?",
    txNotFound: "Transacción no encontrada",
    lotDeleted: "Lote eliminado",
    undo: "Deshacer",
    lotRestored: "Lote restaurado",
    invalidValues: "Valores no válidos",
    lotUpdated: "Lote actualizado",
    prevLotRestored: "Lote anterior restaurado",
    buy: "Compra",
    sell: "Venta",
    dividend: "Dividendo",
    date: "Fecha",
    quantity: "Cantidad",
    priceUsd: "Precio (USD)",
    save: "Guardar",
    cancel: "Cancelar",
    editLot: "Editar lote",
    deleteLot: "Eliminar lote",
    transferHistoryError:
      "No se pudieron cargar los datos de la cuenta para comprobar el historial de transferencias.",
    hasBrokerTransfers:
      "Este activo tiene transferencias de bróker registradas y no se puede eliminar.",
    assetRemoved: "{s} eliminado",
    assetRestored: "{s} restaurado",
    holdingsSummary: "Resumen de posiciones",
    dayChange: "Cambio diario",
    partialValuation: "Valoración parcial · falta cotización:",
  },
  it: {
    placeholder: "Cerca posizioni o un ticker (META, VWCE.DE, BTC)…",
    market: "Quotazioni di mercato",
    searching: "Ricerca…",
    none: "Nessun risultato di mercato.",
    add: "Aggiungi",
    owned: "In portafoglio",
    empty: "Il tuo portafoglio è vuoto",
    emptyHint:
      "Cerca sopra un'azione, un ETF o una cripto per vederne la quotazione e aggiungerla.",
    guestHint:
      "Crea un account per salvare le posizioni oppure esplora prima un portafoglio di esempio.",
    addHolding: "Aggiungi posizione",
    connectBroker: "Collega broker",
    addFirst: "Aggiungi prima posizione",
    signUp: "Crea un account gratuito",
    sample: "Vedi il portafoglio di esempio",
    unavailable: "Quotazione non disponibile",
    popular: "Popolari",
    remove: "Elimina posizione",
    lots: "Lotti",
    confirmRemove: "Eliminare {s} e tutte le sue transazioni?",
    txNotFound: "Transazione non trovata",
    lotDeleted: "Lotto eliminato",
    undo: "Annulla",
    lotRestored: "Lotto ripristinato",
    invalidValues: "Valori non validi",
    lotUpdated: "Lotto aggiornato",
    prevLotRestored: "Lotto precedente ripristinato",
    buy: "Acquisto",
    sell: "Vendita",
    dividend: "Dividendo",
    date: "Data",
    quantity: "Quantità",
    priceUsd: "Prezzo (USD)",
    save: "Salva",
    cancel: "Annulla",
    editLot: "Modifica lotto",
    deleteLot: "Elimina lotto",
    transferHistoryError:
      "Impossibile caricare i dati dell'account per verificare lo storico dei trasferimenti.",
    hasBrokerTransfers:
      "Questo attivo ha trasferimenti broker registrati e non può essere rimosso.",
    assetRemoved: "{s} rimosso",
    assetRestored: "{s} ripristinato",
    holdingsSummary: "Riepilogo posizioni",
    dayChange: "Variazione giornaliera",
    partialValuation: "Valutazione parziale · quotazione mancante:",
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
  const baseMetrics = useMemo(
    () =>
      computePortfolioBaseMetrics(p.holdings, p.transactions, p.currency, {
        liveEurPerUsd: p.eurPerUsd,
        eurUsdPrices: p.eurUsdPrices,
        splits: p.corporateActions,
      }),
    [p.holdings, p.transactions, p.currency, p.eurPerUsd, p.eurUsdPrices, p.corporateActions],
  );
  const sparkItems = useMemo(
    () =>
      p.holdings
        .flatMap((h) =>
          h.asset.type === "stock" || h.asset.type === "etf" || h.asset.type === "crypto"
            ? [
                {
                  symbol: h.asset.symbol,
                  type: h.asset.type,
                  name: h.asset.name,
                  ...(h.asset.isin ? { isin: h.asset.isin } : {}),
                  ...(h.asset.quoteSymbol ? { quoteSymbol: h.asset.quoteSymbol } : {}),
                },
              ]
            : [],
        )
        .slice(0, 40),
    [p.holdings],
  );
  const sparkKey = sparkItems.map((s) => `${s.symbol}:${s.quoteSymbol ?? ""}`).join(",");
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
  const rows = useMemo(
    () =>
      p.holdings
        .filter(
          (h) =>
            (type === "all" || h.asset.type === type) &&
            (h.asset.name + h.asset.symbol).toLowerCase().includes(q.toLowerCase()),
        )
        .sort((a, b) => {
          if (sort.key === "name") return a.asset.name.localeCompare(b.asset.name) * sort.dir;
          const av = sortValue(a, sort.key, baseMetrics.byAssetId.get(a.asset.id)),
            bv = sortValue(b, sort.key, baseMetrics.byAssetId.get(b.asset.id));
          if (!Number.isFinite(av)) return Number.isFinite(bv) ? 1 : 0;
          if (!Number.isFinite(bv)) return -1;
          return (av - bv) * sort.dir;
        }),
    [p.holdings, q, sort, type, baseMetrics],
  );
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
      className={`py-2 font-medium ${left ? "" : "px-2 text-right"} ${className}`}
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
  // Show the quote in the asset's own trading currency; fall back to the base currency.
  const nativePrice = (a: Asset) => {
    const cur = a.quoteCurrency;
    const raw = a.quoteNativePrice;
    if (!cur || raw === undefined || !Number.isFinite(raw)) return p.money(a.price);
    const pence = cur === "GBX" || cur === "GBp";
    try {
      return new Intl.NumberFormat(languageLocale(p.lang), {
        style: "currency",
        currency: pence ? "GBP" : cur,
      }).format(pence ? raw / 100 : raw);
    } catch {
      return p.money(a.price);
    }
  };
  const owned = useMemo(() => new Set(p.assets.map((a) => a.symbol.toUpperCase())), [p.assets]);

  const openAdd = (next: TxPreset | null) => {
    if (!p.user) {
      navigate({ to: "/auth" });
      return;
    }
    setPreset(next ?? { symbol: "", name: "", type: "stock" });
  };
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleLots = (id: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const lotsLabel = c.lots;
  const removeLot = async (id: string) => {
    const transaction = p.transactions.find((item) => item.id === id);
    if (!transaction) {
      toast.error(c.txNotFound);
      return;
    }
    try {
      await p.deleteTransactions([id]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
      return;
    }
    toast(c.lotDeleted, {
      duration: 8000,
      action: {
        label: c.undo,
        onClick: () => {
          void (async () => {
            try {
              await p.restoreTransaction(transaction);
              toast.success(c.lotRestored);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Error");
            }
          })();
        },
      },
    });
  };
  const [editing, setEditing] = useState<{
    id: string;
    quantity: string;
    price: string;
    date: string;
    editPrice: boolean;
  } | null>(null);
  const saveLot = async () => {
    if (!editing) return;
    const quantity = Number(editing.quantity);
    const price = Number(editing.price);
    if (
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !editing.date ||
      (editing.editPrice && (!Number.isFinite(price) || price < 0))
    ) {
      toast.error(c.invalidValues);
      return;
    }
    const transaction = p.transactions.find((item) => item.id === editing.id);
    if (!transaction) {
      toast.error(c.txNotFound);
      return;
    }
    try {
      await p.updateTransaction({
        ...transaction,
        quantity,
        date: editing.date,
        ...(editing.editPrice ? { price } : {}),
      });
      setEditing(null);
      toast.success(c.lotUpdated, {
        duration: 10_000,
        action: {
          label: c.undo,
          onClick: () => {
            void p
              .updateTransaction(transaction)
              .then(() => toast.success(c.prevLotRestored))
              .catch((error: unknown) =>
                toast.error(error instanceof Error ? error.message : "Error"),
              );
          },
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    }
  };
  const lotsPanel = (assetId: string) => {
    const lotAsset = p.assets.find((a) => a.id === assetId);
    // Stored prices are USD, so they are only edited directly when the asset is quoted in USD.
    const priceEditable = !lotAsset?.quoteCurrency || lotAsset.quoteCurrency === "USD";
    const lots = p.transactions
      .filter((t) => t.assetId === assetId)
      .sort((a, b) => b.date.localeCompare(a.date));
    const kindLabel = { buy: c.buy, sell: c.sell } as const;
    const field = "rounded-lg border border-input bg-background px-2 py-1 text-sm";
    return (
      <div className="rounded-xl border border-border bg-background/60 p-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {lotsLabel}
        </p>
        <ul className="divide-y divide-border">
          {lots.map((t) =>
            editing?.id === t.id ? (
              <li key={t.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <input
                  type="date"
                  value={editing.date}
                  onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                  aria-label={c.date}
                  className={field}
                />
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editing.quantity}
                  onChange={(e) => setEditing({ ...editing, quantity: e.target.value })}
                  aria-label={c.quantity}
                  className={`${field} w-24`}
                />
                {editing.editPrice && (
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editing.price}
                    onChange={(e) => setEditing({ ...editing, price: e.target.value })}
                    aria-label={c.priceUsd}
                    className={`${field} w-28`}
                  />
                )}
                <button
                  onClick={() => void saveLot()}
                  className="min-h-11 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {c.save}
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="min-h-11 rounded-full border border-border px-4 py-1.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {c.cancel}
                </button>
              </li>
            ) : (
              <li key={t.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <span className="w-24 text-muted-foreground">
                  {new Date(t.date).toLocaleDateString(languageLocale(p.lang))}
                </span>
                <span className="w-24 font-medium">
                  {t.kind === "dividend" ? c.dividend : kindLabel[t.kind]}
                </span>
                <span className="flex-1">
                  {t.kind === "dividend"
                    ? p.moneyFor(t.price, lotAsset)
                    : `${num(t.quantity)} × ${p.moneyFor(t.price, lotAsset)}`}
                </span>
                {t.kind !== "dividend" && (
                  <button
                    onClick={() =>
                      setEditing({
                        id: t.id,
                        quantity: String(t.quantity),
                        price: String(t.price),
                        date: t.date.slice(0, 10),
                        editPrice: priceEditable,
                      })
                    }
                    aria-label={c.editLot}
                    title={c.editLot}
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Pencil size={16} />
                  </button>
                )}
                <button
                  onClick={() => void removeLot(t.id)}
                  aria-label={c.deleteLot}
                  title={c.deleteLot}
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ),
          )}
        </ul>
      </div>
    );
  };
  const lotsToggle = (assetId: string, symbol: string, showLabel = false) => (
    <button
      onClick={() => toggleLots(assetId)}
      aria-expanded={expanded.has(assetId)}
      aria-label={`${lotsLabel} ${symbol}`}
      title={lotsLabel}
      className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${showLabel ? "border border-border px-3 text-sm font-medium" : "w-11"}`}
    >
      {showLabel && <span>{lotsLabel}</span>}
      <ChevronDown
        size={16}
        className={`transition-transform ${expanded.has(assetId) ? "rotate-180" : ""}`}
      />
    </button>
  );
  const deletion = usePositionDeletion();
  const { removeAsset } = deletion;

  return (
    <div className="space-y-5">
      <PositionDeletionNotices
        operations={deletion.operations}
        loading={deletion.loading}
        listError={deletion.listError}
        refresh={deletion.refresh}
        lang={p.lang}
        undo={deletion.undo}
        retry={deletion.retry}
      />
      {p.holdings.length > 0 &&
        (() => {
          const total = baseMetrics.totalValue;
          const day = baseMetrics.totalDayChange;
          const prev = total - day;
          const totalCost = baseMetrics.totalCost;
          const totalPnl = baseMetrics.totalPnl;
          return (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.28fr)]">
              <Card className="flex min-w-0 flex-col justify-between gap-4 p-4 sm:p-5">
                <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {c.holdingsSummary}
                    </p>
                    <p className="numeric-display mt-1 text-3xl font-bold">
                      {formatBaseCurrencyAmount(total, p.currency, p.lang)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {c.dayChange}
                    </p>
                    <p className="numeric-display mt-1 text-lg font-semibold">
                      <Delta value={day}>
                        {formatBaseCurrencyAmount(day, p.currency, p.lang, { sign: true })} (
                        {Number.isFinite(day) && prev > 0 ? pct((day / prev) * 100) : "—"})
                      </Delta>
                    </p>
                  </div>
                </div>
                {!baseMetrics.isComplete && baseMetrics.missingQuoteSymbols.length > 0 && (
                  <p role="status" className="text-xs text-amber-700 dark:text-amber-300">
                    {c.partialValuation} {baseMetrics.missingQuoteSymbols.join(", ")}
                  </p>
                )}
                <div className="grid grid-cols-3 gap-3 border-t border-border/70 pt-3.5 text-xs">
                  <div>
                    <p className="text-muted-foreground">{p.t("invested")}</p>
                    <p className="numeric-display mt-0.5 text-sm font-semibold">
                      {formatBaseCurrencyAmount(totalCost, p.currency, p.lang)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{p.t("totalPnl")}</p>
                    <p className="numeric-display mt-0.5 text-sm font-semibold">
                      <Delta value={totalPnl}>
                        {formatBaseCurrencyAmount(totalPnl, p.currency, p.lang, { sign: true })}
                      </Delta>
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{p.t("holdings")}</p>
                    <p className="numeric-display mt-0.5 text-sm font-semibold">
                      {p.holdings.length}
                    </p>
                  </div>
                </div>
              </Card>
              <AllocationCard />
            </div>
          );
        })()}
      <Card className="holdings-positions cq-card">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h1 className="font-display mr-auto text-2xl font-bold">{p.t("holdings")}</h1>
          <Link
            to="/brokers"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Landmark size={15} aria-hidden />
            {c.connectBroker}
          </Link>
          <button
            type="button"
            onClick={() => openAdd(null)}
            className="press flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Plus size={16} />
            {c.addHolding}
          </button>
          <div className="relative w-full sm:min-w-[26rem] sm:flex-1 lg:max-w-lg">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={q}
              maxLength={60}
              autoComplete="off"
              onChange={(e) => setQ(e.target.value)}
              placeholder={c.placeholder}
              aria-label={c.placeholder}
              className={`h-11 w-full rounded-full border border-input bg-background py-2 pl-9 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/20 ${
                q ? "pr-9" : "pr-3.5"
              }`}
            />
            {q && (
              <button
                onClick={() => setQ("")}
                aria-label={p.t("close")}
                className="absolute right-1.5 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                className="press min-h-9 rounded-full border border-border px-3 py-1.5 font-semibold hover:border-primary hover:text-primary"
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
              type="button"
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className={`min-h-11 rounded-full px-3 py-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${type === t ? "bg-primary text-primary-foreground underline decoration-2 underline-offset-4" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
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
            {p.user ? (
              <button
                onClick={() => openAdd(null)}
                className="press mt-1 flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus size={16} /> {c.addFirst}
              </button>
            ) : (
              <div className="mt-1 grid justify-items-center gap-2">
                <p className="max-w-sm text-xs text-muted-foreground">{c.guestHint}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Link
                    to="/auth"
                    search={{ mode: "signup" }}
                    className="press inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {c.signUp}
                  </Link>
                  <Link
                    to="/demo"
                    className="press inline-flex min-h-11 items-center rounded-full border border-border px-5 py-2 text-sm font-semibold hover:bg-secondary"
                  >
                    {c.sample}
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="holdings-card-sort mb-3 flex items-center gap-2">
              <ArrowUpDown size={14} className="text-muted-foreground" />
              <select
                value={sort.key}
                onChange={(e) => toggleSort(e.target.value as SortKey)}
                aria-label={uiStateCopy[p.lang].sort}
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
                aria-label={uiStateCopy[p.lang].direction}
                className="press inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {sort.dir === 1 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
              </button>
            </div>
            <ul className="holdings-mobile-list space-y-2.5">
              {rows.map((h, i) => {
                const m = baseMetrics.byAssetId.get(h.asset.id);
                return (
                  <li
                    key={h.asset.id}
                    style={{ animationDelay: `${Math.min(i, 5) * 40}ms` }}
                    className="rise-in rounded-2xl border border-border bg-background/60 p-3"
                  >
                    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-3">
                      <CompanyLogo symbol={h.asset.symbol} type={h.asset.type} />
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/asset/$symbol"
                          params={{ symbol: h.asset.symbol }}
                          className="block break-words font-semibold hover:text-primary"
                        >
                          {h.asset.name}
                        </Link>
                        <StaleBadge
                          at={h.asset.quoteAt}
                          price={h.asset.price}
                          missingLabel={c.unavailable}
                          staleLabel={p.t("holdingValueStale")}
                        />
                        <p className="text-xs text-muted-foreground">
                          {num(h.quantity)} · {h.asset.symbol} ·{" "}
                          <Delta value={h.asset.change24h}>{pct(h.asset.change24h)}</Delta>
                        </p>
                        <div className="[&_p]:text-xs [&_svg]:size-3">
                          <QuoteFreshness
                            at={h.asset.quoteAt}
                            lang={p.lang}
                            crypto={h.asset.type === "crypto"}
                            compact
                          />
                        </div>
                      </div>
                      <div className="col-span-full row-start-2 min-w-0 border-t border-border/60 pt-3 text-right">
                        <p className="mb-1 text-xs text-muted-foreground">{p.t("value")}</p>
                        <div className="[&_.numeric-display]:break-words [&_.numeric-display]:text-xl">
                          <HoldingValue
                            asset={h.asset}
                            quantity={h.quantity}
                            valueUsd={h.value}
                            currency={p.currency}
                            liveFx={p.liveFx}
                            displayValue={formatBaseCurrencyAmount(
                              m?.value ?? Number.NaN,
                              p.currency,
                              p.lang,
                            )}
                            lang={p.lang}
                            t={p.t}
                          />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{p.t("pnl")}</p>
                        <p className="numeric-display mt-1 break-words text-sm font-semibold">
                          <Delta value={m?.pnl ?? Number.NaN}>
                            {formatBaseCurrencyAmount(m?.pnl ?? Number.NaN, p.currency, p.lang, {
                              sign: true,
                            })}{" "}
                            · {pct(m?.pnlPct ?? Number.NaN)}
                          </Delta>
                        </p>
                      </div>
                      <div className="col-span-full flex flex-wrap items-center justify-between gap-2">
                        {lotsToggle(h.asset.id, h.asset.symbol, true)}
                        <button
                          onClick={() => void removeAsset(h.asset.id, h.asset.symbol)}
                          disabled={deletion.operations.some(
                            (entry) =>
                              entry.assetId === h.asset.id &&
                              (entry.phase === "deleting" || entry.phase === "restoring"),
                          )}
                          aria-label={`${c.remove} ${h.asset.symbol}`}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-3 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <Trash2 size={16} />
                          <span>{c.remove}</span>
                        </button>
                      </div>
                    </div>
                    {expanded.has(h.asset.id) && (
                      <div className="mt-3">{lotsPanel(h.asset.id)}</div>
                    )}
                  </li>
                );
              })}
              {!rows.length && (
                <EmptyState
                  icon="search"
                  title={p.t("noResults")}
                  description={uiStateCopy[p.lang].searchHelp}
                  action={
                    <button
                      type="button"
                      onClick={() => {
                        setQ("");
                        setType("all");
                      }}
                      className="press min-h-11 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                    >
                      {uiStateCopy[p.lang].reset}
                    </button>
                  }
                />
              )}
            </ul>
            <div className="holdings-table overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr className="border-b border-border">
                    <Th k="name" label={p.t("name")} left />
                    <Th k="qty" label={p.t("qty")} className="px-2" />
                    <Th k="price" label={p.t("price")} className="px-2" />
                    <th className="hidden w-24 px-2 text-right font-medium lg:table-cell">30d</th>
                    <Th k="change" label="24h %" />
                    <Th k="avgCost" label={p.t("avgCost")} />
                    <Th k="value" label={p.t("value")} />
                    <Th k="pnl" label={p.t("pnl")} />
                    <Th k="pnlPct" label={`${p.t("pnl")} %`} />
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((h) => {
                    const m = baseMetrics.byAssetId.get(h.asset.id);
                    return (
                      <Fragment key={h.asset.id}>
                        <tr className="border-b border-border last:border-0 hover:bg-secondary/50">
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
                                  missingLabel={c.unavailable}
                                  staleLabel={p.t("holdingValueStale")}
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
                          <td className="numeric-display px-2 text-right tabular-nums">
                            {num(h.quantity)}
                          </td>
                          <td className="numeric-display px-2 text-right">
                            {nativePrice(h.asset)}
                          </td>
                          <td className="hidden px-2 lg:table-cell">
                            <div className="flex justify-end">
                              {sparks.data?.[h.asset.symbol] ? (
                                <Sparkline data={sparks.data[h.asset.symbol] ?? []} />
                              ) : sparks.isLoading &&
                                h.asset.type !== "cash" &&
                                h.asset.type !== "bond" &&
                                h.asset.type !== "realEstate" ? (
                                <Skeleton className="h-5 w-20" />
                              ) : null}
                            </div>
                          </td>
                          <td className="numeric-display px-2 text-right tabular-nums">
                            <Delta value={h.asset.change24h}>{pct(h.asset.change24h)}</Delta>
                          </td>
                          <td className="numeric-display px-2 text-right">
                            {formatBaseCurrencyAmount(m?.avgCost ?? Number.NaN, p.currency, p.lang)}
                          </td>
                          <td className="px-2 text-right">
                            <HoldingValue
                              asset={h.asset}
                              quantity={h.quantity}
                              valueUsd={h.value}
                              currency={p.currency}
                              liveFx={p.liveFx}
                              displayValue={formatBaseCurrencyAmount(
                                m?.value ?? Number.NaN,
                                p.currency,
                                p.lang,
                              )}
                              lang={p.lang}
                              t={p.t}
                            />
                          </td>
                          <td className="px-2 text-right">
                            <Delta value={m?.pnl ?? Number.NaN}>
                              <span className="numeric-display font-semibold">
                                {formatBaseCurrencyAmount(
                                  m?.pnl ?? Number.NaN,
                                  p.currency,
                                  p.lang,
                                  {
                                    sign: true,
                                  },
                                )}
                              </span>
                            </Delta>
                          </td>
                          <td className="numeric-display px-2 text-right tabular-nums">
                            <Delta value={m?.pnlPct ?? Number.NaN}>
                              {pct(m?.pnlPct ?? Number.NaN)}
                            </Delta>
                          </td>
                          <td className="pl-2 text-right">
                            <div className="flex justify-end">
                              {lotsToggle(h.asset.id, h.asset.symbol)}
                              <button
                                onClick={() => removeAsset(h.asset.id, h.asset.symbol)}
                                disabled={deletion.operations.some(
                                  (entry) =>
                                    entry.assetId === h.asset.id &&
                                    (entry.phase === "deleting" || entry.phase === "restoring"),
                                )}
                                aria-label={`${c.remove} ${h.asset.symbol}`}
                                title={c.remove}
                                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expanded.has(h.asset.id) && (
                          <tr className="border-b border-border">
                            <td colSpan={10} className="pb-3">
                              {lotsPanel(h.asset.id)}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
              {!rows.length && (
                <EmptyState
                  icon="search"
                  title={p.t("noResults")}
                  description={uiStateCopy[p.lang].searchHelp}
                  action={
                    <button
                      type="button"
                      onClick={() => {
                        setQ("");
                        setType("all");
                      }}
                      className="press min-h-11 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                    >
                      {uiStateCopy[p.lang].reset}
                    </button>
                  }
                />
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
            <p className="numeric-display font-semibold tabular-nums">
              {fmt(qt.price, qt.currency)}
            </p>
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
        className={`flex min-h-9 shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${owned ? "border border-border hover:bg-secondary" : "bg-primary text-primary-foreground hover:opacity-90"}`}
      >
        <Plus size={13} /> {owned ? copy.owned : copy.add}
      </button>
    </div>
  );
}

/** Flags quotes older than 4 days (covers weekends/holidays) or missing; never substitutes a price. */
function StaleBadge({
  at,
  price,
  missingLabel,
  staleLabel,
}: {
  at?: string | undefined;
  price: number;
  missingLabel: string;
  staleLabel: string;
}) {
  const timestamp = at ? Date.parse(at) : Number.NaN;
  const missing = !(price > 0) || !Number.isFinite(timestamp);
  const old = !missing && isQuoteStale(at);
  if (!missing && !old) return null;
  return (
    <span
      title={Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : undefined}
      className="mt-1 inline-flex max-w-full items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-xs font-medium text-foreground"
    >
      <CircleAlert size={12} className="shrink-0" aria-hidden="true" />
      <span>{missing ? missingLabel : staleLabel}</span>
    </span>
  );
}
