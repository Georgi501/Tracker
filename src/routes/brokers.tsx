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
  reconciliationTotals,
  rejectedCsvRows,
  splitDuplicates,
  type BrokerFormat,
  type CsvRejection,
  type ImportedTx,
} from "@/lib/csv-import";
import type { Lang } from "@/lib/i18n";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { notifyImportWithUndo } from "@/lib/import-undo";

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
  rejectedRows: CsvRejection[];
  feeColumns: string[];
};

type ImportResult = {
  imported: number;
  duplicates: number;
  ignoredRows: number;
  totals: ReturnType<typeof reconciliationTotals>;
};

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
        <h1 className="font-display text-2xl font-bold">{p.t("brokers")}</h1>
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
    trackAnalyticsEvent("csv_import_started");
    try {
      const text = await file.text();
      const detected = detectBrokerFormat(text);
      if (!detected) throw new Error("CSV format not recognized");
      const rows = parseBrokerCsv(detected, text);
      const rejectedRows = rejectedCsvRows(detected, text);
      const sym = new Map(p.assets.map((a) => [a.id, a.symbol]));
      const existing = p.transactions.map((t) => ({
        symbol: sym.get(t.assetId) ?? "",
        kind: t.kind,
        date: t.date,
        quantity: t.quantity,
        price: t.price,
        fee: t.fee ?? 0,
      }));
      const normalized = await p.normalizeImportRows(rows);
      setPreview({
        brokerId,
        format: detected,
        ignoredRows: rejectedRows.length,
        rejectedRows,
        feeColumns: detectFeeColumns(detected, text),
        ...splitDuplicates(rows, existing, normalized),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };
  const confirmImport = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const currentExisting = p.transactions.map((transaction) => ({
        symbol: p.assets.find((asset) => asset.id === transaction.assetId)?.symbol ?? "",
        kind: transaction.kind,
        date: transaction.date,
        quantity: transaction.quantity,
        price: transaction.price,
        fee: transaction.fee ?? 0,
      }));
      const normalized = await p.normalizeImportRows(preview.fresh);
      const split = splitDuplicates(preview.fresh, currentExisting, normalized);
      if (!split.fresh.length) {
        setPreview(null);
        toast.info(
          p.lang === "bg" ? "Всички сделки вече са налични." : "All trades already exist.",
        );
        return;
      }
      const imported = await p.importTransactions(preview.brokerId, split.fresh);
      trackAnalyticsEvent("csv_import_completed");
      setImportResult({
        imported: imported.count,
        duplicates: preview.duplicates.length + split.duplicates.length,
        ignoredRows: preview.ignoredRows,
        totals: reconciliationTotals(split.fresh),
      });
      notifyImportWithUndo(
        `${imported.count} ${p.t("imported")}`,
        imported.transactionIds,
        imported.createdAssetIds,
        p.lang,
        p.undoImport,
      );
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
    field: "symbol" | "date" | "quantity" | "price" | "fee" | "currency",
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
  const totals = reconciliationTotals(preview.fresh);
  const valid = preview.fresh.every(
    (row) =>
      /^[A-Z0-9.^:=_-]{1,20}$/i.test(row.symbol) &&
      /^\d{4}-\d{2}-\d{2}$/.test(row.date) &&
      Number.isFinite(row.quantity) &&
      row.quantity > 0 &&
      Number.isFinite(row.price) &&
      row.price > 0 &&
      Number.isFinite(row.fee ?? 0) &&
      (row.fee ?? 0) >= 0 &&
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
      <ReconciliationTable lang={lang} totals={totals} />
      <p className="rounded-xl border border-border bg-background/70 p-3 text-xs leading-relaxed text-muted-foreground">
        {c.fees(preview.feeColumns)}
      </p>
      {preview.duplicates.length > 0 && (
        <p className="rounded-xl bg-accent text-accent-foreground p-2 text-sm">
          {c.duplicates(preview.duplicates.length)}
        </p>
      )}
      {preview.ignoredRows > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-sm font-semibold">{c.rejectedTitle(preview.rejectedRows.length)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{c.rejectedHelp}</p>
          <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-border">
            <table className="w-full min-w-[540px] text-left text-xs">
              <thead className="sticky top-0 bg-secondary text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5">{c.row}</th>
                  <th className="px-2 py-1.5">{c.rawRow}</th>
                  <th className="px-2 py-1.5">{c.reason}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.rejectedRows.slice(0, 50).map((rejected) => (
                  <tr key={rejected.row}>
                    <td className="px-2 py-1.5 tabular-nums">{rejected.row}</td>
                    <td className="max-w-72 truncate px-2 py-1.5 font-mono" title={rejected.raw}>
                      {rejected.raw}
                    </td>
                    <td className="px-2 py-1.5">{c.rejectionReasons[rejected.reason]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.rejectedRows.length > 50 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {c.moreRejected(preview.rejectedRows.length - 50)}
            </p>
          )}
        </div>
      )}
      <div className="max-h-80 overflow-auto rounded-xl border border-border">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="sticky top-0 bg-secondary text-muted-foreground">
            <tr>
              {[c.date, c.kind, c.symbol, c.quantity, c.price, c.fee, c.currency].map((label) => (
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
                  <div className="flex items-center gap-1">
                    <input
                      aria-label={c.fee}
                      type="number"
                      min="0"
                      step="any"
                      value={row.fee ?? 0}
                      className={`${input} w-24`}
                      onChange={(event) => onEdit(index, "fee", Number(event.target.value))}
                    />
                    <span className="text-muted-foreground">
                      {row.feeCurrency ?? row.currency ?? "USD"}
                    </span>
                  </div>
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
            <ReconciliationTable lang={lang} totals={result.totals} />
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

const RECONCILIATION_COPY: Record<
  Lang,
  {
    title: string;
    currency: string;
    buys: string;
    sells: string;
    dividends: string;
    fees: string;
    note: string;
  }
> = {
  en: {
    title: "Import reconciliation",
    currency: "Currency",
    buys: "Purchases",
    sells: "Sales",
    dividends: "Dividends",
    fees: "Fees",
    note: "Gross transaction totals and imported fees are shown separately in their original currencies; ignored rows are excluded.",
  },
  bg: {
    title: "Сверка на импорта",
    currency: "Валута",
    buys: "Покупки",
    sells: "Продажби",
    dividends: "Дивиденти",
    fees: "Такси",
    note: "Брутните суми по сделки и импортираните такси се показват отделно в оригиналните им валути; пропуснатите редове са изключени.",
  },
  de: {
    title: "Importabgleich",
    currency: "Währung",
    buys: "Käufe",
    sells: "Verkäufe",
    dividends: "Dividenden",
    fees: "Gebühren",
    note: "Bruttosummen und importierte Gebühren werden getrennt in ihren Originalwährungen angezeigt; ignorierte Zeilen sind ausgeschlossen.",
  },
  es: {
    title: "Conciliación de importación",
    currency: "Moneda",
    buys: "Compras",
    sells: "Ventas",
    dividends: "Dividendos",
    fees: "Comisiones",
    note: "Los totales brutos y las comisiones importadas se muestran por separado en sus monedas originales; se excluyen las filas omitidas.",
  },
  it: {
    title: "Riconciliazione importazione",
    currency: "Valuta",
    buys: "Acquisti",
    sells: "Vendite",
    dividends: "Dividendi",
    fees: "Commissioni",
    note: "I totali lordi e le commissioni importate sono mostrati separatamente nelle valute originali; le righe ignorate sono escluse.",
  },
};

function ReconciliationTable({
  lang,
  totals,
}: {
  lang: Lang;
  totals: ReturnType<typeof reconciliationTotals>;
}) {
  const copy = RECONCILIATION_COPY[lang];
  if (!totals.length) return null;
  const amount = (value: number, currency: string) =>
    `${new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(value)} ${currency}`;
  return (
    <div className="mt-3">
      <h3 className="text-sm font-semibold">{copy.title}</h3>
      <div className="mt-2 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[560px] text-right text-xs">
          <thead className="bg-secondary text-muted-foreground">
            <tr>
              {[copy.currency, copy.buys, copy.sells, copy.dividends, copy.fees].map(
                (label, index) => (
                  <th
                    key={label}
                    className={`px-3 py-2 font-semibold ${index === 0 ? "text-left" : ""}`}
                  >
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {totals.map((row) => (
              <tr key={row.currency} className="border-t border-border">
                <th className="px-3 py-2 text-left font-semibold">{row.currency}</th>
                <td className="px-3 py-2 tabular-nums">
                  {amount(row.buys, row.currency)}{" "}
                  <span className="text-muted-foreground">({row.buyCount})</span>
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {amount(row.sells, row.currency)}{" "}
                  <span className="text-muted-foreground">({row.sellCount})</span>
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {amount(row.dividends, row.currency)}{" "}
                  <span className="text-muted-foreground">({row.dividendCount})</span>
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {amount(row.fees, row.currency)}{" "}
                  <span className="text-muted-foreground">({row.feeCount})</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{copy.note}</p>
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
    rejectedTitle: (count: number) => string;
    rejectedHelp: string;
    row: string;
    rawRow: string;
    reason: string;
    rejectionReasons: Record<CsvRejection["reason"], string>;
    moreRejected: (count: number) => string;
    date: string;
    kind: string;
    symbol: string;
    quantity: string;
    price: string;
    fee: string;
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
      "Detected fees are imported separately in the listed currency. Check the preview: if fee currency is not provided, the transaction currency is used.",
    duplicates: (n) => `${n} duplicate rows will be skipped.`,
    rejectedTitle: (n) => `${n} transaction rows will not be imported`,
    rejectedHelp:
      "Review these rows. To correct them, cancel this preview, fix the source CSV and upload it again.",
    row: "CSV row",
    rawRow: "Original row",
    reason: "Reason",
    rejectionReasons: {
      unsupported_action: "Unsupported transaction type or action",
      missing_ticker: "Ticker or asset symbol is missing",
      invalid_transaction: "Missing or invalid date, quantity, price or currency",
    },
    moreRejected: (n) => `And ${n} more rows.`,
    date: "Date",
    kind: "Type",
    symbol: "Ticker",
    quantity: "Quantity",
    price: "Unit price",
    fee: "Fee",
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
      "Откритите такси се импортират отделно във валутата от файла. Провери прегледа; ако липсва валута на таксата, се използва валутата на сделката.",
    duplicates: (n) => `${n} дублирани реда ще бъдат пропуснати.`,
    rejectedTitle: (n) => `${n} реда със сделки няма да бъдат импортирани`,
    rejectedHelp:
      "Прегледай редовете. За корекция откажи този преглед, редактирай оригиналния CSV и го качи отново.",
    row: "CSV ред",
    rawRow: "Оригинален ред",
    reason: "Причина",
    rejectionReasons: {
      unsupported_action: "Неподдържан вид или действие",
      missing_ticker: "Липсва тикер или символ на актива",
      invalid_transaction: "Липсваща или невалидна дата, количество, цена или валута",
    },
    moreRejected: (n) => `И още ${n} реда.`,
    date: "Дата",
    kind: "Вид",
    symbol: "Тикер",
    quantity: "Количество",
    price: "Единична цена",
    fee: "Такса",
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
      "Erkannte Gebühren werden separat in der angegebenen Währung importiert. Prüfe die Vorschau; fehlt eine Gebührenwährung, wird die Transaktionswährung verwendet.",
    duplicates: (n) => `${n} doppelte Zeilen werden übersprungen.`,
    rejectedTitle: (n) => `${n} Transaktionszeilen werden nicht importiert`,
    rejectedHelp:
      "Prüfe diese Zeilen. Zum Korrigieren Vorschau abbrechen, CSV bearbeiten und erneut hochladen.",
    row: "CSV-Zeile",
    rawRow: "Originalzeile",
    reason: "Grund",
    rejectionReasons: {
      unsupported_action: "Nicht unterstützter Typ oder Vorgang",
      missing_ticker: "Ticker oder Asset-Symbol fehlt",
      invalid_transaction: "Datum, Menge, Preis oder Währung fehlt oder ist ungültig",
    },
    moreRejected: (n) => `Und ${n} weitere Zeilen.`,
    date: "Datum",
    kind: "Typ",
    symbol: "Ticker",
    quantity: "Menge",
    price: "Stückpreis",
    fee: "Gebühr",
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
      "Las comisiones detectadas se importan por separado en la moneda indicada. Revisa la vista previa; si falta la moneda, se usa la de la operación.",
    duplicates: (n) => `Se omitirán ${n} filas duplicadas.`,
    rejectedTitle: (n) => `${n} filas de operaciones no se importarán`,
    rejectedHelp:
      "Revisa estas filas. Para corregirlas, cancela la vista previa, edita el CSV original y vuelve a subirlo.",
    row: "Fila CSV",
    rawRow: "Fila original",
    reason: "Motivo",
    rejectionReasons: {
      unsupported_action: "Tipo o acción no compatible",
      missing_ticker: "Falta el ticker o símbolo del activo",
      invalid_transaction: "Fecha, cantidad, precio o moneda ausente o no válido",
    },
    moreRejected: (n) => `Y ${n} filas más.`,
    date: "Fecha",
    kind: "Tipo",
    symbol: "Símbolo",
    quantity: "Cantidad",
    price: "Precio unitario",
    fee: "Comisión",
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
      "Le commissioni rilevate vengono importate separatamente nella valuta indicata. Controlla l'anteprima; se manca la valuta, viene usata quella dell'operazione.",
    duplicates: (n) => `${n} righe duplicate verranno ignorate.`,
    rejectedTitle: (n) => `${n} righe di operazioni non verranno importate`,
    rejectedHelp:
      "Controlla queste righe. Per correggerle, annulla l'anteprima, modifica il CSV originale e caricalo di nuovo.",
    row: "Riga CSV",
    rawRow: "Riga originale",
    reason: "Motivo",
    rejectionReasons: {
      unsupported_action: "Tipo o azione non supportati",
      missing_ticker: "Ticker o simbolo dell'asset mancante",
      invalid_transaction: "Data, quantità, prezzo o valuta mancante o non valido",
    },
    moreRejected: (n) => `E altre ${n} righe.`,
    date: "Data",
    kind: "Tipo",
    symbol: "Ticker",
    quantity: "Quantità",
    price: "Prezzo unitario",
    fee: "Commissione",
    currency: "Valuta",
    cancel: "Annulla",
    confirm: (n) => `Importa ${n}`,
  },
};
