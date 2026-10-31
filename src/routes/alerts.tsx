import { createFileRoute } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWatchState } from "@/components/AssetExtras";
import { usePortfolio } from "@/lib/store";
import { marketQuote } from "@/lib/market.functions";
import {
  alertKey,
  alertTriggered,
  readAlerts,
  readWatchlist,
  writeAlerts,
  writeWatchlist,
  SYMBOL_RE,
} from "@/lib/watchlist";
import { MARKET_ASSETS } from "@/lib/market-search";
import { languageLocale } from "@/lib/i18n";

export const Route = createFileRoute("/alerts")({
  head: () => ({ meta: [{ title: "Price alerts — Capispot" }] }),
  component: Alerts,
});

const COPY = {
  en: {
    title: "Price alerts",
    description:
      "Alerts use live provider quotes while the app is open. They do not run in the background.",
    symbol: "Ticker",
    target: "Target price",
    above: "Above",
    below: "Below",
    add: "Add alert",
    empty: "No price alerts yet.",
    exists: "This alert already exists.",
    waiting: "Waiting",
    reached: "Target reached",
    unavailable: "Quote unavailable",
    invalid: "Enter a valid ticker and positive target.",
    cap: "You can save up to 50 alerts.",
    currency: "Price is entered in the quote currency shown by the provider.",
  },
  bg: {
    title: "Ценови известия",
    description:
      "Известията използват реални котировки, докато приложението е отворено. Не работят във фонов режим.",
    symbol: "Тикер",
    target: "Целева цена",
    above: "Над",
    below: "Под",
    add: "Добави известие",
    empty: "Все още няма ценови известия.",
    exists: "Това известие вече съществува.",
    waiting: "Изчакване",
    reached: "Целта е достигната",
    unavailable: "Няма котировка",
    invalid: "Въведи валиден тикер и положителна цел.",
    cap: "Можеш да запазиш до 50 известия.",
    currency: "Цената се задава във валутата на котировката от доставчика.",
  },
  de: {
    title: "Preisalarme",
    description:
      "Alarme verwenden Live-Kurse, solange die App geöffnet ist. Sie laufen nicht im Hintergrund.",
    symbol: "Ticker",
    target: "Zielkurs",
    above: "Über",
    below: "Unter",
    add: "Alarm hinzufügen",
    empty: "Noch keine Preisalarme.",
    exists: "Dieser Alarm existiert bereits.",
    waiting: "Wartet",
    reached: "Ziel erreicht",
    unavailable: "Kurs nicht verfügbar",
    invalid: "Gib einen gültigen Ticker und einen positiven Zielkurs ein.",
    cap: "Du kannst bis zu 50 Alarme speichern.",
    currency: "Der Zielkurs wird in der vom Anbieter gemeldeten Kurswährung eingegeben.",
  },
  es: {
    title: "Alertas de precio",
    description:
      "Las alertas usan cotizaciones en directo mientras la aplicación está abierta. No funcionan en segundo plano.",
    symbol: "Símbolo",
    target: "Precio objetivo",
    above: "Por encima",
    below: "Por debajo",
    add: "Añadir alerta",
    empty: "Todavía no hay alertas.",
    exists: "Esta alerta ya existe.",
    waiting: "En espera",
    reached: "Objetivo alcanzado",
    unavailable: "Cotización no disponible",
    invalid: "Introduce un símbolo válido y un objetivo positivo.",
    cap: "Puedes guardar hasta 50 alertas.",
    currency: "El objetivo se introduce en la moneda de cotización del proveedor.",
  },
  it: {
    title: "Avvisi di prezzo",
    description:
      "Gli avvisi usano quotazioni live mentre l'app è aperta. Non funzionano in background.",
    symbol: "Ticker",
    target: "Prezzo obiettivo",
    above: "Sopra",
    below: "Sotto",
    add: "Aggiungi avviso",
    empty: "Nessun avviso di prezzo.",
    exists: "Questo avviso esiste già.",
    waiting: "In attesa",
    reached: "Obiettivo raggiunto",
    unavailable: "Quotazione non disponibile",
    invalid: "Inserisci un ticker valido e un obiettivo positivo.",
    cap: "Puoi salvare fino a 50 avvisi.",
    currency: "L'obiettivo è espresso nella valuta di quotazione indicata dal provider.",
  },
} as const;

const CRYPTO = new Set(
  MARKET_ASSETS.filter((asset) => asset.type === "crypto").map((a) => a.symbol),
);

function Alerts() {
  const p = usePortfolio();
  const copy = COPY[p.lang];
  const { alerts } = useWatchState();
  const quoteFn = useServerFn(marketQuote);
  const [symbol, setSymbol] = useState("");
  const [target, setTarget] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const queries = useQueries({
    queries: [...new Set(alerts.map((alert) => alert.symbol))].map((ticker) => ({
      queryKey: ["watch-quote", ticker],
      queryFn: () =>
        quoteFn({ data: { symbol: ticker, type: CRYPTO.has(ticker) ? "crypto" : "stock" } }),
      refetchInterval: 60_000,
      staleTime: 30_000,
    })),
  });
  const tickers = [...new Set(alerts.map((alert) => alert.symbol))];
  const add = (event: React.FormEvent) => {
    event.preventDefault();
    const ticker = symbol.trim().toUpperCase();
    const price = Number(target.replace(",", "."));
    if (!SYMBOL_RE.test(ticker) || !Number.isFinite(price) || price <= 0) {
      toast.error(copy.invalid);
      return;
    }
    const newAlert = { symbol: ticker, direction, target: price };
    const currentAlerts = readAlerts();
    if (currentAlerts.some((alert) => alertKey(alert) === alertKey(newAlert))) {
      toast.info(copy.exists);
      return;
    }
    const next = [...currentAlerts, newAlert];
    if (next.length > 50) {
      toast.error(copy.cap);
      return;
    }
    writeAlerts(next);
    writeWatchlist([...new Set([...readWatchlist(), ticker])].slice(0, 30));
    setSymbol("");
    setTarget("");
  };
  const remove = (key: string) =>
    writeAlerts(readAlerts().filter((alert) => alertKey(alert) !== key));
  const locale = languageLocale(p.lang);

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <div>
        <h1 className="font-display text-2xl font-bold">{copy.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
      </div>
      <Card>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
          <label className="grid gap-1 text-sm">
            {copy.symbol}
            <Input
              value={symbol}
              onChange={(event) => setSymbol(event.target.value)}
              maxLength={20}
            />
          </label>
          <label className="grid gap-1 text-sm">
            {copy.target}
            <Input
              type="number"
              min="0.000001"
              step="any"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="sr-only">
              {copy.above} / {copy.below}
            </span>
            <select
              className="h-10 self-end rounded-md border border-input bg-background px-3 text-sm"
              value={direction}
              onChange={(event) => setDirection(event.target.value as "above" | "below")}
            >
              <option value="above">{copy.above}</option>
              <option value="below">{copy.below}</option>
            </select>
          </label>
          <Button type="submit" className="self-end">
            <Bell size={16} />
            {copy.add}
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">{copy.currency}</p>
      </Card>
      <Card>
        {!alerts.length ? (
          <p className="text-sm text-muted-foreground">{copy.empty}</p>
        ) : (
          <ul className="divide-y divide-border">
            {alerts.map((alert) => {
              const queryIndex = tickers.indexOf(alert.symbol);
              const quote = queryIndex < 0 ? undefined : queries[queryIndex]?.data?.quote;
              const reached = alertTriggered(alert, quote?.price);
              return (
                <li key={alertKey(alert)} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {alert.symbol} · {alert.direction === "above" ? copy.above : copy.below}{" "}
                      {alert.target.toLocaleString(locale, { maximumFractionDigits: 4 })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {quote
                        ? `${quote.price.toLocaleString(locale, { maximumFractionDigits: 4 })} ${quote.currency} · ${reached ? copy.reached : copy.waiting}`
                        : queries[queryIndex]?.isFetching
                          ? "…"
                          : copy.unavailable}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${alert.symbol} alert`}
                    onClick={() => remove(alertKey(alert))}
                  >
                    <X size={16} />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
