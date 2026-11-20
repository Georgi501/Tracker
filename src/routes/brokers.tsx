import { Card } from "@/components/AppShell";
import { BrokerTransferForm } from "@/components/BrokerTransferForm";
import { FirstImportWizard } from "@/components/FirstImportWizard";
import { ProBadge } from "@/components/ProFeatures";
import { supabase } from "@/integrations/supabase/client";
import { trackAnalyticsEvent } from "@/lib/analytics";
import {
  brokerConnectionStates,
  connectDirectBroker,
  disconnectDirectBroker,
  syncDirectBroker,
} from "@/lib/brokers.functions";
import {
  BROKER_FORMATS,
  existingImportTransactions,
  GENERIC_TEMPLATE,
  prepareCsvFile,
  reconciliationTotals,
  rowsForImport,
  splitDuplicates,
  type BrokerFormat,
  type CsvExcludedRow,
  type CsvRejection,
  type ImportedTx,
} from "@/lib/csv-import";
import type { Lang } from "@/lib/i18n";
import { notifyImportWithUndo } from "@/lib/import-undo";
import { proCopy } from "@/lib/pro-i18n";
import { usePortfolio } from "@/lib/store";
import { formatCsvPrepareError, trustCopy } from "@/lib/trust-i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, CheckCircle2, Plus, RefreshCw, Upload, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/brokers")({
  validateSearch: (search) =>
    z
      .object({
        broker: z.enum(["trading212", "ibkr", "revolut", "generic"]).optional().catch(undefined),
      })
      .parse(search),
  head: () => ({
    meta: [
      { title: "Brokers — CapiSpot CSV import" },
      {
        name: "description",
        content:
          "Import your transactions for free from a broker CSV: Trading 212, Interactive Brokers, Revolut or a generic template. Pro adds read-only IBKR and Trading 212 sync.",
      },
      { property: "og:title", content: "Brokers — CapiSpot" },
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
  source: "csv" | "api";
  totalRows: number;
  fresh: ImportedTx[];
  duplicates: ImportedTx[];
  includeDuplicates: number[];
  ignoredRows: number;
  excludedRows: CsvExcludedRow[];
  excludedBreakdown: { action: string; count: number }[];
  rejectedRows: CsvRejection[];
  feeColumns: string[];
};

type ImportResult = {
  imported: number;
  duplicates: number;
  ignoredRows: number;
  excludedRows: number;
  reviewRows: number;
  totals: ReturnType<typeof reconciliationTotals>;
};

const DIRECT_BROKER_COPY = {
  en: {
    connected: "Direct read-only API connected",
    lastSync: "Last sync",
    connect: "Connect and fetch history",
    sync: "Fetch latest history",
    disconnect: "Disconnect",
    replace: "Replace API credentials",
    apiKey: "Trading 212 API key",
    apiSecret: "Trading 212 API secret",
    token: "IBKR Flex Web Service token",
    queryId: "IBKR Flex Query ID",
    t212Help:
      "Use a Trading 212 API key with portfolio, order-history and dividend-history read permissions only. Available for Invest and Stocks ISA accounts; the API is beta.",
    ibkrHelp:
      "Enable Flex Web Service and create a Flex Query with Trades and dividend cash transactions. Choose a token expiry longer than the default 6 hours; renew it when IBKR expires it.",
    privacy:
      "Credentials are encrypted on our server. CapiSpot uses read requests only and never places orders.",
    symbolHelp:
      "Review tickers in the import preview and correct them if the broker's symbol differs from the market symbol.",
    fetchError: "Could not connect or sync this broker.",
    noRows: "No importable trades or dividends were found.",
    cancel: "Cancel",
  },
  bg: {
    connected: "Директната read-only връзка е активна",
    lastSync: "Последна синхронизация",
    connect: "Свържи и зареди историята",
    sync: "Зареди новите сделки",
    disconnect: "Прекъсни връзката",
    replace: "Смени API данните",
    apiKey: "Trading 212 API ключ",
    apiSecret: "Trading 212 API secret",
    token: "IBKR Flex Web Service token",
    queryId: "IBKR Flex Query ID",
    t212Help:
      "Използвай Trading 212 ключ само с read права за портфолио, история на поръчките и дивиденти. Достъпен е за Invest и Stocks ISA; API-то е бета.",
    ibkrHelp:
      "Активирай Flex Web Service и създай Flex Query с Trades и dividend cash transactions. Избери срок на token-а над стандартните 6 часа; поднови го при изтичане.",
    privacy:
      "Данните за достъп се криптират на сървъра. CapiSpot използва само заявки за четене и никога не подава поръчки.",
    symbolHelp:
      "Провери тикерите в прегледа на импорта и ги коригирай, ако символът на брокера се различава от пазарния.",
    fetchError: "Брокерът не можа да се свърже или синхронизира.",
    noRows: "Не бяха открити сделки или дивиденти за импорт.",
    cancel: "Отказ",
  },
  de: {
    connected: "Direkte Read-only-API verbunden",
    lastSync: "Letzte Synchronisierung",
    connect: "Verbinden und Historie laden",
    sync: "Neueste Historie laden",
    disconnect: "Verbindung trennen",
    replace: "API-Zugangsdaten ersetzen",
    apiKey: "Trading 212 API-Schlüssel",
    apiSecret: "Trading 212 API-Secret",
    token: "IBKR Flex-Web-Service-Token",
    queryId: "IBKR Flex-Query-ID",
    t212Help:
      "Nutze einen Trading-212-Schlüssel nur mit Lesezugriff für Portfolio, Orderhistorie und Dividenden. Verfügbar für Invest und Stocks ISA; API ist Beta.",
    ibkrHelp:
      "Aktiviere Flex Web Service und erstelle eine Flex Query mit Trades und Dividend Cash Transactions. Wähle eine längere Token-Laufzeit als die voreingestellten 6 Stunden.",
    privacy:
      "Zugangsdaten werden serverseitig verschlüsselt. CapiSpot verwendet nur Leseanfragen und platziert keine Orders.",
    symbolHelp:
      "Prüfe die Ticker in der Importvorschau und korrigiere sie, falls das Brokersymbol vom Marktsymbol abweicht.",
    fetchError: "Broker konnte nicht verbunden oder synchronisiert werden.",
    noRows: "Keine importierbaren Trades oder Dividenden gefunden.",
    cancel: "Abbrechen",
  },
  es: {
    connected: "API directa de solo lectura conectada",
    lastSync: "Última sincronización",
    connect: "Conectar y cargar historial",
    sync: "Cargar historial reciente",
    disconnect: "Desconectar",
    replace: "Cambiar credenciales API",
    apiKey: "Clave API de Trading 212",
    apiSecret: "Secreto API de Trading 212",
    token: "Token de IBKR Flex Web Service",
    queryId: "ID de consulta Flex de IBKR",
    t212Help:
      "Usa una clave de Trading 212 solo con permisos de lectura para cartera, historial de órdenes y dividendos. Disponible para Invest y Stocks ISA; API beta.",
    ibkrHelp:
      "Activa Flex Web Service y crea una consulta Flex con Trades y dividend cash transactions. Elige una duración superior a las 6 horas predeterminadas.",
    privacy:
      "Las credenciales se cifran en el servidor. CapiSpot solo usa solicitudes de lectura y nunca envía órdenes.",
    symbolHelp:
      "Revisa los símbolos en la vista previa y corrígelos si el símbolo del bróker difiere del símbolo de mercado.",
    fetchError: "No se pudo conectar o sincronizar el bróker.",
    noRows: "No se encontraron operaciones o dividendos para importar.",
    cancel: "Cancelar",
  },
  it: {
    connected: "API diretta di sola lettura collegata",
    lastSync: "Ultima sincronizzazione",
    connect: "Collega e carica lo storico",
    sync: "Carica lo storico recente",
    disconnect: "Disconnetti",
    replace: "Sostituisci credenziali API",
    apiKey: "Chiave API Trading 212",
    apiSecret: "Secret API Trading 212",
    token: "Token IBKR Flex Web Service",
    queryId: "ID query Flex IBKR",
    t212Help:
      "Usa una chiave Trading 212 con soli permessi di lettura per portafoglio, storico ordini e dividendi. Disponibile per Invest e Stocks ISA; API beta.",
    ibkrHelp:
      "Attiva Flex Web Service e crea una Flex Query con Trades e dividend cash transactions. Scegli una scadenza superiore alle 6 ore predefinite.",
    privacy:
      "Le credenziali sono cifrate sul server. CapiSpot usa solo richieste di lettura e non invia mai ordini.",
    symbolHelp:
      "Controlla i ticker nell'anteprima e correggili se il simbolo del broker è diverso da quello di mercato.",
    fetchError: "Impossibile collegare o sincronizzare il broker.",
    noRows: "Nessuna operazione o dividendo da importare.",
    cancel: "Annulla",
  },
} as const;

function Brokers() {
  const p = usePortfolio();
  const { broker: initialBroker } = Route.useSearch();
  const queryClient = useQueryClient();
  const getConnections = useServerFn(brokerConnectionStates);
  const brokerIds = p.brokers
    .filter((broker) => broker.format === "ibkr" || broker.format === "trading212")
    .map((broker) => broker.id);
  const connectionsQuery = useQuery({
    queryKey: ["direct-broker-connections", p.user?.id, brokerIds],
    queryFn: () => getConnections({ data: { brokerIds } }),
    enabled: !!p.user && brokerIds.length > 0,
    staleTime: 30_000,
  });
  const [preview, setPreview] = useState<StagedImport | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);

  if (!p.user)
    return (
      <Card className="mx-auto max-w-lg text-center">
        <h1 className="font-display text-2xl font-bold">
          {p.lang === "bg" ? "Импорт на сделки от CSV" : "Import transactions from CSV"}
        </h1>
        <p className="mx-auto mb-4 mt-2 max-w-md text-sm text-muted-foreground">
          {p.lang === "bg"
            ? "Безплатният CSV импорт включва преглед на файла и проверка за дублирани сделки."
            : "Free CSV import includes a file preview and duplicate transaction checks."}
        </p>
        <Link
          to="/import-demo"
          search={{ broker: initialBroker }}
          className="mx-auto inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Upload size={16} aria-hidden />
          {p.lang === "bg" ? "Пробвай с примерен CSV" : "Try a sample CSV"}
        </Link>
        <p className="mt-4 text-sm text-muted-foreground">
          {p.lang === "bg" ? "За да импортираш свои сделки," : "To import your own transactions,"}
        </p>
        <Link
          to="/auth"
          search={{
            mode: "signup",
            next: initialBroker ? `/brokers?broker=${initialBroker}` : "/brokers",
          }}
          className="mt-2 inline-flex min-h-11 items-center rounded-full border border-border px-5 py-2 text-sm font-semibold hover:bg-accent"
        >
          {p.t("signUp")}
        </Link>
      </Card>
    );

  const add = async (format: BrokerFormat): Promise<string | void> => {
    const label = BROKER_FORMATS.find((f) => f.id === format)?.label ?? format;
    const n = p.brokers.filter((b) => b.format === format).length;
    const { data, error } = await supabase
      .from("brokers")
      .insert({ name: n ? `${label} ${n + 1}` : label, format })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    await p.reload();
    return data?.id;
  };
  const remove = async (id: string) => {
    if (p.dataError) {
      toast.error(
        p.lang === "bg"
          ? "Данните не са заредени. Не мога да проверя историята на трансферите."
          : "Account data could not be loaded, so transfer history cannot be checked.",
      );
      return;
    }
    if (
      p.brokerTransfers.some(
        (transfer) => transfer.fromBrokerId === id || transfer.toBrokerId === id,
      )
    ) {
      toast.error(
        p.lang === "bg"
          ? "Тази сметка участва в трансфер. Не може да бъде изтрита, докато трансферите са записани."
          : "This broker account has recorded transfers and cannot be deleted.",
      );
      return;
    }
    const { error } = await supabase.from("brokers").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await p.reload();
  };
  const upload = async (brokerId: string, fmt: string, file: File) => {
    if (preparing || busy) return;
    setPreparing(true);
    setUploadError(null);
    setPreview(null);
    setImportResult(null);
    trackAnalyticsEvent("csv_import_started");
    try {
      const expectedFormat: BrokerFormat | undefined =
        fmt === "trading212" || fmt === "ibkr" || fmt === "revolut" || fmt === "generic"
          ? fmt
          : undefined;
      const analysis = await prepareCsvFile(file, expectedFormat);
      const existing = existingImportTransactions(p.transactions, p.assets, brokerId);
      const normalized = await p.normalizeImportRows(analysis.transactions);
      setPreview({
        brokerId,
        format: analysis.format,
        source: "csv",
        totalRows: analysis.totalRows,
        excludedRows: analysis.excluded,
        excludedBreakdown: analysis.excludedBreakdown,
        ignoredRows: analysis.rejected.length,
        rejectedRows: analysis.rejected,
        feeColumns: analysis.feeColumns,
        includeDuplicates: [],
        ...splitDuplicates(analysis.transactions, existing, normalized),
      });
    } catch (err) {
      const message = formatCsvPrepareError(p.lang, err);
      setUploadError(message);
      toast.error(message);
    } finally {
      setPreparing(false);
    }
  };
  const confirmImport = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const currentExisting = existingImportTransactions(
        p.transactions,
        p.assets,
        preview.brokerId,
      );
      const normalized = await p.normalizeImportRows(preview.fresh);
      const split = splitDuplicates(preview.fresh, currentExisting, normalized);
      if (split.duplicates.length) {
        setPreview((current) =>
          current
            ? {
                ...current,
                fresh: split.fresh,
                duplicates: [...current.duplicates, ...split.duplicates],
              }
            : current,
        );
        toast.info(IMPORT_COPY[p.lang].newDuplicates(split.duplicates.length));
        return;
      }
      const selectedRows = rowsForImport([], preview.duplicates, preview.includeDuplicates);
      const rowsToImport = [...split.fresh, ...selectedRows];
      if (!rowsToImport.length) {
        toast.info(IMPORT_COPY[p.lang].nothingSelected);
        return;
      }
      const imported = await p.importTransactions(preview.brokerId, rowsToImport);
      trackAnalyticsEvent("csv_import_completed");
      setImportResult({
        imported: imported.count,
        duplicates: preview.duplicates.length - selectedRows.length,
        ignoredRows: preview.rejectedRows.length + preview.excludedRows.length,
        excludedRows: preview.excludedRows.length,
        reviewRows: preview.rejectedRows.length,
        totals: reconciliationTotals(rowsToImport),
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
  const stageDirectRows = async (brokerId: string, format: BrokerFormat, rows: ImportedTx[]) => {
    if (!rows.length) {
      toast.info(
        p.lang === "bg"
          ? "Няма налични сделки или дивиденти за импорт."
          : "No importable trades or dividends were found.",
      );
      return;
    }
    setUploadError(null);
    const existing = existingImportTransactions(p.transactions, p.assets, brokerId);
    const normalized = await p.normalizeImportRows(rows);
    const split = splitDuplicates(rows, existing, normalized);
    setPreview({
      brokerId,
      format,
      source: "api",
      totalRows: rows.length,
      includeDuplicates: [],
      ...split,
      ignoredRows: 0,
      excludedRows: [],
      excludedBreakdown: [],
      rejectedRows: [],
      feeColumns: [],
    });
  };
  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(GENERIC_TEMPLATE)}`;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="font-display text-2xl font-bold">{p.t("brokers")}</h1>
        <span className="text-sm text-muted-foreground">{p.isPro ? p.t("pro") : p.t("free")}</span>
      </div>
      {uploadError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl border border-destructive/40 bg-destructive/10 p-3.5 text-sm text-foreground"
        >
          <AlertCircle className="mt-0.5 shrink-0 text-destructive" size={18} aria-hidden />
          <p className="min-w-0 flex-1 leading-relaxed">{uploadError}</p>
          <button
            type="button"
            aria-label={IMPORT_RESULT_COPY[p.lang].dismiss}
            onClick={() => setUploadError(null)}
            className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      )}
      <FirstImportWizard
        lang={p.lang}
        brokers={p.brokers}
        initialFormat={initialBroker}
        onCreate={add}
        onUpload={upload}
        preview={!!preview}
        completed={!!importResult}
        preparing={preparing || busy}
      />
      {importResult && (
        <ImportResultCard
          lang={p.lang}
          result={importResult}
          onDismiss={() => setImportResult(null)}
        />
      )}
      <BrokerTransferForm />
      {p.brokers.map((b) => (
        <div key={b.id} className="space-y-3">
          <Card className="flex flex-wrap items-center gap-3">
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
          {(b.format === "ibkr" || b.format === "trading212") && (
            <DirectBrokerConnection
              brokerId={b.id}
              provider={b.format}
              isPro={p.isPro}
              connected={connectionsQuery.data?.some((item) => item.brokerId === b.id) ?? false}
              lastSyncedAt={
                connectionsQuery.data?.find((item) => item.brokerId === b.id)?.lastSyncedAt ?? null
              }
              onRows={(rows) => stageDirectRows(b.id, b.format as "ibkr" | "trading212", rows)}
              onChanged={() =>
                void queryClient.invalidateQueries({ queryKey: ["direct-broker-connections"] })
              }
              lang={p.lang}
            />
          )}
        </div>
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
          onIncludeDuplicate={(index, include) =>
            setPreview((current) =>
              current
                ? {
                    ...current,
                    includeDuplicates: include
                      ? [...current.includeDuplicates, index]
                      : current.includeDuplicates.filter((item) => item !== index),
                  }
                : current,
            )
          }
          onCancel={() => setPreview(null)}
          onConfirm={() => void confirmImport()}
        />
      )}
      <div>
        <h2 className="mb-3 font-display text-lg font-semibold">{p.t("addBroker")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {BROKER_FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => void add(f.id)}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary"
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
      <ImportGuide lang={p.lang} />
    </div>
  );
}

const IMPORT_GUIDE: Record<
  Lang,
  {
    title: string;
    steps: [string, string][];
    tips: string[];
  }
> = {
  en: {
    title: "How importing works",
    steps: [
      [
        "1. Add your broker",
        "Pick the broker above. This only creates a container for its transactions; no login to the broker is needed for CSV import.",
      ],
      [
        "2. Export a CSV from the broker",
        "In your broker's reports or statements section, download the full transaction history. A full period avoids missing early purchases that would distort your average price and FIFO results.",
      ],
      [
        "3. Upload the file",
        "Press Import CSV next to the broker. The file is read in your browser and the layout is detected automatically.",
      ],
      [
        "4. Review the preview",
        "You see every new row before anything is saved. You can fix tickers, and rows already in your portfolio are marked as duplicates and skipped by default. Rows that cannot be read are listed with the reason.",
      ],
      [
        "5. Confirm",
        "After you confirm, the transactions are saved to your account. Each keeps its original currency and is converted to USD with the exchange rate of its date. Fees are included in the cost. You can undo the import right after.",
      ],
      [
        "6. FIFO report",
        "The annual FIFO report of realized gains and losses is a Pro feature. Free includes CSV import, preview and duplicate checks.",
      ],
    ],
    tips: [
      "Importing the same file twice is safe: duplicates are detected.",
      "If a ticker is not recognised, correct it in the preview so live prices can be found.",
      "To update later, export a fresh CSV and import it again: only new rows are added.",
      "Pro adds read-only sync for Interactive Brokers and Trading 212. CapiSpot never places orders.",
    ],
  },
  bg: {
    title: "Как работи импортът",
    steps: [
      [
        "1. Добави брокера си",
        "Избери брокера по-горе. Това само създава контейнер за сделките му; за CSV импорт не е нужно да влизаш в акаунта на брокера.",
      ],
      [
        "2. Експортирай CSV от брокера",
        "В раздела с отчети или извлечения на брокера изтегли цялата история на сделките. Пълен период предотвратява липсата на ранни покупки, които биха изкривили средната цена и FIFO резултатите.",
      ],
      [
        "3. Качи файла",
        "Натисни „Импорт на CSV“ до брокера. Файлът се чете в браузъра ти и форматът се разпознава автоматично.",
      ],
      [
        "4. Прегледай",
        "Виждаш всеки нов ред, преди да се запази нещо. Можеш да поправяш тикерите, а редовете, които вече са в портфолиото, се маркират като дубликати и по подразбиране се пропускат. Редовете, които не могат да се прочетат, се показват с причина.",
      ],
      [
        "5. Потвърди",
        "След потвърждение сделките се запазват в акаунта ти. Всяка запазва оригиналната си валута и се превръща в USD с курса към датата ѝ. Таксите са включени в цената. Веднага след това можеш да отмениш импорта.",
      ],
      [
        "6. FIFO справка",
        "Годишната FIFO справка за реализираните печалби и загуби е Pro функция. В безплатния план са включени CSV импортът, прегледът и проверката за дубликати.",
      ],
    ],
    tips: [
      "Импортът на един и същ файл два пъти е безопасен: дубликатите се откриват.",
      "Ако тикер не е разпознат, поправи го в прегледа, за да се намерят живи цени.",
      "За обновяване по-късно експортирай нов CSV и го импортирай: добавят се само новите редове.",
      "Pro добавя синхронизация само за четене с Interactive Brokers и Trading 212. CapiSpot никога не подава поръчки.",
    ],
  },
  de: {
    title: "So funktioniert der Import",
    steps: [
      [
        "1. Broker hinzufügen",
        "Wähle oben deinen Broker. Dadurch wird ein Container für dessen Transaktionen erstellt; für den CSV-Import ist kein Broker-Login nötig.",
      ],
      [
        "2. CSV vom Broker exportieren",
        "Lade im Bereich Berichte oder Kontoauszüge deines Brokers die gesamte Transaktionshistorie herunter, damit keine frühen Käufe für Durchschnittspreis und FIFO fehlen.",
      ],
      [
        "3. Datei hochladen",
        "Klicke neben dem Broker auf CSV importieren oder nutze das Auto-Detect-Feld. Die Datei wird im Browser gelesen und das Format automatisch erkannt.",
      ],
      [
        "4. Vorschau prüfen",
        "Du siehst jede neue Zeile vor dem Speichern. Duplikate werden markiert und standardmäßig übersprungen; nicht lesbare Zeilen werden mit Grund aufgelistet.",
      ],
      [
        "5. Bestätigen",
        "Nach Bestätigung werden die Transaktionen gespeichert. Jede behält ihre Originalwährung und wird mit dem historischen Tageskurs in USD umgerechnet.",
      ],
      [
        "6. FIFO-Bericht",
        "Der jährliche FIFO-Bericht über realisierte Gewinne und Verluste ist eine Pro-Funktion. Free enthält CSV-Import, Vorschau und Duplikatprüfung.",
      ],
    ],
    tips: [
      "Dieselbe Datei zweimal zu importieren ist sicher: Duplikate werden erkannt.",
      "Falls ein Ticker nicht erkannt wird, korrigiere ihn in der Vorschau.",
      "Für spätere Updates exportiere einfach eine neue CSV: es werden nur neue Zeilen hinzugefügt.",
      "Pro ergänzt Read-only-Sync für Interactive Brokers und Trading 212. CapiSpot platziert niemals Orders.",
    ],
  },
  es: {
    title: "Cómo funciona la importación",
    steps: [
      [
        "1. Añade tu bróker",
        "Elige el bróker arriba para crear su contenedor de operaciones; no necesitas iniciar sesión en el bróker para importar por CSV.",
      ],
      [
        "2. Exporta un CSV desde tu bróker",
        "En la sección de informes o extractos de tu bróker, descarga el historial completo desde tu primera compra.",
      ],
      [
        "3. Sube el archivo",
        "Pulsa Importar CSV junto al bróker o usa la zona de detección automática. El formato se detecta en tu navegador.",
      ],
      [
        "4. Revisa la vista previa",
        "Verás cada fila antes de guardar. Los duplicados se omiten por defecto y las filas no válidas se muestran con su motivo.",
      ],
      [
        "5. Confirma",
        "Al confirmar, las operaciones se guardan con su divisa original y se convierten a USD con el tipo de cambio de su fecha.",
      ],
      [
        "6. Informe FIFO",
        "El informe anual FIFO de ganancias y pérdidas realizadas es una función Pro. El plan Free incluye importación CSV, vista previa y control de duplicados.",
      ],
    ],
    tips: [
      "Importar el mismo archivo dos veces es seguro: se detectan los duplicados.",
      "Si un símbolo no se reconoce, corrígelo en la vista previa.",
      "Para actualizar más adelante, sube un CSV nuevo: solo se añadirán las filas nuevas.",
      "Pro añade sincronización de solo lectura para Interactive Brokers y Trading 212. CapiSpot nunca envía órdenes.",
    ],
  },
  it: {
    title: "Come funziona l'importazione",
    steps: [
      [
        "1. Aggiungi il tuo broker",
        "Scegli il broker sopra per creare un contenitore per le sue operazioni; per l'importazione CSV non serve accedere al broker.",
      ],
      [
        "2. Esporta un CSV dal broker",
        "Nella sezione report o estratti conto del broker, scarica lo storico completo dal primo acquisto.",
      ],
      [
        "3. Carica il file",
        "Premi Importa CSV accanto al broker o trascina il file nell'area di rilevamento automatico.",
      ],
      [
        "4. Controlla l'anteprima",
        "Vedi ogni nuova riga prima del salvataggio. I duplicati vengono ignorati per impostazione predefinita e le righe non valide sono elencate con il motivo.",
      ],
      [
        "5. Conferma",
        "Dopo la conferma, le operazioni vengono salvate mantenendo la valuta originale e convertite in USD al cambio della data.",
      ],
      [
        "6. Report FIFO",
        "Il report annuale FIFO di profitti e perdite realizzati è una funzione Pro. Il piano Free include importazione CSV, anteprima e controllo duplicati.",
      ],
    ],
    tips: [
      "Importare lo stesso file due volte è sicuro: i duplicati vengono rilevati.",
      "Se un ticker non viene riconosciuto, correggilo nell'anteprima.",
      "Per aggiornare in seguito, carica un nuovo CSV: verranno aggiunte solo le nuove righe.",
      "Pro aggiunge la sincronizzazione di sola lettura per Interactive Brokers e Trading 212. CapiSpot non invia mai ordini.",
    ],
  },
};

function ImportGuide({ lang }: { lang: Lang }) {
  const g = IMPORT_GUIDE[lang];
  return (
    <details className="mt-6 rounded-2xl border border-border bg-card p-4" open>
      <summary className="cursor-pointer font-display text-lg font-semibold">{g.title}</summary>
      <ol className="mt-3 space-y-3">
        {g.steps.map(([h, body]) => (
          <li key={h}>
            <p className="text-sm font-semibold">{h}</p>
            <p className="text-sm text-muted-foreground">{body}</p>
          </li>
        ))}
      </ol>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {g.tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </details>
  );
}

function DirectBrokerConnection({
  brokerId,
  provider,
  isPro,
  connected,
  lastSyncedAt,
  onRows,
  onChanged,
  lang,
}: {
  brokerId: string;
  provider: "ibkr" | "trading212";
  isPro: boolean;
  connected: boolean;
  lastSyncedAt: string | null;
  onRows: (rows: ImportedTx[]) => Promise<void>;
  onChanged: () => void;
  lang: Lang;
}) {
  const copy = DIRECT_BROKER_COPY[lang];
  const pc = proCopy[lang];
  const connectFn = useServerFn(connectDirectBroker);
  const syncFn = useServerFn(syncDirectBroker);
  const disconnectFn = useServerFn(disconnectDirectBroker);
  const [editing, setEditing] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [token, setToken] = useState("");
  const [queryId, setQueryId] = useState("");
  const [busy, setBusy] = useState(false);
  const isTrading212 = provider === "trading212";
  const lastSyncText = lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : null;
  const connect = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const credentials = isTrading212 ? { apiKey, apiSecret } : { token, queryId };
      const result = await connectFn({ data: { brokerId, provider, credentials } });
      setApiKey("");
      setApiSecret("");
      setToken("");
      setQueryId("");
      setEditing(false);
      onChanged();
      await onRows(result.rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.fetchError);
    } finally {
      setBusy(false);
    }
  };
  const sync = async () => {
    setBusy(true);
    try {
      const result = await syncFn({ data: { brokerId } });
      await onRows(result.rows);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.fetchError);
    } finally {
      setBusy(false);
    }
  };
  const disconnect = async () => {
    setBusy(true);
    try {
      await disconnectFn({ data: { brokerId } });
      onChanged();
      setEditing(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.fetchError);
    } finally {
      setBusy(false);
    }
  };
  if (!isPro)
    return (
      <Card className="space-y-3 border-primary/30 bg-primary/[0.03]">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-semibold">{pc.directBrokerSync}</h3>
          <ProBadge />
        </div>
        <p className="text-sm text-muted-foreground">{pc.directBrokerSyncDesc}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/pricing"
            hash="plan-comparison"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            {pc.unlock}
          </Link>
          {connected && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void disconnect()}
              className="text-sm text-destructive disabled:opacity-50"
            >
              {busy ? "…" : copy.disconnect}
            </button>
          )}
        </div>
      </Card>
    );
  return (
    <Card className="space-y-3 border-primary/20 bg-primary/[0.03]">
      <p className="text-xs text-muted-foreground">{copy.symbolHelp}</p>
      {connected && !editing ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-success">{copy.connected}</p>
            {lastSyncText && (
              <p className="text-xs text-muted-foreground">
                {copy.lastSync}: {lastSyncText}
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void sync()}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <RefreshCw size={14} aria-hidden />
            {busy ? "…" : copy.sync}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setEditing(true)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {copy.replace}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void disconnect()}
            className="text-sm text-destructive"
          >
            {copy.disconnect}
          </button>
        </div>
      ) : (
        <form className="space-y-3" onSubmit={(event) => void connect(event)}>
          <div className="grid gap-3 sm:grid-cols-2">
            {isTrading212 ? (
              <>
                <label className="grid gap-1 text-sm">
                  {copy.apiKey}
                  <input
                    required
                    type="password"
                    autoComplete="new-password"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    className={input}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  {copy.apiSecret}
                  <input
                    required
                    type="password"
                    autoComplete="new-password"
                    value={apiSecret}
                    onChange={(event) => setApiSecret(event.target.value)}
                    className={input}
                  />
                </label>
              </>
            ) : (
              <>
                <label className="grid gap-1 text-sm">
                  {copy.token}
                  <input
                    required
                    type="password"
                    autoComplete="new-password"
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    className={input}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  {copy.queryId}
                  <input
                    required
                    inputMode="numeric"
                    pattern="[0-9]+"
                    autoComplete="off"
                    value={queryId}
                    onChange={(event) => setQueryId(event.target.value)}
                    className={input}
                  />
                </label>
              </>
            )}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {isTrading212 ? copy.t212Help : copy.ibkrHelp}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">{copy.privacy}</p>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? "…" : copy.connect}
            </button>
            {connected && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setEditing(false)}
                className="rounded-full border border-border px-4 py-2 text-sm"
              >
                {copy.cancel}
              </button>
            )}
          </div>
        </form>
      )}
    </Card>
  );
}

function ImportPreview({
  lang,
  preview,
  busy,
  onEdit,
  onIncludeDuplicate,
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
  onIncludeDuplicate: (index: number, include: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const c = IMPORT_COPY[lang];
  const rowsToImport = rowsForImport(preview.fresh, preview.duplicates, preview.includeDuplicates);
  const allEligible = [...preview.fresh, ...preview.duplicates];
  const count = (k: string) => rowsToImport.filter((r) => r.kind === k).length;
  const eligibleCount = (k: ImportedTx["kind"]) => allEligible.filter((r) => r.kind === k).length;
  const isT212Csv = preview.format === "trading212" && preview.source === "csv";
  const currencies = [...new Set(allEligible.map((r) => r.currency ?? "USD"))].join(", ");
  const totals = reconciliationTotals(rowsToImport);
  const valid = rowsToImport.every(
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
      {isT212Csv ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-3 sm:text-sm lg:grid-cols-6">
            {[
              [c.totalOperations, preview.totalRows],
              [c.eligibleBuys, eligibleCount("buy")],
              [c.eligibleSells, eligibleCount("sell")],
              [c.excludedShort, preview.excludedRows.length],
              [c.duplicatesShort, preview.duplicates.length],
              [c.reviewShort, preview.rejectedRows.length],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl bg-secondary p-2">
                <b className="block text-lg tabular-nums">{value}</b>
                {label}
              </div>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{c.t212PolicyNote}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          {(["buy", "sell", "dividend"] as const).map((k) => (
            <div key={k} className="rounded-xl bg-secondary p-2">
              <b className="block text-lg tabular-nums">{count(k)}</b>
              {c.kinds[k]}
            </div>
          ))}
        </div>
      )}
      {currencies && (
        <p className="text-xs text-muted-foreground">
          {c.currencies}: {currencies} · {c.fx}
        </p>
      )}
      <ReconciliationTable lang={lang} totals={totals} />
      {allEligible.length > 0 && (
        <p className="rounded-xl border border-border bg-background/70 p-3 text-xs leading-relaxed text-muted-foreground">
          {c.fees(preview.feeColumns)}
        </p>
      )}
      {preview.excludedRows.length > 0 && (
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-sm font-semibold">{c.excludedTitle(preview.excludedRows.length)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{c.t212PolicyNote}</p>
          {preview.excludedBreakdown.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {preview.excludedBreakdown.map((item) => (
                <li
                  key={item.action}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs"
                >
                  <span className="font-medium">{item.action}</span>
                  <span className="tabular-nums text-muted-foreground">{item.count}</span>
                </li>
              ))}
            </ul>
          )}
          <details className="mt-2.5 text-xs">
            <summary className="cursor-pointer font-semibold text-primary hover:underline">
              {c.excludedDetails}
            </summary>
            <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-border bg-background">
              <table className="w-full min-w-[360px] text-left text-xs">
                <thead className="sticky top-0 bg-secondary text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5">{c.row}</th>
                    <th className="px-2 py-1.5">{c.action}</th>
                    <th className="px-2 py-1.5">{c.date}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.excludedRows.slice(0, 50).map((item) => (
                    <tr key={item.row}>
                      <td className="px-2 py-1.5 tabular-nums">{item.row}</td>
                      <td className="px-2 py-1.5">{item.action}</td>
                      <td className="px-2 py-1.5 tabular-nums text-muted-foreground">
                        {item.date ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.excludedRows.length > 50 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {c.moreRejected(preview.excludedRows.length - 50)}
              </p>
            )}
          </details>
        </div>
      )}
      {preview.duplicates.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-sm font-semibold">{c.duplicates(preview.duplicates.length)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{c.duplicateHelp}</p>
          <ul className="mt-2 max-h-48 divide-y divide-border overflow-auto rounded-lg border border-border">
            {preview.duplicates.map((row, index) => (
              <li key={`${row.symbol}-${row.date}-${index}`} className="p-2">
                <label className="flex cursor-pointer items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-primary"
                    checked={preview.includeDuplicates.includes(index)}
                    onChange={(event) => onIncludeDuplicate(index, event.target.checked)}
                    aria-label={`${c.includeDuplicate} ${row.symbol} ${row.date}`}
                  />
                  <span>
                    <span className="font-semibold">
                      {row.symbol} · {c.kinds[row.kind]} · {row.date}
                    </span>
                    <span className="block text-muted-foreground">
                      {row.quantity} × {row.price} {row.currency ?? "USD"}
                      {(row.fee ?? 0) > 0
                        ? ` · ${c.fee}: ${row.fee} ${row.feeCurrency ?? row.currency ?? "USD"}`
                        : ""}
                    </span>
                    <span className="mt-1 block">{c.includeDuplicate}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
      {preview.rejectedRows.length > 0 && (
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
                    <td
                      data-private="raw"
                      className="max-w-72 truncate px-2 py-1.5 font-mono"
                      title={rejected.raw}
                    >
                      {rejected.raw}
                    </td>
                    <td className="px-2 py-1.5">
                      {rejected.reason === "unknown_action" && rejected.action
                        ? `${rejected.action}: `
                        : ""}
                      {c.rejectionReasons[rejected.reason]}
                    </td>
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
      {preview.fresh.length > 0 ? (
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
                      onChange={(event) =>
                        onEdit(index, "symbol", event.target.value.toUpperCase())
                      }
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
      ) : (
        <p className="rounded-xl border border-border bg-background/70 p-3 text-xs text-muted-foreground">
          {preview.duplicates.length > 0 ? c.allDuplicatesNote : c.noEligibleTrades}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-full px-4 py-2 text-sm text-muted-foreground">
          {c.cancel}
        </button>
        <button
          disabled={busy || !rowsToImport.length || !valid}
          onClick={onConfirm}
          className="press rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {c.confirm(rowsToImport.length)}
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
            <dl
              className={`mt-3 grid grid-cols-1 gap-2 text-sm ${result.excludedRows > 0 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}
            >
              <div className="rounded-xl bg-background/70 p-3">
                <dt className="text-muted-foreground">{trustCopy[lang].summary[0]}</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">{result.imported}</dd>
              </div>
              <div className="rounded-xl bg-background/70 p-3">
                <dt className="text-muted-foreground">{trustCopy[lang].summary[1]}</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">{result.duplicates}</dd>
              </div>
              {result.excludedRows > 0 && (
                <div className="rounded-xl bg-background/70 p-3">
                  <dt className="text-muted-foreground">{c.excluded}</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">{result.excludedRows}</dd>
                </div>
              )}
              <div className="rounded-xl bg-background/70 p-3">
                <dt className="text-muted-foreground">{trustCopy[lang].summary[2]}</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">{result.reviewRows}</dd>
              </div>
            </dl>
            <ReconciliationTable lang={lang} totals={result.totals} />
            {result.reviewRows > 0 && (
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
    excluded: string;
    ignored: string;
    reviewIgnored: string;
    viewHoldings: string;
    dismiss: string;
  }
> = {
  en: {
    title: "Import complete",
    imported: "Transactions imported",
    duplicates: "Possible duplicates not imported",
    excluded: "Excluded non-investment",
    ignored: "CSV rows not imported",
    reviewIgnored:
      "Some CSV rows were not recognized as transactions. Check the original file if you expected additional trades or dividends.",
    viewHoldings: "View holdings",
    dismiss: "Dismiss import summary",
  },
  bg: {
    title: "Импортът приключи",
    imported: "Импортирани трансакции",
    duplicates: "Възможни дубликати, които не са импортирани",
    excluded: "Изключени неинвестиционни",
    ignored: "Неимпортирани CSV редове",
    reviewIgnored:
      "Някои CSV редове не са разпознати като трансакции. Провери оригиналния файл, ако очакваш още сделки или дивиденти.",
    viewHoldings: "Към позициите",
    dismiss: "Затвори обобщението за импорта",
  },
  de: {
    title: "Import abgeschlossen",
    imported: "Importierte Transaktionen",
    duplicates: "Mögliche, nicht importierte Duplikate",
    excluded: "Ausgeschlossen (Nicht-Investment)",
    ignored: "Nicht importierte CSV-Zeilen",
    reviewIgnored:
      "Einige CSV-Zeilen wurden nicht als Transaktionen erkannt. Prüfe die Originaldatei, wenn du weitere Trades oder Dividenden erwartet hast.",
    viewHoldings: "Positionen ansehen",
    dismiss: "Importübersicht schließen",
  },
  es: {
    title: "Importación completada",
    imported: "Operaciones importadas",
    duplicates: "Posibles duplicados no importados",
    excluded: "Excluidas (no inversión)",
    ignored: "Filas CSV no importadas",
    reviewIgnored:
      "Algunas filas CSV no se reconocieron como operaciones. Revisa el archivo original si esperabas más operaciones o dividendos.",
    viewHoldings: "Ver posiciones",
    dismiss: "Cerrar resumen de importación",
  },
  it: {
    title: "Importazione completata",
    imported: "Operazioni importate",
    duplicates: "Possibili duplicati non importati",
    excluded: "Escluse (non investimento)",
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
    totalOperations: string;
    eligibleBuys: string;
    eligibleSells: string;
    excludedShort: string;
    duplicatesShort: string;
    reviewShort: string;
    t212PolicyNote: string;
    excludedTitle: (count: number) => string;
    excludedDetails: string;
    action: string;
    allDuplicatesNote: string;
    noEligibleTrades: string;
    currencies: string;
    fx: string;
    fees: (columns: string[]) => string;
    duplicates: (count: number) => string;
    duplicateHelp: string;
    includeDuplicate: string;
    newDuplicates: (count: number) => string;
    nothingSelected: string;
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
    totalOperations: "CSV rows",
    eligibleBuys: "Eligible purchases",
    eligibleSells: "Eligible sales",
    excludedShort: "Excluded",
    duplicatesShort: "Duplicates",
    reviewShort: "Needs review",
    t212PolicyNote:
      "Only investment purchases and sales are imported. Card payments, cashback and other cash-account activities are excluded.",
    excludedTitle: (n) => `${n} excluded non-investment operations`,
    excludedDetails: "View excluded rows",
    action: "Action",
    allDuplicatesNote: "All eligible trades in this CSV are already in this account.",
    noEligibleTrades: "No eligible investment purchases or sales were found in this CSV.",
    currencies: "Currencies detected",
    fx: "converted using the dated provider rate",
    fees: (columns) =>
      `${columns.length ? "Fee columns detected: " + columns.join(", ") + ". " : "No fee columns detected; this does not confirm the broker charged none. "}` +
      "Detected fees are imported separately in the listed currency. Check the preview: if fee currency is not provided, the transaction currency is used.",
    duplicates: (n) => `${n} possible duplicate rows found.`,
    duplicateHelp:
      "Review each match. These rows will not be imported unless you check them; matching is based on transaction details or broker transaction ID.",
    includeDuplicate: "Import this row anyway",
    newDuplicates: (n) =>
      `${n} more possible duplicate${n === 1 ? "" : "s"} appeared during review. Check them before importing.`,
    nothingSelected: "No new transactions selected. Check any duplicate rows you intend to import.",
    rejectedTitle: (n) => `${n} rows require review and will not be imported`,
    rejectedHelp:
      "Review these rows. To correct them, cancel this preview, fix the source CSV and upload it again.",
    row: "CSV row",
    rawRow: "Original row",
    reason: "Reason",
    rejectionReasons: {
      unsupported_action: "Unsupported transaction type or action",
      unknown_action: "Unknown or unrecognized action — requires manual review",
      missing_ticker: "Ticker or asset symbol is missing",
      unsupported_currency: "Unsupported currency",
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
    totalOperations: "CSV операции",
    eligibleBuys: "Допустими покупки",
    eligibleSells: "Допустими продажби",
    excludedShort: "Изключени",
    duplicatesShort: "Дубликати",
    reviewShort: "За преглед",
    t212PolicyNote:
      "Импортират се само инвестиционни покупки и продажби. Картови плащания, кешбек и други кеш операции по сметката се изключват.",
    excludedTitle: (n) => `${n} изключени неинвестиционни операции`,
    excludedDetails: "Покажи изключените редове",
    action: "Действие",
    allDuplicatesNote: "Всички допустими сделки в този CSV вече присъстват в тази сметка.",
    noEligibleTrades:
      "В този CSV файл не бяха открити допустими инвестиционни покупки или продажби.",
    currencies: "Разпознати валути",
    fx: "конвертират се по курса за датата от доставчика",
    fees: (columns) =>
      `${columns.length ? "Открити колони за такси: " + columns.join(", ") + ". " : "Не са открити колони за такси; това не означава, че брокерът не е начислил такива. "}` +
      "Откритите такси се импортират отделно във валутата от файла. Провери прегледа; ако липсва валута на таксата, се използва валутата на сделката.",
    duplicates: (n) => `Открити са ${n} възможни дублирани реда.`,
    duplicateHelp:
      "Прегледай всяко съвпадение. Редовете няма да се импортират, освен ако не ги отметнеш; сравнението е по данните за сделката или ID от брокера.",
    includeDuplicate: "Импортирай този ред въпреки това",
    newDuplicates: (n) =>
      `По време на прегледа се откриха още ${n} възможни дубликата. Провери ги преди импортиране.`,
    nothingSelected:
      "Няма избрани нови сделки. Отметни дублираните редове, които искаш да импортираш.",
    rejectedTitle: (n) => `${n} реда изискват проверка и няма да бъдат импортирани`,
    rejectedHelp:
      "Прегледай редовете. За корекция откажи този преглед, редактирай оригиналния CSV и го качи отново.",
    row: "CSV ред",
    rawRow: "Оригинален ред",
    reason: "Причина",
    rejectionReasons: {
      unsupported_action: "Неподдържан вид или действие",
      unknown_action: "Неразпознато действие — изисква ръчна проверка",
      missing_ticker: "Липсва тикер или символ на актива",
      unsupported_currency: "Неподдържана валута",
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
    totalOperations: "CSV-Zeilen",
    eligibleBuys: "Zulässige Käufe",
    eligibleSells: "Zulässige Verkäufe",
    excludedShort: "Ausgeschlossen",
    duplicatesShort: "Duplikate",
    reviewShort: "Zu prüfen",
    t212PolicyNote:
      "Es werden nur Wertpapierkäufe und -verkäufe importiert. Kartenzahlungen, Cashback und sonstige Kontobewegungen werden ausgeschlossen.",
    excludedTitle: (n) => `${n} ausgeschlossene Nicht-Investment-Vorgänge`,
    excludedDetails: "Ausgeschlossene Zeilen ansehen",
    action: "Vorgang",
    allDuplicatesNote:
      "Alle zulässigen Trades in dieser CSV sind bereits in diesem Konto enthalten.",
    noEligibleTrades:
      "In dieser CSV wurden keine zulässigen Wertpapierkäufe oder -verkäufe gefunden.",
    currencies: "Erkannte Währungen",
    fx: "Umrechnung mit dem datierten Anbieter-Kurs",
    fees: (columns) =>
      `${columns.length ? "Erkannte Gebührenfelder: " + columns.join(", ") + ". " : "Keine Gebührenfelder erkannt; das bedeutet nicht, dass der Broker keine Gebühren berechnet hat. "}` +
      "Erkannte Gebühren werden separat in der angegebenen Währung importiert. Prüfe die Vorschau; fehlt eine Gebührenwährung, wird die Transaktionswährung verwendet.",
    duplicates: (n) => `${n} mögliche doppelte Zeilen gefunden.`,
    duplicateHelp:
      "Prüfe jeden Treffer. Diese Zeilen werden nur importiert, wenn du sie auswählst; verglichen werden Transaktionsdaten oder die Broker-ID.",
    includeDuplicate: "Diese Zeile trotzdem importieren",
    newDuplicates: (n) =>
      `${n} weitere mögliche Duplikate wurden während der Prüfung erkannt. Bitte vor dem Import prüfen.`,
    nothingSelected:
      "Keine neuen Transaktionen ausgewählt. Wähle Duplikate aus, die du importieren möchtest.",
    rejectedTitle: (n) => `${n} Zeilen erfordern Prüfung und werden nicht importiert`,
    rejectedHelp:
      "Prüfe diese Zeilen. Zum Korrigieren Vorschau abbrechen, CSV bearbeiten und erneut hochladen.",
    row: "CSV-Zeile",
    rawRow: "Originalzeile",
    reason: "Grund",
    rejectionReasons: {
      unsupported_action: "Nicht unterstützter Typ oder Vorgang",
      unknown_action: "Unbekannter Vorgang — erfordert manuelle Prüfung",
      missing_ticker: "Ticker oder Asset-Symbol fehlt",
      unsupported_currency: "Nicht unterstützte Währung",
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
    totalOperations: "Filas CSV",
    eligibleBuys: "Compras válidas",
    eligibleSells: "Ventas válidas",
    excludedShort: "Excluidas",
    duplicatesShort: "Duplicados",
    reviewShort: "Por revisar",
    t212PolicyNote:
      "Solo se importan compras y ventas de inversión. Los pagos con tarjeta, el cashback y otros movimientos de efectivo se excluyen.",
    excludedTitle: (n) => `${n} operaciones no financieras excluidas`,
    excludedDetails: "Ver filas excluidas",
    action: "Acción",
    allDuplicatesNote: "Todas las operaciones válidas de este CSV ya existen en esta cuenta.",
    noEligibleTrades: "No se encontraron compras ni ventas de inversión válidas en este CSV.",
    currencies: "Monedas detectadas",
    fx: "convertidas con el tipo del proveedor para cada fecha",
    fees: (columns) =>
      `${columns.length ? "Columnas de comisiones detectadas: " + columns.join(", ") + ". " : "No se detectaron columnas de comisiones; esto no confirma que el bróker no las haya cobrado. "}` +
      "Las comisiones detectadas se importan por separado en la moneda indicada. Revisa la vista previa; si falta la moneda, se usa la de la operación.",
    duplicates: (n) => `Se encontraron ${n} posibles filas duplicadas.`,
    duplicateHelp:
      "Revisa cada coincidencia. Estas filas no se importarán a menos que las marques; se comparan los datos de la operación o el ID del bróker.",
    includeDuplicate: "Importar esta fila de todos modos",
    newDuplicates: (n) =>
      `Se detectaron ${n} posibles duplicados más durante la revisión. Compruébalos antes de importar.`,
    nothingSelected:
      "No hay operaciones nuevas seleccionadas. Marca los duplicados que quieras importar.",
    rejectedTitle: (n) => `${n} filas requieren revisión y no se importarán`,
    rejectedHelp:
      "Revisa estas filas. Para corregirlas, cancela la vista previa, edita el CSV original y vuelve a subirlo.",
    row: "Fila CSV",
    rawRow: "Fila original",
    reason: "Motivo",
    rejectionReasons: {
      unsupported_action: "Tipo o acción no compatible",
      unknown_action: "Acción desconocida — requiere revisión manual",
      missing_ticker: "Falta el ticker o símbolo del activo",
      unsupported_currency: "Moneda no compatible",
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
    totalOperations: "Righe CSV",
    eligibleBuys: "Acquisti idonei",
    eligibleSells: "Vendite idonee",
    excludedShort: "Escluse",
    duplicatesShort: "Duplicati",
    reviewShort: "Da verificare",
    t212PolicyNote:
      "Vengono importati solo acquisti e vendite di investimento. Pagamenti con carta, cashback e altri movimenti di liquidità vengono esclusi.",
    excludedTitle: (n) => `${n} operazioni non di investimento escluse`,
    excludedDetails: "Vedi righe escluse",
    action: "Azione",
    allDuplicatesNote:
      "Tutte le operazioni idonee in questo CSV sono già presenti in questo conto.",
    noEligibleTrades:
      "Non sono stati trovati acquisti o vendite di investimento idonei in questo CSV.",
    currencies: "Valute rilevate",
    fx: "convertite usando il cambio del fornitore alla data",
    fees: (columns) =>
      `${columns.length ? "Colonne dei costi rilevate: " + columns.join(", ") + ". " : "Nessuna colonna dei costi rilevata; ciò non conferma che il broker non abbia applicato commissioni. "}` +
      "Le commissioni rilevate vengono importate separatamente nella valuta indicata. Controlla l'anteprima; se manca la valuta, viene usata quella dell'operazione.",
    duplicates: (n) => `Trovate ${n} possibili righe duplicate.`,
    duplicateHelp:
      "Controlla ogni corrispondenza. Le righe non verranno importate a meno che non le selezioni; il confronto usa i dettagli della transazione o l'ID del broker.",
    includeDuplicate: "Importa comunque questa riga",
    newDuplicates: (n) =>
      `Durante il controllo sono stati rilevati altri ${n} possibili duplicati. Verificali prima di importare.`,
    nothingSelected:
      "Nessuna nuova transazione selezionata. Seleziona i duplicati che desideri importare.",
    rejectedTitle: (n) => `${n} righe richiedono verifica e non verranno importate`,
    rejectedHelp:
      "Controlla queste righe. Per correggerle, annulla l'anteprima, modifica il CSV originale e caricalo di nuovo.",
    row: "Riga CSV",
    rawRow: "Riga originale",
    reason: "Motivo",
    rejectionReasons: {
      unsupported_action: "Tipo o azione non supportati",
      unknown_action: "Azione sconosciuta — richiede verifica manuale",
      missing_ticker: "Ticker o simbolo dell'asset mancante",
      unsupported_currency: "Valuta non supportata",
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
