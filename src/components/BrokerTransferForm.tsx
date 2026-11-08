import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/AppShell";
import { usePortfolio } from "@/lib/store";
import { languageLocale, type Lang } from "@/lib/i18n";
import { brokerHoldings } from "@/lib/portfolio";
import { localDateString } from "@/lib/local-date";

const COPY: Record<
  Lang,
  {
    title: string;
    description: string;
    from: string;
    to: string;
    asset: string;
    quantity: string;
    date: string;
    available: (quantity: string, costBasis: string) => string;
    noPositions: string;
    transfer: string;
    recent: string;
    noTransfers: string;
    success: string;
    invalid: string;
  }
> = {
  en: {
    title: "Transfer holdings between brokers",
    description:
      "Moves the oldest available FIFO lots without changing their acquisition dates or cost basis. A transfer is not a sale and creates no taxable result.",
    from: "From broker",
    to: "To broker",
    asset: "Asset",
    quantity: "Quantity",
    date: "Transfer date",
    available: (quantity, costBasis) => `${quantity} available · current cost basis ${costBasis}`,
    noPositions: "No holdings are available in this account on the selected date.",
    transfer: "Record transfer",
    recent: "Recorded transfers",
    noTransfers: "No broker transfers recorded yet.",
    success: "Transfer recorded; original FIFO cost basis is unchanged.",
    invalid: "Choose different brokers, a held asset, a valid quantity and a past or current date.",
  },
  bg: {
    title: "Прехвърли позиции между брокери",
    description:
      "Премества най-старите налични FIFO партиди, без да променя датите на придобиване или себестойността им. Трансферът не е продажба и не създава облагаем резултат.",
    from: "От брокер",
    to: "Към брокер",
    asset: "Актив",
    quantity: "Количество",
    date: "Дата на трансфера",
    available: (quantity, costBasis) =>
      `Налични: ${quantity} бр. · текуща себестойност: ${costBasis}`,
    noPositions: "Няма налични позиции в тази сметка към избраната дата.",
    transfer: "Запиши трансфера",
    recent: "Записани трансфери",
    noTransfers: "Все още няма записани трансфери между брокери.",
    success: "Трансферът е записан; първоначалната FIFO себестойност е запазена.",
    invalid: "Избери различни брокери, наличен актив, валидно количество и минала или текуща дата.",
  },
  de: {
    title: "Positionen zwischen Brokern übertragen",
    description:
      "Überträgt die ältesten verfügbaren FIFO-Lots, ohne Kaufdaten oder Einstandskosten zu ändern. Die Übertragung ist kein Verkauf und erzeugt kein steuerpflichtiges Ergebnis.",
    from: "Von Broker",
    to: "Zu Broker",
    asset: "Wert",
    quantity: "Menge",
    date: "Übertragungsdatum",
    available: (quantity, costBasis) =>
      `${quantity} verfügbar · aktuelle Einstandskosten ${costBasis}`,
    noPositions: "An diesem Datum sind in diesem Konto keine Positionen verfügbar.",
    transfer: "Übertragung speichern",
    recent: "Erfasste Übertragungen",
    noTransfers: "Noch keine Broker-Übertragungen erfasst.",
    success: "Übertragung erfasst; die ursprünglichen FIFO-Einstandskosten bleiben erhalten.",
    invalid:
      "Wähle verschiedene Broker, einen gehaltenen Wert, eine gültige Menge und ein gültiges Datum.",
  },
  es: {
    title: "Transferir posiciones entre brókeres",
    description:
      "Mueve los lotes FIFO disponibles más antiguos sin cambiar sus fechas de adquisición ni su coste. La transferencia no es una venta ni genera un resultado imponible.",
    from: "Bróker de origen",
    to: "Bróker de destino",
    asset: "Activo",
    quantity: "Cantidad",
    date: "Fecha de transferencia",
    available: (quantity, costBasis) => `${quantity} disponible · coste actual ${costBasis}`,
    noPositions: "No hay posiciones disponibles en esta cuenta en la fecha seleccionada.",
    transfer: "Registrar transferencia",
    recent: "Transferencias registradas",
    noTransfers: "Todavía no hay transferencias registradas.",
    success: "Transferencia registrada; el coste FIFO original no ha cambiado.",
    invalid:
      "Elige brókeres distintos, un activo disponible, una cantidad válida y una fecha válida.",
  },
  it: {
    title: "Trasferisci posizioni tra broker",
    description:
      "Sposta i lotti FIFO disponibili più vecchi senza modificare le date di acquisto o il costo. Il trasferimento non è una vendita e non genera un risultato imponibile.",
    from: "Broker di origine",
    to: "Broker di destinazione",
    asset: "Asset",
    quantity: "Quantità",
    date: "Data del trasferimento",
    available: (quantity, costBasis) => `${quantity} disponibile · costo attuale ${costBasis}`,
    noPositions: "Nessuna posizione disponibile in questo conto alla data selezionata.",
    transfer: "Registra trasferimento",
    recent: "Trasferimenti registrati",
    noTransfers: "Nessun trasferimento tra broker registrato.",
    success: "Trasferimento registrato; il costo FIFO originale è invariato.",
    invalid: "Scegli broker diversi, un asset posseduto, una quantità valida e una data valida.",
  },
};

const fieldClass = "mt-1 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm";

export function BrokerTransferForm() {
  const p = usePortfolio();
  const c = COPY[p.lang];
  const today = localDateString();
  const [fromBrokerId, setFromBrokerId] = useState("");
  const [toBrokerId, setToBrokerId] = useState("");
  const [assetId, setAssetId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const sourceHoldings = useMemo(
    () =>
      brokerHoldings(p.assets, p.transactions, p.brokerTransfers, p.corporateActions, date)
        .filter((holding) => holding.brokerId === fromBrokerId)
        .sort((a, b) => a.asset.symbol.localeCompare(b.asset.symbol)),
    [date, fromBrokerId, p.assets, p.brokerTransfers, p.corporateActions, p.transactions],
  );
  const selectedHolding = sourceHoldings.find((holding) => holding.asset.id === assetId);
  const dateLabel = new Intl.DateTimeFormat(languageLocale(p.lang), {
    dateStyle: "medium",
    timeZone: "UTC",
  });
  const number = new Intl.NumberFormat(languageLocale(p.lang), { maximumFractionDigits: 8 });

  useEffect(() => {
    if (!p.brokers.some((broker) => broker.id === fromBrokerId))
      setFromBrokerId(p.brokers[0]?.id ?? "");
  }, [fromBrokerId, p.brokers]);

  useEffect(() => {
    if (!p.brokers.some((broker) => broker.id === toBrokerId) || toBrokerId === fromBrokerId)
      setToBrokerId(p.brokers.find((broker) => broker.id !== fromBrokerId)?.id ?? "");
  }, [fromBrokerId, p.brokers, toBrokerId]);

  useEffect(() => {
    if (!sourceHoldings.some((holding) => holding.asset.id === assetId)) {
      setAssetId(sourceHoldings[0]?.asset.id ?? "");
      setQuantity("");
    }
  }, [assetId, sourceHoldings]);

  if (p.brokers.length < 2) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedQuantity = Number(quantity);
    if (
      !selectedHolding ||
      !fromBrokerId ||
      !toBrokerId ||
      fromBrokerId === toBrokerId ||
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity <= 0 ||
      parsedQuantity > selectedHolding.quantity + 1e-9 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      date > today
    ) {
      toast.error(c.invalid);
      return;
    }
    setBusy(true);
    try {
      await p.createBrokerTransfer({
        assetId,
        fromBrokerId,
        toBrokerId,
        quantity: parsedQuantity,
        date,
      });
      setQuantity("");
      toast.success(c.success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : c.invalid);
    } finally {
      setBusy(false);
    }
  };

  const brokerName = (id: string) => p.brokers.find((broker) => broker.id === id)?.name ?? "—";

  return (
    <Card>
      <div className="mb-4">
        <h2 className="font-display text-lg font-semibold">{c.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
      </div>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">
          {c.from}
          <select
            value={fromBrokerId}
            onChange={(event) => setFromBrokerId(event.target.value)}
            className={fieldClass}
          >
            <option value="">—</option>
            {p.brokers
              .filter((broker) => broker.id !== toBrokerId)
              .map((broker) => (
                <option key={broker.id} value={broker.id}>
                  {broker.name}
                </option>
              ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          {c.to}
          <select
            value={toBrokerId}
            onChange={(event) => setToBrokerId(event.target.value)}
            className={fieldClass}
          >
            <option value="">—</option>
            {p.brokers
              .filter((broker) => broker.id !== fromBrokerId)
              .map((broker) => (
                <option key={broker.id} value={broker.id}>
                  {broker.name}
                </option>
              ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          {c.asset}
          <select
            value={assetId}
            onChange={(event) => {
              setAssetId(event.target.value);
              setQuantity("");
            }}
            className={fieldClass}
          >
            {sourceHoldings.length ? (
              sourceHoldings.map((holding) => (
                <option key={holding.asset.id} value={holding.asset.id}>
                  {holding.asset.symbol} — {holding.asset.name}
                </option>
              ))
            ) : (
              <option value="">{c.noPositions}</option>
            )}
          </select>
        </label>
        <label className="text-sm font-medium">
          {c.date}
          <input
            type="date"
            value={date}
            max={today}
            onChange={(event) => setDate(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-sm font-medium">
          {c.quantity}
          <input
            type="number"
            min="0"
            step="any"
            max={selectedHolding?.quantity}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className={fieldClass}
          />
          {selectedHolding && (
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              {c.available(
                number.format(selectedHolding.quantity),
                p.money(selectedHolding.costBasis),
              )}
            </span>
          )}
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={busy || !selectedHolding}
            className="min-h-11 w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "…" : c.transfer}
          </button>
        </div>
      </form>
      <div className="mt-5 border-t border-border pt-4">
        <h3 className="text-sm font-semibold">{c.recent}</h3>
        {p.brokerTransfers.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{c.noTransfers}</p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {[...p.brokerTransfers]
              .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
              .map((transfer) => {
                const asset = p.assets.find((item) => item.id === transfer.assetId);
                return (
                  <li
                    key={transfer.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                  >
                    <span className="font-semibold">{asset?.symbol ?? "—"}</span>
                    <span className="text-muted-foreground">
                      {number.format(transfer.quantity)} · {brokerName(transfer.fromBrokerId)} →{" "}
                      {brokerName(transfer.toBrokerId)}
                    </span>
                    <time dateTime={transfer.date} className="text-xs text-muted-foreground">
                      {dateLabel.format(new Date(`${transfer.date}T00:00:00Z`))}
                    </time>
                  </li>
                );
              })}
          </ul>
        )}
      </div>
    </Card>
  );
}
