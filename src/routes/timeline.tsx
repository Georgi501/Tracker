import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/AppShell";
import { CompanyLogo } from "@/components/CompanyLogo";
import { usePortfolio } from "@/lib/store";
import { languageLocale, type Lang } from "@/lib/i18n";
import { filterTimelineTransactions, timelineByMonth } from "@/lib/journey";
import { useEffect, useState } from "react";
import { Pencil, Search, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditTransactionDialog } from "@/components/EditTransactionDialog";
import type { Transaction, TxKind } from "@/lib/portfolio";
import { z } from "zod";

export const Route = createFileRoute("/timeline")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { title: "Portfolio timeline — Capispot" },
      {
        name: "description",
        content: "Every buy, sale and dividend in your portfolio, month by month.",
      },
      { property: "og:title", content: "Portfolio timeline — Capispot" },
      { property: "og:description", content: "See the story of your portfolio month by month." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (search) =>
    z
      .object({
        q: z.string().max(60).optional().catch(undefined),
        kind: z.enum(["all", "buy", "sell", "dividend"]).optional().catch(undefined),
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .catch(undefined),
      })
      .parse(search),
  component: Timeline,
});

function Timeline() {
  const p = usePortfolio();
  const c = COPY[p.lang];
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/timeline" });
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [query, setQuery] = useState(search.q ?? "");
  const [kindFilter, setKindFilter] = useState<TxKind | "all">(search.kind ?? "all");
  const [brokerId, setBrokerId] = useState("");
  const [from, setFrom] = useState(search.date ?? "");
  const [to, setTo] = useState(search.date ?? "");
  useEffect(() => {
    setQuery(search.q ?? "");
    setKindFilter(search.kind ?? "all");
    setFrom(search.date ?? "");
    setTo(search.date ?? "");
  }, [search.date, search.kind, search.q]);
  const filteredTransactions = filterTimelineTransactions(p.transactions, p.assets, {
    query,
    kind: kindFilter,
    brokerId,
    from,
    to,
  });
  const groups = timelineByMonth(filteredTransactions);
  const activeFilters = !!query || kindFilter !== "all" || !!brokerId || !!from || !!to;
  const fmt = new Intl.DateTimeFormat(languageLocale(p.lang), { month: "long", year: "numeric" });
  return (
    <div className="page-enter space-y-5">
      <h1 className="font-display text-2xl font-bold">{c.title}</h1>
      <Card className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="relative min-w-0">
          <span className="sr-only">{c.search}</span>
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            maxLength={60}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={c.search}
            className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
          />
        </label>
        <label>
          <span className="sr-only">{c.typeFilter}</span>
          <select
            value={kindFilter}
            onChange={(event) => {
              const value = event.currentTarget.value;
              if (value === "all" || value === "buy" || value === "sell" || value === "dividend")
                setKindFilter(value);
            }}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">{c.allTypes}</option>
            <option value="buy">{c.kind.buy}</option>
            <option value="sell">{c.kind.sell}</option>
            <option value="dividend">{c.kind.dividend}</option>
          </select>
        </label>
        <label>
          <span className="sr-only">{c.brokerFilter}</span>
          <select
            value={brokerId}
            onChange={(event) => setBrokerId(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">{c.allBrokers}</option>
            <option value="manual">{c.manual}</option>
            {p.brokers.map((broker) => (
              <option key={broker.id} value={broker.id}>
                {broker.name}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0">
          <span className="sr-only">{c.from}</span>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => setFrom(event.target.value)}
            aria-label={c.from}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>
        <label className="min-w-0">
          <span className="sr-only">{c.to}</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => setTo(event.target.value)}
            aria-label={c.to}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>
        {activeFilters && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setKindFilter("all");
              setBrokerId("");
              setFrom("");
              setTo("");
              void navigate({ search: {}, replace: true });
            }}
            className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-primary hover:underline sm:col-span-2 lg:col-span-5"
          >
            <X size={14} aria-hidden />
            {c.clearFilters}
          </button>
        )}
      </Card>
      {groups.length === 0 && (
        <Card>
          <p className="text-sm text-muted-foreground">{activeFilters ? c.noMatches : c.empty}</p>
          {!activeFilters && (
            <Link
              to="/brokers"
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Upload size={16} aria-hidden />
              {c.importTransactions}
            </Link>
          )}
        </Card>
      )}
      {groups.map((g) => (
        <Card key={g.month}>
          <h2 className="mb-3 font-display font-semibold capitalize">
            {fmt.format(new Date(`${g.month}-01T12:00:00`))}
          </h2>
          <ol className="relative space-y-3 border-l-2 border-primary/30 pl-4">
            {g.items.map((t) => {
              const a = p.assets.find((x) => x.id === t.assetId);
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-3">
                  <span
                    className={`absolute -left-[7px] h-3 w-3 rounded-full ${t.kind === "sell" ? "bg-destructive" : t.kind === "dividend" ? "bg-chart-2" : "bg-primary"}`}
                  />
                  {a && <CompanyLogo symbol={a.symbol} type={a.type} />}
                  <div className="min-w-0 flex-1 text-sm">
                    {a ? (
                      <Link
                        to="/asset/$symbol"
                        params={{ symbol: a.symbol }}
                        className="font-semibold hover:text-primary"
                      >
                        {a.symbol}
                      </Link>
                    ) : (
                      "—"
                    )}
                    <p className="text-xs text-muted-foreground">
                      {t.date} · {c.kind[t.kind]}
                      {t.brokerId
                        ? ` · ${p.brokers.find((broker) => broker.id === t.brokerId)?.name ?? c.broker}`
                        : ""}
                    </p>
                  </div>
                  <span className="text-sm font-medium">
                    {t.kind === "dividend"
                      ? p.moneyFor(t.price * t.quantity - (t.fee ?? 0), a)
                      : `${t.quantity} × ${p.moneyFor(t.price, a)}`}
                    {(t.fee ?? 0) > 0 && (
                      <span className="ml-1 block text-xs text-muted-foreground">
                        {p.t("fee")}: {p.money(t.fee ?? 0)}
                      </span>
                    )}
                  </span>
                  {p.user && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={c.edit}
                      title={c.edit}
                      onClick={() => setEditing(t)}
                    >
                      <Pencil aria-hidden />
                    </Button>
                  )}
                </li>
              );
            })}
          </ol>
        </Card>
      ))}
      <EditTransactionDialog transaction={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

const COPY: Record<
  Lang,
  {
    title: string;
    empty: string;
    edit: string;
    search: string;
    typeFilter: string;
    allTypes: string;
    brokerFilter: string;
    allBrokers: string;
    broker: string;
    manual: string;
    from: string;
    to: string;
    clearFilters: string;
    noMatches: string;
    importTransactions: string;
    kind: Record<"buy" | "sell" | "dividend", string>;
  }
> = {
  en: {
    title: "Portfolio timeline",
    empty: "No transactions yet.",
    edit: "Edit transaction",
    search: "Search asset or ticker",
    typeFilter: "Transaction type",
    allTypes: "All transaction types",
    brokerFilter: "Broker",
    allBrokers: "All brokers",
    broker: "Broker",
    manual: "Manual / no broker",
    from: "From date",
    to: "To date",
    clearFilters: "Clear filters",
    noMatches: "No transactions match these filters.",
    importTransactions: "Import transactions",
    kind: { buy: "Buy", sell: "Sell", dividend: "Dividend" },
  },
  bg: {
    title: "Хронология на портфолиото",
    empty: "Още няма сделки.",
    edit: "Редактирай сделката",
    search: "Търси актив или тикер",
    typeFilter: "Вид сделка",
    allTypes: "Всички видове сделки",
    brokerFilter: "Брокер",
    allBrokers: "Всички брокери",
    broker: "Брокер",
    manual: "Ръчно / без брокер",
    from: "От дата",
    to: "До дата",
    clearFilters: "Изчисти филтрите",
    noMatches: "Няма сделки, които отговарят на филтрите.",
    importTransactions: "Импортирай сделки",
    kind: { buy: "Покупка", sell: "Продажба", dividend: "Дивидент" },
  },
  de: {
    title: "Portfolio-Zeitachse",
    empty: "Noch keine Transaktionen.",
    edit: "Transaktion bearbeiten",
    search: "Asset oder Ticker suchen",
    typeFilter: "Transaktionstyp",
    allTypes: "Alle Transaktionstypen",
    brokerFilter: "Broker",
    allBrokers: "Alle Broker",
    broker: "Broker",
    manual: "Manuell / ohne Broker",
    from: "Ab Datum",
    to: "Bis Datum",
    clearFilters: "Filter löschen",
    noMatches: "Keine Transaktionen entsprechen diesen Filtern.",
    importTransactions: "Transaktionen importieren",
    kind: { buy: "Kauf", sell: "Verkauf", dividend: "Dividende" },
  },
  es: {
    title: "Cronología de la cartera",
    empty: "Todavía no hay transacciones.",
    edit: "Editar operación",
    search: "Buscar activo o ticker",
    typeFilter: "Tipo de operación",
    allTypes: "Todos los tipos",
    brokerFilter: "Bróker",
    allBrokers: "Todos los brókeres",
    broker: "Bróker",
    manual: "Manual / sin bróker",
    from: "Desde",
    to: "Hasta",
    clearFilters: "Borrar filtros",
    noMatches: "No hay operaciones que coincidan con estos filtros.",
    importTransactions: "Importar operaciones",
    kind: { buy: "Compra", sell: "Venta", dividend: "Dividendo" },
  },
  it: {
    title: "Cronologia del portafoglio",
    empty: "Ancora nessuna transazione.",
    edit: "Modifica operazione",
    search: "Cerca asset o ticker",
    typeFilter: "Tipo di transazione",
    allTypes: "Tutti i tipi",
    brokerFilter: "Broker",
    allBrokers: "Tutti i broker",
    broker: "Broker",
    manual: "Manuale / senza broker",
    from: "Dal",
    to: "Al",
    clearFilters: "Cancella filtri",
    noMatches: "Nessuna transazione corrisponde a questi filtri.",
    importTransactions: "Importa transazioni",
    kind: { buy: "Acquisto", sell: "Vendita", dividend: "Dividendo" },
  },
};
