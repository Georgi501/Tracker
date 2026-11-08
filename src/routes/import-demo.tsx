import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CircleAlert, CircleCheck, Upload } from "lucide-react";
import { Card } from "@/components/AppShell";
import { usePortfolio } from "@/lib/store";
import {
  detectBrokerFormat,
  parseBrokerCsv,
  rejectedCsvRows,
  splitDuplicates,
} from "@/lib/csv-import";
import type { Lang } from "@/lib/i18n";
import { SAMPLE_IMPORT_CSV } from "@/lib/sample-import";

export const Route = createFileRoute("/import-demo")({
  head: () => ({
    meta: [
      { title: "Try a sample CSV import — Capispot" },
      {
        name: "description",
        content:
          "Preview how Capispot recognizes CSV transactions, detects duplicates and flags rows that need attention. The sample stays in your browser.",
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
    summary: [string, string, string];
    columns: [string, string, string, string, string, string];
    newRow: string;
    duplicate: string;
    rejected: string;
    noRows: string;
    upload: string;
    back: string;
  }
> = {
  en: {
    title: "Try a sample CSV import",
    description:
      "See how transaction rows are recognized, duplicates are flagged and unsupported rows are set aside before an import.",
    private:
      "This example is processed in your browser. No file is uploaded and no portfolio data is saved.",
    format: "Detected format: Generic CSV",
    summary: ["Ready to import", "Duplicates", "Rows to review"],
    columns: ["Date", "Type", "Asset", "Quantity", "Price", "Preview result"],
    newRow: "Ready to import",
    duplicate: "Duplicate in sample",
    rejected: "Needs review",
    noRows: "No transactions could be parsed from the sample.",
    upload: "Import your own CSV",
    back: "Back to Brokers",
  },
  bg: {
    title: "Пробвай примерен CSV импорт",
    description:
      "Виж как се разпознават сделките, откриват се дубликати и се отделят неподдържаните редове преди импорта.",
    private:
      "Примерът се обработва в браузъра ти. Файл не се качва и данни не се записват в портфолио.",
    format: "Разпознат формат: общ CSV шаблон",
    summary: ["Готови за импорт", "Дубликати", "Редове за проверка"],
    columns: ["Дата", "Вид", "Актив", "Количество", "Цена", "Резултат от прегледа"],
    newRow: "Готова за импорт",
    duplicate: "Дубликат в примера",
    rejected: "За проверка",
    noRows: "От примерните данни не бяха разпознати сделки.",
    upload: "Импортирай свой CSV файл",
    back: "Назад към брокерите",
  },
  de: {
    title: "CSV-Import mit Beispieldaten testen",
    description:
      "Sieh, wie Transaktionen erkannt, Duplikate markiert und nicht unterstützte Zeilen vor dem Import aussortiert werden.",
    private:
      "Die Beispieldaten werden im Browser verarbeitet. Es wird keine Datei hochgeladen oder gespeichert.",
    format: "Erkanntes Format: Allgemeine CSV-Datei",
    summary: ["Importbereit", "Duplikate", "Zu prüfende Zeilen"],
    columns: ["Datum", "Typ", "Wert", "Menge", "Preis", "Vorschau"],
    newRow: "Importbereit",
    duplicate: "Duplikat im Beispiel",
    rejected: "Zu prüfen",
    noRows: "Aus dem Beispiel konnten keine Transaktionen gelesen werden.",
    upload: "Eigene CSV-Datei importieren",
    back: "Zurück zu Broker",
  },
  es: {
    title: "Prueba una importación CSV de ejemplo",
    description:
      "Comprueba cómo se reconocen las operaciones, se marcan los duplicados y se separan las filas no compatibles antes de importar.",
    private:
      "El ejemplo se procesa en tu navegador. No se sube ningún archivo ni se guarda ningún dato.",
    format: "Formato detectado: CSV genérico",
    summary: ["Listas para importar", "Duplicados", "Filas por revisar"],
    columns: ["Fecha", "Tipo", "Activo", "Cantidad", "Precio", "Resultado"],
    newRow: "Lista para importar",
    duplicate: "Duplicado en el ejemplo",
    rejected: "Revisar",
    noRows: "No se pudieron leer operaciones del ejemplo.",
    upload: "Importar tu propio CSV",
    back: "Volver a Brokers",
  },
  it: {
    title: "Prova un import CSV di esempio",
    description:
      "Scopri come vengono riconosciute le operazioni, segnalati i duplicati e isolate le righe non supportate prima dell'importazione.",
    private:
      "L'esempio viene elaborato nel browser. Nessun file viene caricato e nessun dato viene salvato.",
    format: "Formato rilevato: CSV generico",
    summary: ["Pronte per l'importazione", "Duplicati", "Righe da controllare"],
    columns: ["Data", "Tipo", "Asset", "Quantità", "Prezzo", "Anteprima"],
    newRow: "Pronta per l'importazione",
    duplicate: "Duplicato nell'esempio",
    rejected: "Da controllare",
    noRows: "Non è stato possibile leggere operazioni dall'esempio.",
    upload: "Importa un tuo CSV",
    back: "Torna a Broker",
  },
};

function ImportDemo() {
  const p = usePortfolio();
  const c = COPY[p.lang];
  const format = detectBrokerFormat(SAMPLE_IMPORT_CSV);
  const rows = format ? parseBrokerCsv(format, SAMPLE_IMPORT_CSV) : [];
  const { fresh, duplicates } = splitDuplicates(rows, []);
  const rejected = format ? rejectedCsvRows(format, SAMPLE_IMPORT_CSV) : [];
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
          <p className="font-semibold">{c.format}</p>
          <p className="text-sm text-muted-foreground">{c.private}</p>
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
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                {c.columns.map((column) => (
                  <th key={column} className="pb-2 pr-3 font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resultRows.map(({ row, status, duplicate }, index) => (
                <tr key={`${row.date}-${row.symbol}-${index}`} className="border-t border-border">
                  <td className="py-2 pr-3">{row.date}</td>
                  <td className="py-2 pr-3">{kindLabel(row.kind)}</td>
                  <td className="py-2 pr-3 font-semibold">{row.symbol}</td>
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
                  <td className="py-2 pr-3">—</td>
                  <td className="py-2 pr-3">{rejectionReason}</td>
                  <td className="py-2 pr-3 font-semibold">—</td>
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
          <Link
            to="/brokers"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Upload size={16} aria-hidden />
            {c.upload}
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="inline-flex min-h-11 items-center rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-accent"
          >
            {p.t("signUp")}
          </Link>
        </div>
      </Card>
    </div>
  );
}
