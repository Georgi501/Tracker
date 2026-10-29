import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { CheckCircle2, Plus, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/AppShell";
import { usePortfolio } from "@/lib/store";
import { useState } from "react";
import {
  BROKER_FORMATS,
  GENERIC_TEMPLATE,
  brokerLimit,
  detectFeeColumns,
  parseBrokerCsv,
  detectBrokerFormat,
  parseCsvRows,
  splitDuplicates,
  type BrokerFormat,
  type ImportedTx,
} from "@/lib/csv-import";
import type { Lang } from "@/lib/i18n";

export const Route = createFileRoute("/brokers")({
  head: () => ({
    meta: [
      { title: "Brokers — Capispot CSV import" },
      {
        name: "description",
        content:
          "Connect brokers via CSV: Trading 212, Interactive Brokers, Revolut or a generic template.",
      },
      { property: "og:title", content: "Brokers — Capispot" },
      { property: "og:description", content: "Import your broker transactions from CSV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Brokers,
});

const input =
  "rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
type StagedImport = {
  brokerId: string;
  format: BrokerFormat;
  fresh: ImportedTx[];
  duplicates: ImportedTx[];
  ignoredRows: number;
  feeColumns: string[];
};

type ImportResult = { imported: number; duplicates: number; ignoredRows: number };

function Brokers() {
  const p = usePortfolio();
  const [preview, setPreview] = useState<StagedImport | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const limit = brokerLimit(p.isPro);
  const full = p.brokers.length >= limit;

  if (!p.user)
    return (
      <Card className="mx-auto max-w-lg text-center">
        <p className="mb-4">{p.t("signInToUse")}</p>
        <Link
          to="/auth"
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          {p.t("signIn")}
        </Link>
      </Card>
    );

  const add = async (format: BrokerFormat) => {
    const label = BROKER_FORMATS.find((f) => f.id === format)?.label ?? format;
    const n = p.brokers.filter((b) => b.format === format).length;
    const { error } = await supabase
      .from("brokers")
      .insert({ name: n ? `${label} ${n + 1}` : label, format });
    if (error) {
      toast.error(error.message.includes("BROKER_LIMIT") ? p.t("limitReached") : error.message);
      return;
    }
    await p.reload();
  };
  const remove = async (id: string) => {
    await supabase.from("brokers").delete().eq("id", id);
    await p.reload();
  };
  const upload = async (brokerId: string, fmt: string, file: File) => {
    setImportResult(null);
    try {
      const text = await file.text();
      const detected = detectBrokerFormat(text);
      if (!detected) throw new Error("CSV format not recognized");
      const rows = parseBrokerCsv(detected, text);
      const sym = new Map(p.assets.map((a) => [a.id, a.symbol]));
      const existing = p.transactions.map((t) => ({
        symbol: sym.get(t.assetId) ?? "",
        kind: t.kind,
        date: t.date,
        quantity: t.quantity,
      }));
      setPreview({
        brokerId,
        format: detected,
        ignoredRows: Math.max(0, parseCsvRows(text).length - rows.length),
        feeColumns: detectFeeColumns(detected, text),
        ...splitDuplicates(rows, existing),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };
  const confirmImport = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const imported = await p.importTransactions(preview.brokerId, preview.fresh);
      setImportResult({
        imported,
        duplicates: preview.duplicates.length,
        ignoredRows: preview.ignoredRows,
      });
      toast.success(`${imported} ${p.t("imported")}`);
      setPreview(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  };
  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(GENERIC_TEMPLATE)}`;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="font-display text-2xl font-bold">{p.t("brokers")}</h1>
        <span className="text-sm text-muted-foreground">
          {p.brokers.length} / {limit} · {p.isPro ? p.t("pro") : p.t("free")}
        </span>
      </div>
      {importResult && (
        <ImportResultCard
          lang={p.lang}
          result={importResult}
          onDismiss={() => setImportResult(null)}
        />
      )}
      {p.brokers.map((b) => (
        <Card key={b.id} className="flex flex-wrap items-center gap-3">
          <div className="flex-1">
            <p className="font-semibold">{b.name}</p>
            <p className="text-xs text-muted-foreground">
              {BROKER_FORMATS.find((f) => f.id === b.format)?.label}
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            <Upload size={15} /> {p.t("importCsv")}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(b.id, b.format, f);
                e.target.value = "";
              }}
            />
          </label>
          <button onClick={() => remove(b.id)} className="text-sm text-destructive">
            ✕
          </button>
        </Card>
      ))}
      {preview && (
        <ImportPreview
          lang={p.lang}
          preview={preview}
          busy={busy}
          onEdit={(index, field, value) =>
            setPreview((current) =>
              current
                ? {
                    ...current,
                    fresh: current.fresh.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, [field]: value } : row,
                    ),
                  }
                : current,
            )
          }
          onCancel={() => setPreview(null)}
          onConfirm={() => void confirmImport()}
        />
      )}
      {full && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm">{p.t("limitReached")}</span>
          {!p.isPro && (
            <Link
              to="/pricing"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              {p.t("upgrade")}
            </Link>
          )}
        </Card>
      )}
      <div>
        <h2 className="mb-3 font-display text-lg font-semibold">{p.t("addBroker")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {BROKER_FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              disabled={full}
              onClick={() => void add(f.id)}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 font-display font-bold text-primary">
                {f.label.slice(0, 2).toUpperCase()}
              </span>
              <span className="flex-1 font-semibold">{f.label}</span>
              <Plus size={18} className="text-primary" />
            </button>
          ))}
        </div>
        <a
          href={templateHref}
          download="folio-template.csv"
          className="mt-3 inline-block text-sm font-semibold text-primary"
        >
          {p.t("template")}
        </a>
      </div>
    </div>
  );
}

function ImportPreview({
  lang,
  preview,
  busy,
  onEdit,
  onCancel,
  onConfirm,
}: {
  lang: Lang;
  busy: boolean;
  preview: StagedImport;
  onEdit: (
    index: number,
    field: "symbol" | "date" | "quantity" | "price" | "currency",
    value: string | number,
  ) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const c = IMPORT_COPY[lang];
  const count = (k: string) => preview.fresh.filter((r) => r.kind === k).length;
  const currencies = [
    ...new Set([...preview.fresh, ...preview.duplicates].map((r) => r.currency ?? "USD")),
  ].join(", ");
  const valid = preview.fresh.every(
    (row) =>
      /^[A-Z0-9.^:=_-]{1,20}$/i.test(row.symbol) &&
      /^\d{4}-\d{2}-\d{2}$/.test(row.date) &&
      Number.isFinite(row.quantity) &&
      row.quantity > 0 &&
      Number.isFinite(row.price) &&
      row.price > 0 &&
      ["USD", "EUR", "BGN", "GBP", "GBX"].includes(row.currency ?? "USD"),
  );
  return (
    <Card className="space-y-3 border-primary">
      <h2 className="font-display text-lg font-semibold">
        {c.title} · {BROKER_FORMATS.find((f) => f.id === preview.format)?.label}
      </h2>
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        {(["buy", "sell", "dividend"] as const).map((k) => (
          <div key={k} className="rounded-xl bg-secondary p-2">
            <b className="block text-lg">{count(k)}</b>
            {c.kinds[k]}
          </div>
        ))}
      </div>
      {currencies && (
        <p className="text-xs text-muted-foreground">
          {c.currencies}: {currencies} · {c.fx}
        </p>
      )}
      <p className="rounded-xl border border-border bg-background/70 p-3 text-xs leading-relaxed text-muted-foreground">
        {c.fees(preview.feeColumns)}
      </p>
      {preview.duplicates.length > 0 && (
        <p className="rounded-xl bg-accent text-accent-foreground p-2 text-sm">
          {c.duplicates(preview.duplicates.length)}
        </p>
      )}
      <p className="text-xs text-muted-foreground">{c.excluded(preview.ignoredRows)}</p>
      <div className="max-h-80 overflow-auto rounded-xl border border-border">
        <table className="w-full min-w-[680px] text-left text-xs">
          <thead className="sticky top-0 bg-secondary text-muted-foreground">
            <tr>
              {[c.date, c.kind, c.symbol, c.quantity, c.price, c.currency].map((label) => (
                <th key={label} className="px-2 py-2 font-semibold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {preview.fresh.map((row, index) => (
              <tr key={`${row.symbol}-${row.date}-${index}`}>
                <td className="px-2 py-1.5">
                  <input
                    aria-label={c.date}
                    type="date"
                    value={row.date}
                    className={input}
                    onChange={(event) => onEdit(index, "date", event.target.value)}
                  />
                </td>
                <td className="px-2 py-1.5">{c.kinds[row.kind]}</td>
                <td className="px-2 py-1.5">
                  <input
                    aria-label={c.symbol}
                    value={row.symbol}
                    className={`${input} w-24`}
                    onChange={(event) => onEdit(index, "symbol", event.target.value.toUpperCase())}
                  />
                </td>
                <td className="px-2 py-1.5">
                  {row.kind === "dividend" ? (
                    "1"
                  ) : (
                    <input
                      aria-label={c.quantity}
                      type="number"
                      min="0.00000001"
                      step="any"
                      value={row.quantity}
                      className={`${input} w-24`}
                      onChange={(event) => onEdit(index, "quantity", Number(event.target.value))}
                    />
                  )}
                </td>
                <td className="px-2 py-1.5">
                  <input
                    aria-label={c.price}
                    type="number"
                    min="0.00000001"
                    step="any"
                    value={row.price}
                    className={`${input} w-28`}
                    onChange={(event) => onEdit(index, "price", Number(event.target.value))}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <select
                    aria-label={c.currency}
                    value={row.currency ?? "USD"}
                    className={input}
                    onChange={(event) => onEdit(index, "currency", event.target.value)}
                  >
                    {["USD", "EUR", "BGN", "GBP", "GBX"].map((currency) => (
                      <option key={currency}>{currency}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-full px-4 py-2 text-sm text-muted-foreground">
          {c.cancel}
        </button>
        <button
          disabled={busy || !preview.fresh.length || !valid}
          onClick={onConfirm}
          className="press rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {c.confirm(preview.fresh.length)}
        </button>
      </div>
    </Card>
  );
}

function ImportResultCard({
  lang,
  result,
  onDismiss,
}: {
  lang: Lang;
  result: ImportResult;
  onDismiss: () => void;
}) {
  const c = IMPORT_RESULT_COPY[lang];
  return (
    <div role="status">
      <Card className="border-primary/40 bg-primary/5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 shrink-0 text-primary" size={20} aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="font-display font-semibold">{c.title}</h2>
            <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
              <div className="rounded-xl bg-background/70 p-3">
                <dt className="text-muted-foreground">{c.imported}</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">{result.imported}</dd>
              </div>
              <div className="rounded-xl bg-background/70 p-3">
                <dt className="text-muted-foreground">{c.duplicates}</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">{result.duplicates}</dd>
              </div>
              <div className="rounded-xl bg-background/70 p-3">
                <dt className="text-muted-foreground">{c.ignored}</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">{result.ignoredRows}</dd>
              </div>
            </dl>
            {result.ignoredRows > 0 && (
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {c.reviewIgnored}
              </p>
            )}
            <Link
              to="/holdings"
              className="mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              {c.viewHoldings}
            </Link>
          </div>
          <button
            type="button"
            aria-label={c.dismiss}
            onClick={onDismiss}
            className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      </Card>
    </div>
  );
}

const IMPORT_RESULT_COPY: Record<
  Lang,
  {
    title: string;
    imported: string;
    duplicates: string;
    ignored: string;
    reviewIgnored: string;
    viewHoldings: string;
    dismiss: string;
  }
> = {
  en: {
    title: "Import complete",
    imported: "Transactions imported",
    duplicates: "Duplicates skipped",
    ignored: "CSV rows not imported",
    reviewIgnored:
      "Some CSV rows were not recognized as transactions. Check the original file if you expected additional trades or dividends.",
    viewHoldings: "View holdings",
    dismiss: "Dismiss import summary",
  },
  bg: {
    title: "Импортът приключи",
    imported: "Импортирани трансакции",
    duplicates: "Пропуснати дубликати",
    ignored: "Неимпортирани CSV редове",
    reviewIgnored:
      "Някои CSV редове не са разпознати като трансакции. Провери оригиналния файл, ако очакваш още сделки или дивиденти.",
    viewHoldings: "Към позициите",
    dismiss: "Затвори обобщението за импорта",
  },
  de: {
    title: "Import abgeschlossen",
    imported: "Importierte Transaktionen",
    duplicates: "Übersprungene Duplikate",
    ignored: "Nicht importierte CSV-Zeilen",
    reviewIgnored:
      "Einige CSV-Zeilen wurden nicht als Transaktionen erkannt. Prüfe die Originaldatei, wenn du weitere Trades oder Dividenden erwartet hast.",
    viewHoldings: "Positionen ansehen",
    dismiss: "Importübersicht schließen",
  },
  es: {
    title: "Importación completada",
    imported: "Operaciones importadas",
    duplicates: "Duplicados omitidos",
    ignored: "Filas CSV no importadas",
    reviewIgnored:
      "Algunas filas CSV no se reconocieron como operaciones. Revisa el archivo original si esperabas más operaciones o dividendos.",
    viewHoldings: "Ver posiciones",
    dismiss: "Cerrar resumen de importación",
  },
  it: {
    title: "Importazione completata",
    imported: "Operazioni importate",
    duplicates: "Duplicati ignorati",
    ignored: "Righe CSV non importate",
    reviewIgnored:
      "Alcune righe CSV non sono state riconosciute come operazioni. Controlla il file originale se ti aspettavi altre operazioni o dividendi.",
    viewHoldings: "Vedi posizioni",
    dismiss: "Chiudi riepilogo importazione",
  },
};

const IMPORT_COPY: Record<
  Lang,
  {
    title: string;
    kinds: Record<ImportedTx["kind"], string>;
    currencies: string;
    fx: string;
    fees: (columns: string[]) => string;
    duplicates: (count: number) => string;
    excluded: (count: number) => string;
    date: string;
    kind: string;
    symbol: string;
    quantity: string;
    price: string;
    currency: string;
    cancel: string;
    confirm: (count: number) => string;
  }
> = {
  en: {
    title: "Review before import",
    kinds: { buy: "Buys", sell: "Sells", dividend: "Dividends" },
    currencies: "Currencies detected",
    fx: "converted using the dated provider rate",
    fees: (columns) =>
      `${columns.length ? "Fee columns detected: " + columns.join(", ") + ". " : "No fee columns detected; this does not confirm the broker charged none. "}` +
      "Fees are not imported separately. If they are not already reflected in the trade price, adjust the unit price before import; separate fee reporting is not supported.",
    duplicates: (n) => `${n} duplicate rows will be skipped.`,
    excluded: (n) =>
      `${n} CSV lines were not recognized as transactions (headers, metadata or unsupported actions); only the listed rows will be imported.`,
    date: "Date",
    kind: "Type",
    symbol: "Ticker",
    quantity: "Quantity",
    price: "Unit price",
    currency: "Currency",
    cancel: "Cancel",
    confirm: (n) => `Import ${n}`,
  },
  bg: {
    title: "Преглед преди импорт",
    kinds: { buy: "Покупки", sell: "Продажби", dividend: "Дивиденти" },
    currencies: "Разпознати валути",
    fx: "конвертират се по курса за датата от доставчика",
    fees: (columns) =>
      `${columns.length ? "Открити колони за такси: " + columns.join(", ") + ". " : "Не са открити колони за такси; това не означава, че брокерът не е начислил такива. "}` +
      "Таксите не се импортират отделно. Ако не са включени в цената на сделката, коригирай единичната цена преди импорт; отделно отчитане на такси не се поддържа.",
    duplicates: (n) => `${n} дублирани реда ще бъдат пропуснати.`,
    excluded: (n) =>
      `${n} CSV реда не са разпознати като сделки (заглавия, метаданни или неподдържани операции); ще се импортират само показаните редове.`,
    date: "Дата",
    kind: "Вид",
    symbol: "Тикер",
    quantity: "Количество",
    price: "Единична цена",
    currency: "Валута",
    cancel: "Отказ",
    confirm: (n) => `Импортирай ${n}`,
  },
  de: {
    title: "Vor dem Import prüfen",
    kinds: { buy: "Käufe", sell: "Verkäufe", dividend: "Dividenden" },
    currencies: "Erkannte Währungen",
    fx: "Umrechnung mit dem datierten Anbieter-Kurs",
    fees: (columns) =>
      `${columns.length ? "Erkannte Gebührenfelder: " + columns.join(", ") + ". " : "Keine Gebührenfelder erkannt; das bedeutet nicht, dass der Broker keine Gebühren berechnet hat. "}` +
      "Gebühren werden nicht separat importiert. Falls sie nicht bereits im Handelspreis enthalten sind, passe den Stückpreis vor dem Import an; eine separate Gebührenausweisung wird nicht unterstützt.",
    duplicates: (n) => `${n} doppelte Zeilen werden übersprungen.`,
    excluded: (n) =>
      `${n} CSV-Zeilen wurden nicht als Transaktionen erkannt (Kopfzeilen, Metadaten oder nicht unterstützte Aktionen); importiert werden nur die angezeigten Zeilen.`,
    date: "Datum",
    kind: "Typ",
    symbol: "Ticker",
    quantity: "Menge",
    price: "Stückpreis",
    currency: "Währung",
    cancel: "Abbrechen",
    confirm: (n) => `${n} importieren`,
  },
  es: {
    title: "Revisar antes de importar",
    kinds: { buy: "Compras", sell: "Ventas", dividend: "Dividendos" },
    currencies: "Monedas detectadas",
    fx: "convertidas con el tipo del proveedor para cada fecha",
    fees: (columns) =>
      `${columns.length ? "Columnas de comisiones detectadas: " + columns.join(", ") + ". " : "No se detectaron columnas de comisiones; esto no confirma que el bróker no las haya cobrado. "}` +
      "Las comisiones no se importan por separado. Si aún no están reflejadas en el precio de la operación, ajusta el precio unitario antes de importar; no se muestran como cargo separado.",
    duplicates: (n) => `Se omitirán ${n} filas duplicadas.`,
    excluded: (n) =>
      `${n} filas CSV no se reconocieron como operaciones (encabezados, metadatos o acciones no compatibles); solo se importarán las filas mostradas.`,
    date: "Fecha",
    kind: "Tipo",
    symbol: "Símbolo",
    quantity: "Cantidad",
    price: "Precio unitario",
    currency: "Moneda",
    cancel: "Cancelar",
    confirm: (n) => `Importar ${n}`,
  },
  it: {
    title: "Controlla prima di importare",
    kinds: { buy: "Acquisti", sell: "Vendite", dividend: "Dividendi" },
    currencies: "Valute rilevate",
    fx: "convertite usando il cambio del fornitore alla data",
    fees: (columns) =>
      `${columns.length ? "Colonne dei costi rilevate: " + columns.join(", ") + ". " : "Nessuna colonna dei costi rilevata; ciò non conferma che il broker non abbia applicato commissioni. "}` +
      "Commissioni e costi non vengono importati separatamente. Se non sono già inclusi nel prezzo dell'operazione, modifica il prezzo unitario prima dell'importazione; non vengono rendicontati a parte.",
    duplicates: (n) => `${n} righe duplicate verranno ignorate.`,
    excluded: (n) =>
      `${n} righe CSV non sono state riconosciute come operazioni (intestazioni, metadati o azioni non supportate); verranno importate solo le righe mostrate.`,
    date: "Data",
    kind: "Tipo",
    symbol: "Ticker",
    quantity: "Quantità",
    price: "Prezzo unitario",
    currency: "Valuta",
    cancel: "Annulla",
    confirm: (n) => `Importa ${n}`,
  },
};
