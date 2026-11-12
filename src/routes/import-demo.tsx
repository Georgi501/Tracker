import { Card } from "@/components/AppShell";
import { trackAnalyticsEvent } from "@/lib/analytics";
import {
  detectBrokerFormat,
  parseBrokerCsv,
  rejectedCsvRows,
  splitDuplicates,
  type BrokerFormat,
} from "@/lib/csv-import";
import type { Lang } from "@/lib/i18n";
import { SAMPLE_IBKR_CSV, SAMPLE_IMPORT_CSV, SAMPLE_TRADING212_CSV } from "@/lib/sample-import";
import { usePortfolio } from "@/lib/store";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CircleAlert, CircleCheck, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

const SAMPLE_CSVS: Record<BrokerFormat, string> = {
  generic: SAMPLE_IMPORT_CSV,
  trading212: SAMPLE_TRADING212_CSV,
  ibkr: SAMPLE_IBKR_CSV,
  revolut: SAMPLE_IMPORT_CSV,
};

export const Route = createFileRoute("/import-demo")({
  validateSearch: (search) =>
    z.object({ broker: z.string().optional().catch(undefined) }).parse(search),
  head: () => ({
    meta: [
      { title: "Try a sample CSV import — CapiSpot" },
      {
        name: "description",
        content:
          "Preview how CapiSpot recognizes CSV transactions, detects duplicates and flags rows that need attention. The sample stays in your browser.",
      },
    ],
  }),
  component: ImportDemo,
});

const COPY: Record<
  Lang,
  {
    title: string;
    description: string;
    private: string;
    format: string;
    sampleFormats: Record<"generic" | "trading212" | "ibkr", string>;
    selectFormat: string;
    download: string;
    summary: [string, string, string];
    columns: [string, string, string, string, string, string];
    newRow: string;
    duplicate: string;
    rejected: string;
    noRows: string;
    upload: string;
    portfolio: string;
    back: string;
  }
> = {
  en: {
    title: "Try a sample CSV import",
    description:
      "See how transaction rows are recognized, duplicates are flagged and unsupported rows are set aside before an import.",
    private:
      "This example is processed in your browser. No file is uploaded and no portfolio data is saved.",
    format: "Detected format",
    sampleFormats: {
      generic: "Generic CSV",
      trading212: "Trading 212",
      ibkr: "Interactive Brokers",
    },
    selectFormat: "Sample format",
    download: "Download sample CSV",
    summary: ["Ready to import", "Duplicates", "Rows to review"],
    columns: ["Date", "Type", "Asset", "Quantity", "Price", "Preview result"],
    newRow: "Ready to import",
    duplicate: "Duplicate in sample",
    rejected: "Needs review",
    noRows: "No transactions could be parsed from the sample.",
    upload: "Import your own CSV",
    portfolio: "See an example portfolio",
    back: "Back to Brokers",
  },
  bg: {
    title: "Пробвай примерен CSV импорт",
    description:
      "Виж как се разпознават сделките, откриват се дубликати и се отделят неподдържаните редове преди импорта.",
    private:
      "Примерът се обработва в браузъра ти. Файл не се качва и данни не се записват в портфолио.",
    format: "Разпознат формат",
    sampleFormats: {
      generic: "Общ CSV шаблон",
      trading212: "Trading 212",
      ibkr: "Interactive Brokers",
    },
    selectFormat: "Примерен формат",
    download: "Изтегли примерния CSV",
    summary: ["Готови за импорт", "Дубликати", "Редове за проверка"],
    columns: ["Дата", "Вид", "Актив", "Количество", "Цена", "Резултат от прегледа"],
    newRow: "Готова за импорт",
    duplicate: "Дубликат в примера",
    rejected: "За проверка",
    noRows: "От примерните данни не бяха разпознати сделки.",
    upload: "Импортирай свой CSV файл",
    portfolio: "Виж примерно портфолио",
    back: "Назад към брокерите",
  },
  de: {
    title: "CSV-Import mit Beispieldaten testen",
    description:
      "Sieh, wie Transaktionen erkannt, Duplikate markiert und nicht unterstützte Zeilen vor dem Import aussortiert werden.",
    private:
      "Die Beispieldaten werden im Browser verarbeitet. Es wird keine Datei hochgeladen oder gespeichert.",
    format: "Erkanntes Format",
    sampleFormats: {
      generic: "Allgemeine CSV-Datei",
      trading212: "Trading 212",
      ibkr: "Interactive Brokers",
    },
    selectFormat: "Beispielformat",
    download: "Beispiel-CSV herunterladen",
    summary: ["Importbereit", "Duplikate", "Zu prüfende Zeilen"],
    columns: ["Datum", "Typ", "Wert", "Menge", "Preis", "Vorschau"],
    newRow: "Importbereit",
    duplicate: "Duplikat im Beispiel",
    rejected: "Zu prüfen",
    noRows: "Aus dem Beispiel konnten keine Transaktionen gelesen werden.",
    upload: "Eigene CSV-Datei importieren",
    portfolio: "Beispielportfolio ansehen",
    back: "Zurück zu Broker",
  },
  es: {
    title: "Prueba una importación CSV de ejemplo",
    description:
      "Comprueba cómo se reconocen las operaciones, se marcan los duplicados y se separan las filas no compatibles antes de importar.",
    private:
      "El ejemplo se procesa en tu navegador. No se sube ningún archivo ni se guarda ningún dato.",
    format: "Formato detectado",
    sampleFormats: {
      generic: "CSV genérico",
      trading212: "Trading 212",
      ibkr: "Interactive Brokers",
    },
    selectFormat: "Formato de ejemplo",
    download: "Descargar CSV de ejemplo",
    summary: ["Listas para importar", "Duplicados", "Filas por revisar"],
    columns: ["Fecha", "Tipo", "Activo", "Cantidad", "Precio", "Resultado"],
    newRow: "Lista para importar",
    duplicate: "Duplicado en el ejemplo",
    rejected: "Revisar",
    noRows: "No se pudieron leer operaciones del ejemplo.",
    upload: "Importar tu propio CSV",
    portfolio: "Ver una cartera de ejemplo",
    back: "Volver a Brokers",
  },
  it: {
    title: "Prova un import CSV di esempio",
    description:
      "Scopri come vengono riconosciute le operazioni, segnalati i duplicati e isolate le righe non supportate prima dell'importazione.",
    private:
      "L'esempio viene elaborato nel browser. Nessun file viene caricato e nessun dato viene salvato.",
    format: "Formato rilevato",
    sampleFormats: {
      generic: "CSV generico",
      trading212: "Trading 212",
      ibkr: "Interactive Brokers",
    },
    selectFormat: "Formato di esempio",
    download: "Scarica CSV di esempio",
    summary: ["Pronte per l'importazione", "Duplicati", "Righe da controllare"],
    columns: ["Data", "Tipo", "Asset", "Quantità", "Prezzo", "Anteprima"],
    newRow: "Pronta per l'importazione",
    duplicate: "Duplicato nell'esempio",
    rejected: "Da controllare",
    noRows: "Non è stato possibile leggere operazioni dall'esempio.",
    upload: "Importa un tuo CSV",
    portfolio: "Vedi un portafoglio di esempio",
    back: "Torna a Broker",
  },
};

function ImportDemo() {
  const p = usePortfolio();
  const c = COPY[p.lang];
  const { broker } = Route.useSearch();
  const formatFromBroker = (value: string | undefined): BrokerFormat =>
    value === "trading212" || value === "ibkr" ? value : "generic";
  const [selectedFormat, setSelectedFormat] = useState<BrokerFormat>(() =>
    formatFromBroker(broker),
  );
  const viewTracked = useRef(false);
  useEffect(() => {
    setSelectedFormat(formatFromBroker(broker));
  }, [broker]);
  useEffect(() => {
    if (viewTracked.current) return;
    viewTracked.current = true;
    trackAnalyticsEvent("csv_demo_view", undefined, "/import-demo");
  }, []);
  const csv = SAMPLE_CSVS[selectedFormat];
  const format = detectBrokerFormat(csv);
  const rows = format ? parseBrokerCsv(format, csv) : [];
  const { fresh, duplicates } = splitDuplicates(rows, []);
  const rejected = format ? rejectedCsvRows(format, csv) : [];
  const resultRows = [
    ...fresh.map((row) => ({ row, status: c.newRow, duplicate: false })),
    ...duplicates.map((row) => ({ row, status: c.duplicate, duplicate: true })),
  ];
  const number = (value: number) =>
    new Intl.NumberFormat(p.lang === "bg" ? "bg-BG" : p.lang, {
      maximumFractionDigits: 4,
    }).format(value);
  const kindLabel = (kind: string) => {
    const labels: Record<Lang, Record<string, string>> = {
      en: { buy: "Buy", sell: "Sell", dividend: "Dividend" },
      bg: { buy: "Покупка", sell: "Продажба", dividend: "Дивидент" },
      de: { buy: "Kauf", sell: "Verkauf", dividend: "Dividende" },
      es: { buy: "Compra", sell: "Venta", dividend: "Dividendo" },
      it: { buy: "Acquisto", sell: "Vendita", dividend: "Dividendo" },
    };
    return labels[p.lang][kind] ?? kind;
  };
  const rejectionReason = p.lang === "bg" ? "Неподдържано действие" : "Unsupported action";
  const formatName = c.sampleFormats[selectedFormat === "revolut" ? "generic" : selectedFormat];
  const downloadSample = () => {
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `capispot-${selectedFormat}-sample.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className="page-enter mx-auto max-w-4xl space-y-5">
      <Link
        to="/brokers"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden />
        {c.back}
      </Link>
      <div>
        <h1 className="font-display text-3xl font-bold">{c.title}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{c.description}</p>
      </div>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <label htmlFor="sample-csv-format" className="text-xs text-muted-foreground">
              {c.selectFormat}
            </label>
            <select
              id="sample-csv-format"
              value={selectedFormat}
              onChange={(event) => setSelectedFormat(event.target.value as BrokerFormat)}
              className="mt-1 block min-h-11 rounded-lg border border-input bg-background px-3 text-sm font-semibold"
            >
              {(["generic", "trading212", "ibkr"] as const).map((value) => (
                <option key={value} value={value}>
                  {c.sampleFormats[value]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-semibold">
              {c.format}: {formatName}
            </p>
            <p className="text-sm text-muted-foreground">{c.private}</p>
            <button
              type="button"
              onClick={downloadSample}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-accent"
            >
              {c.download}
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[fresh.length, duplicates.length, rejected.length].map((count, index) => (
            <div key={c.summary[index]} className="rounded-xl bg-secondary/60 p-3">
              <p className="text-xs text-muted-foreground">{c.summary[index]}</p>
              <p className="numeric-display mt-1 text-2xl font-bold">{count}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                {c.columns.map((column) => (
                  <th
                    key={column}
                    className={`pb-2 pr-3 font-medium ${
                      column === c.columns[0] || column === c.columns[1]
                        ? "hidden sm:table-cell"
                        : ""
                    } ${column === c.columns[2] ? "sticky left-0 z-10 bg-card" : ""}`}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resultRows.map(({ row, status, duplicate }, index) => (
                <tr key={`${row.date}-${row.symbol}-${index}`} className="border-t border-border">
                  <td className="hidden py-2 pr-3 sm:table-cell">{row.date}</td>
                  <td className="hidden py-2 pr-3 sm:table-cell">{kindLabel(row.kind)}</td>
                  <td className="sticky left-0 z-10 bg-card py-2 pr-3 font-semibold">
                    {row.symbol}
                  </td>
                  <td className="numeric-display py-2 pr-3">{number(row.quantity)}</td>
                  <td className="numeric-display py-2 pr-3">
                    {number(row.price)} {row.currency}
                  </td>
                  <td className="py-2">
                    <span
                      className={`inline-flex items-center gap-1 ${duplicate ? "text-amber-700 dark:text-amber-300" : "text-success"}`}
                    >
                      {duplicate ? (
                        <CircleAlert size={14} aria-hidden />
                      ) : (
                        <CircleCheck size={14} aria-hidden />
                      )}
                      {status}
                    </span>
                  </td>
                </tr>
              ))}
              {rejected.map((row) => (
                <tr key={`rejected-${row.row}`} className="border-t border-border">
                  <td className="hidden py-2 pr-3 sm:table-cell">—</td>
                  <td className="hidden py-2 pr-3 sm:table-cell">{rejectionReason}</td>
                  <td className="sticky left-0 z-10 bg-card py-2 pr-3 font-semibold">—</td>
                  <td className="py-2 pr-3">—</td>
                  <td className="py-2 pr-3">—</td>
                  <td className="py-2 text-amber-700 dark:text-amber-300">{c.rejected}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!resultRows.length && <p className="py-4 text-sm text-muted-foreground">{c.noRows}</p>}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {p.user ? (
            <Link
              to="/brokers"
              onClick={() =>
                trackAnalyticsEvent("csv_demo_import_click", undefined, "/import-demo")
              }
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Upload size={16} aria-hidden />
              {c.upload}
            </Link>
          ) : (
            <Link
              to="/auth"
              search={{ mode: "signup", next: "/brokers" }}
              onClick={() =>
                trackAnalyticsEvent("csv_demo_import_click", undefined, "/import-demo")
              }
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Upload size={16} aria-hidden />
              {p.t("signUp")} · {c.upload}
            </Link>
          )}
          <Link
            to="/demo"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-accent"
          >
            {c.portfolio}
          </Link>
        </div>
      </Card>
    </div>
  );
}
