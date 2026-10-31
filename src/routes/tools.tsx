import { SnapshotCard } from "@/components/SnapshotCard";
import { RecurringReminders } from "@/components/RecurringReminders";
import { PortfolioReview, DataQuality, proToolsCopy } from "@/components/ProTools";
import { CurveSilhouette, FireCalculator, ProGate } from "@/components/ProFeatures";
import { DcfCalculator, dcfCopy } from "@/components/DcfCalculator";
import { ThesisCheck, thesisCopy } from "@/components/ThesisCheck";
import { proCopy } from "@/lib/pro-i18n";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Card, Delta } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { pct, usePortfolio } from "@/lib/store";
import { toolsCopy } from "@/lib/tools-i18n";
import {
  classValues,
  exportCsv,
  fifoTaxReport,
  rebalance,
  riskMetrics,
  taxReportCsv,
} from "@/lib/tools";
import { extrasCopy } from "@/lib/extras-i18n";
import {
  alertTriggered,
  readAlerts as readAlertsNow,
  readWatchlist,
  writeAlerts,
  writeWatchlist,
  SYMBOL_RE,
} from "@/lib/watchlist";
import { useWatchState } from "@/components/AssetExtras";
import { Bell } from "lucide-react";
import { getPortfolioHistory } from "@/lib/history.functions";
import { marketQuote } from "@/lib/market.functions";
import { ConcentrationCard, GoalsCard } from "@/components/Insights";
import { insightsCopy } from "@/lib/insights-i18n";
import { MARKET_ASSETS } from "@/lib/market-search";
import { parsePortfolioBackup } from "@/lib/backup";
import {
  detectBrokerFormat,
  parseBrokerCsv,
  rejectedCsvRows,
  splitDuplicates,
  type ImportedTx,
} from "@/lib/csv-import";
import { type Lang } from "@/lib/i18n";
import { toast } from "sonner";
import { notifyImportWithUndo } from "@/lib/import-undo";
const CRYPTO_SYMBOLS = MARKET_ASSETS.filter((a) => a.type === "crypto").map((a) => a.symbol);

export const Route = createFileRoute("/tools")({
  head: () => ({
    meta: [
      { title: "Tools — Capispot Rebalancing, FIFO tax report & risk" },
      {
        name: "description",
        content:
          "Rebalancing calculator, FIFO realized gains report, risk metrics, watchlist and portfolio export.",
      },
      { property: "og:title", content: "Investor tools — Capispot" },
      {
        property: "og:description",
        content: "Rebalance, report realized gains with FIFO, measure risk and export your data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Tools,
});

const CLASSES = ["stock", "etf", "crypto", "bond", "cash", "realEstate"] as const;

function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

const BACKUP_COPY: Record<
  Lang,
  {
    description: string;
    restore: string;
    restoreNote: string;
    csvFormat: string;
    csvRejected: (count: number) => string;
    empty: string;
    invalid: string;
    allDuplicates: string;
    preview: (fresh: number, duplicates: number) => string;
    confirm: string;
    cancel: string;
    restoring: string;
    restored: (count: number) => string;
    failed: string;
    signIn: string;
  }
> = {
  en: {
    description: "Exports contain transaction details. Store backup files securely.",
    restore: "Restore from backup",
    restoreNote:
      "Choose a Capispot JSON backup or generic transaction CSV. Existing data is not overwritten.",
    csvFormat: "Choose a generic transaction CSV or a Capispot JSON backup.",
    csvRejected: (count) =>
      `${count} CSV rows could not be read. Review the file before restoring.`,
    empty: "The backup contains no transactions to restore.",
    invalid: "The backup file could not be read.",
    allDuplicates: "All backup transactions already exist in this portfolio.",
    preview: (fresh, duplicates) =>
      `${fresh} transactions will be added; ${duplicates} duplicates will be skipped. Existing data will not be overwritten.`,
    confirm: "Add transactions",
    cancel: "Cancel",
    restoring: "Restoring…",
    restored: (count) => `${count} transactions restored.`,
    failed: "Backup restore failed.",
    signIn: "Sign in to restore a backup.",
  },
  bg: {
    description: "Експортът съдържа подробности за сделките. Съхранявай архивите сигурно.",
    restore: "Възстанови от архив",
    restoreNote:
      "Избери JSON архив от Capispot или общ CSV със сделки. Съществуващите данни няма да бъдат презаписани.",
    csvFormat: "Избери общ CSV със сделки или JSON архив от Capispot.",
    csvRejected: (count) =>
      `${count} CSV реда не могат да бъдат прочетени. Провери файла преди възстановяване.`,
    empty: "Архивът няма сделки за възстановяване.",
    invalid: "Архивът не може да бъде прочетен.",
    allDuplicates: "Всички сделки от архива вече съществуват в това портфолио.",
    preview: (fresh, duplicates) =>
      `Ще се добавят ${fresh} сделки; ${duplicates} дубликата ще бъдат пропуснати. Съществуващите данни няма да бъдат презаписани.`,
    confirm: "Добави сделките",
    cancel: "Отказ",
    restoring: "Възстановяване…",
    restored: (count) => `Възстановени са ${count} сделки.`,
    failed: "Възстановяването от архива не успя.",
    signIn: "Влез в профила си, за да възстановиш архив.",
  },
  de: {
    description: "Exporte enthalten Transaktionsdetails. Bewahre Sicherungsdateien sicher auf.",
    restore: "Aus Sicherung wiederherstellen",
    restoreNote:
      "Capispot-JSON-Sicherung oder generische Transaktions-CSV wählen. Bestehende Daten werden nicht überschrieben.",
    csvFormat: "Generische Transaktions-CSV oder Capispot-JSON-Sicherung wählen.",
    csvRejected: (count) =>
      `${count} CSV-Zeilen konnten nicht gelesen werden. Prüfe die Datei vor der Wiederherstellung.`,
    empty: "Die Sicherung enthält keine wiederherzustellenden Transaktionen.",
    invalid: "Die Sicherungsdatei konnte nicht gelesen werden.",
    allDuplicates: "Alle Transaktionen aus der Sicherung sind bereits vorhanden.",
    preview: (fresh, duplicates) =>
      `${fresh} Transaktionen werden hinzugefügt; ${duplicates} Duplikate übersprungen. Bestehende Daten bleiben unverändert.`,
    confirm: "Transaktionen hinzufügen",
    cancel: "Abbrechen",
    restoring: "Wiederherstellung…",
    restored: (count) => `${count} Transaktionen wiederhergestellt.`,
    failed: "Wiederherstellung fehlgeschlagen.",
    signIn: "Melde dich an, um eine Sicherung wiederherzustellen.",
  },
  es: {
    description:
      "Las exportaciones contienen detalles de las operaciones. Guarda las copias de forma segura.",
    restore: "Restaurar desde copia",
    restoreNote:
      "Elige una copia JSON de Capispot o un CSV genérico de operaciones. No se sobrescribirán datos.",
    csvFormat: "Elige un CSV genérico de operaciones o una copia JSON de Capispot.",
    csvRejected: (count) =>
      `No se pudieron leer ${count} filas CSV. Revisa el archivo antes de restaurar.`,
    empty: "La copia no contiene operaciones para restaurar.",
    invalid: "No se pudo leer el archivo de copia.",
    allDuplicates: "Todas las operaciones de la copia ya existen en esta cartera.",
    preview: (fresh, duplicates) =>
      `Se añadirán ${fresh} operaciones y se omitirán ${duplicates} duplicados. Los datos existentes no cambiarán.`,
    confirm: "Añadir operaciones",
    cancel: "Cancelar",
    restoring: "Restaurando…",
    restored: (count) => `Se restauraron ${count} operaciones.`,
    failed: "No se pudo restaurar la copia.",
    signIn: "Inicia sesión para restaurar una copia.",
  },
  it: {
    description:
      "Le esportazioni contengono i dettagli delle operazioni. Conserva i backup in modo sicuro.",
    restore: "Ripristina da backup",
    restoreNote:
      "Scegli un backup JSON Capispot o un CSV generico. I dati esistenti non verranno sovrascritti.",
    csvFormat: "Scegli un CSV generico o un backup JSON Capispot.",
    csvRejected: (count) =>
      `${count} righe CSV non sono state lette. Controlla il file prima di ripristinare.`,
    empty: "Il backup non contiene operazioni da ripristinare.",
    invalid: "Impossibile leggere il file di backup.",
    allDuplicates: "Tutte le operazioni del backup sono già presenti in questo portafoglio.",
    preview: (fresh, duplicates) =>
      `Verranno aggiunte ${fresh} operazioni e ignorati ${duplicates} duplicati. I dati esistenti non verranno modificati.`,
    confirm: "Aggiungi operazioni",
    cancel: "Annulla",
    restoring: "Ripristino…",
    restored: (count) => `Ripristinate ${count} operazioni.`,
    failed: "Ripristino del backup non riuscito.",
    signIn: "Accedi per ripristinare un backup.",
  },
};

function Tools() {
  const p = usePortfolio();
  const c = toolsCopy[p.lang];
  const [restore, setRestore] = useState<{ rows: ImportedTx[]; duplicates: number } | null>(null);
  const [restoring, setRestoring] = useState(false);
  const backupCopy = BACKUP_COPY[p.lang];
  const selectBackup = async (file: File) => {
    try {
      const contents = await file.text();
      let rows: ImportedTx[];
      if (file.name.toLowerCase().endsWith(".json")) {
        rows = parsePortfolioBackup(JSON.parse(contents));
      } else {
        const format = detectBrokerFormat(contents);
        if (format !== "generic") throw new Error(backupCopy.csvFormat);
        const rejected = rejectedCsvRows(format, contents);
        rows = parseBrokerCsv(format, contents);
        if (rejected.length) throw new Error(backupCopy.csvRejected(rejected.length));
      }
      if (!rows.length) throw new Error(backupCopy.empty);
      const assetsById = new Map(p.assets.map((asset) => [asset.id, asset.symbol]));
      const existing = p.transactions.map((transaction) => ({
        symbol: assetsById.get(transaction.assetId) ?? "",
        kind: transaction.kind,
        date: transaction.date,
        quantity: transaction.quantity,
        price: transaction.price,
        fee: transaction.fee ?? 0,
      }));
      const normalized = await p.normalizeImportRows(rows);
      const split = splitDuplicates(rows, existing, normalized);
      if (!split.fresh.length) throw new Error(backupCopy.allDuplicates);
      setRestore({ rows: split.fresh, duplicates: split.duplicates.length });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : backupCopy.invalid);
      setRestore(null);
    }
  };
  const restoreBackup = async () => {
    if (!restore) return;
    setRestoring(true);
    try {
      const result = await p.importTransactions(null, restore.rows);
      notifyImportWithUndo(
        backupCopy.restored(result.count),
        result.transactionIds,
        result.createdAssetIds,
        p.lang,
        p.undoImport,
      );
      setRestore(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : backupCopy.failed);
    } finally {
      setRestoring(false);
    }
  };
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <h1 className="font-display text-2xl font-bold lg:col-span-2">{c.tools}</h1>
      <ProGate
        title={proCopy[p.lang].fire}
        desc={proCopy[p.lang].fireDesc}
        preview={<CurveSilhouette />}
      >
        <FireCalculator />
      </ProGate>
      <ProGate
        title={dcfCopy[p.lang].intrinsic + " (DCF)"}
        desc={dcfCopy[p.lang].gateDescription}
        preview={<CurveSilhouette />}
      >
        <DcfCalculator />
      </ProGate>
      <ProGate
        title={thesisCopy[p.lang].title}
        desc={thesisCopy[p.lang].desc}
        preview={<CurveSilhouette />}
      >
        <ThesisCheck />
      </ProGate>
      <ProGate
        title={proToolsCopy[p.lang].review}
        desc={proToolsCopy[p.lang].reviewDesc}
        preview={<CurveSilhouette />}
      >
        <PortfolioReview />
      </ProGate>
      <ProGate
        title={p.lang === "bg" ? "Споделима снимка на портфолиото" : "Shareable portfolio snapshot"}
        desc={
          p.lang === "bg"
            ? "Красива картичка само с проценти по класове активи."
            : "A clean card with asset-class percentages only."
        }
        preview={<CurveSilhouette />}
      >
        <SnapshotCard />
      </ProGate>
      {p.user && (
        <Card className="lg:col-span-2">
          <h2 className="font-display mb-3 font-semibold">{proToolsCopy[p.lang].quality}</h2>
          <DataQuality />
        </Card>
      )}
      <GoalsCard />
      <ProGate title={c.rebalance} desc={c.rebalanceHint} preview={<CurveSilhouette />}>
        <Rebalance />
      </ProGate>
      <Risk />
      <ConcentrationCard />
      <RecurringReminders />
      <ProGate title={c.tax} desc={c.realized} preview={<CurveSilhouette />}>
        <Tax />
      </ProGate>
      <div className="grid gap-5">
        <Watchlist />
        <Card>
          <h3 className="font-display mb-3 font-semibold">{c.exportTitle}</h3>
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            {backupCopy.description}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={!p.transactions.length}
              onClick={() =>
                download("folio-transactions.csv", exportCsv(p.assets, p.transactions), "text/csv")
              }
            >
              {c.exportCsv}
            </Button>
            <Button
              variant="secondary"
              disabled={!p.transactions.length}
              onClick={() =>
                download(
                  "folio-backup.json",
                  JSON.stringify(
                    {
                      exportedAt: new Date().toISOString(),
                      assets: p.assets,
                      transactions: p.transactions,
                    },
                    null,
                    2,
                  ),
                  "application/json",
                )
              }
            >
              {c.exportJson}
            </Button>
            <Button
              variant="secondary"
              disabled={!p.transactions.length}
              onClick={() => window.print()}
            >
              PDF
            </Button>
          </div>
          <div className="mt-4 border-t border-border pt-4">
            {p.user ? (
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary">
                {backupCopy.restore}
                <input
                  type="file"
                  accept=".json,.csv,application/json,text/csv"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void selectBackup(file);
                    event.target.value = "";
                  }}
                />
              </label>
            ) : (
              <p className="text-sm text-muted-foreground">{backupCopy.signIn}</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">{backupCopy.restoreNote}</p>
            {restore && (
              <div className="mt-3 rounded-xl border border-border bg-background/70 p-3">
                <p className="text-sm">
                  {backupCopy.preview(restore.rows.length, restore.duplicates)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button disabled={restoring} onClick={() => void restoreBackup()}>
                    {restoring ? backupCopy.restoring : backupCopy.confirm}
                  </Button>
                  <Button variant="secondary" disabled={restoring} onClick={() => setRestore(null)}>
                    {backupCopy.cancel}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Rebalance() {
  const p = usePortfolio();
  const c = toolsCopy[p.lang];
  const current = classValues(p.holdings);
  const [targets, setTargets] = useState<Record<string, number>>({
    stock: 30,
    etf: 50,
    crypto: 10,
    cash: 10,
    realEstate: 0,
  });
  const [cash, setCash] = useState(1000);
  const plan = rebalance(current, targets, cash);
  const sum = Object.values(targets).reduce((s, v) => s + v, 0);
  return (
    <Card>
      <h3 className="font-display font-semibold">{c.rebalance}</h3>
      <p className="mb-3 text-xs text-muted-foreground">{c.rebalanceHint}</p>
      <label className="mb-3 flex items-center gap-2 text-sm">
        {c.newCash}
        <input
          type="number"
          min={0}
          value={cash}
          onChange={(e) => setCash(Number(e.target.value))}
          className="w-32 rounded-md border border-input bg-background px-2 py-1"
        />
      </label>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th className="py-1 font-medium" />
            <th className="font-medium">{c.target}</th>
            <th className="text-right font-medium">{c.current}</th>
            <th className="text-right font-medium">{c.invest}</th>
          </tr>
        </thead>
        <tbody>
          {CLASSES.map((k) => (
            <tr key={k} className="border-t border-border">
              <td className="py-2">{p.t(k)}</td>
              <td>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={targets[k] ?? 0}
                  aria-label={`${p.t(k)} ${c.target}`}
                  onChange={(e) => setTargets({ ...targets, [k]: Number(e.target.value) })}
                  className="w-16 rounded-md border border-input bg-background px-2 py-1"
                />
              </td>
              <td className="text-right">{p.money(current[k] ?? 0)}</td>
              <td className="text-right font-semibold">{p.money(plan[k] ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={`mt-2 text-xs ${sum === 100 ? "text-muted-foreground" : "text-destructive"}`}>
        {c.targetSum}: {sum}%
      </p>
    </Card>
  );
}

function Risk() {
  const p = usePortfolio();
  const c = toolsCopy[p.lang];
  const historyFn = useServerFn(getPortfolioHistory);
  const h = useQuery({
    queryKey: ["portfolio-history", p.user?.id, p.transactions, "ALL", p.currency],
    queryFn: () => historyFn({ data: { period: "ALL", currency: p.currency } }),
    enabled: !!p.user,
    staleTime: 60000,
  });
  const m = h.data ? riskMetrics(h.data.points) : null;
  return (
    <Card>
      <h3 className="font-display font-semibold">{c.risk}</h3>
      <p className="mb-3 text-xs text-muted-foreground">{c.riskHint}</p>
      {!p.user ? (
        <p className="text-sm text-muted-foreground">{c.signInNeeded}</p>
      ) : !m ? (
        <p className="text-sm text-muted-foreground">{h.isFetching ? "…" : c.riskUnavailable}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label={c.volatility} value={pct(m.volatility, false)} />
          <Metric label={c.maxDrawdown} value={pct(m.maxDrawdown, false)} />
          <Metric label={c.sharpe} value={m.sharpe.toFixed(2)} />
          <Metric label={insightsCopy[p.lang].sortino} value={m.sortino.toFixed(2)} />
        </div>
      )}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-bold">{value}</p>
    </div>
  );
}

function Tax() {
  const p = usePortfolio();
  const c = toolsCopy[p.lang];
  const years = useMemo(() => fifoTaxReport(p.transactions), [p.transactions]);
  return (
    <Card>
      <h3 className="font-display mb-3 font-semibold">{c.tax}</h3>
      {!years.length ? (
        <p className="text-sm text-muted-foreground">{c.noSales}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1 font-medium">{c.year}</th>
                <th className="text-right font-medium">{c.proceeds}</th>
                <th className="text-right font-medium">{c.costBasis}</th>
                <th className="text-right font-medium">{c.realized}</th>
                <th className="text-right font-medium">{c.dividendsReceived}</th>
              </tr>
            </thead>
            <tbody>
              {years.map((y) => (
                <tr key={y.year} className="border-t border-border">
                  <td className="py-2 font-semibold">{y.year}</td>
                  <td className="text-right">{p.money(y.proceeds)}</td>
                  <td className="text-right">{p.money(y.cost)}</td>
                  <td className="text-right">
                    <Delta value={y.realized}>{p.money(y.realized, { sign: true })}</Delta>
                  </td>
                  <td className="text-right">{p.money(y.dividends)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {years.length > 0 && (
        <div className="mt-3 space-y-1">
          <Button
            variant="secondary"
            className="h-11 w-full sm:w-auto"
            onClick={() =>
              download(
                `folio-tax-report-${new Date().toISOString().slice(0, 10)}.csv`,
                "\uFEFF" + taxReportCsv(years, p.assets),
                "text/csv;charset=utf-8",
              )
            }
          >
            {extrasCopy[p.lang].taxExport}
          </Button>
          <p className="text-xs text-muted-foreground">{extrasCopy[p.lang].taxNote}</p>
        </div>
      )}
    </Card>
  );
}

function Watchlist() {
  const p = usePortfolio();
  const c = toolsCopy[p.lang];
  const { list, alerts } = useWatchState();
  const [input, setInput] = useState("");
  const add = () => {
    const s = input.trim().toUpperCase();
    if (SYMBOL_RE.test(s) && !list.includes(s)) writeWatchlist([...list, s].slice(0, 30));
    setInput("");
  };
  return (
    <Card>
      <h3 className="font-display mb-3 font-semibold">{c.watchlist}</h3>
      <form
        className="mb-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={c.watchPlaceholder}
          className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
        />
        <Button type="submit" className="h-11">
          {c.watchAdd}
        </Button>
      </form>
      {!list.length ? (
        <p className="text-sm text-muted-foreground">{c.watchEmpty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {list.map((s) => (
            <WatchRow
              key={s}
              symbol={s}
              onRemove={() => {
                writeWatchlist(readWatchlist().filter((x) => x !== s));
                writeAlerts(readAlertsNow().filter((a) => a.symbol !== s));
              }}
            />
          ))}
        </ul>
      )}
      {!alerts.length && (
        <p className="mt-2 text-xs text-muted-foreground">{extrasCopy[p.lang].alertNone}</p>
      )}
      {alerts.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {
            {
              en: "Alerts are checked while the app is open; they do not run in the background.",
              bg: "Известията се проверяват, докато приложението е отворено; не работят във фонов режим.",
              de: "Alarme werden geprüft, solange die App geöffnet ist; nicht im Hintergrund.",
              es: "Las alertas se comprueban mientras la aplicación está abierta; no funcionan en segundo plano.",
              it: "Gli avvisi vengono controllati mentre l'app è aperta; non funzionano in background.",
            }[p.lang]
          }
        </p>
      )}
    </Card>
  );
}

function WatchRow({ symbol, onRemove }: { symbol: string; onRemove: () => void }) {
  const p = usePortfolio();
  const c = toolsCopy[p.lang];
  const quoteFn = useServerFn(marketQuote);
  const type = CRYPTO_SYMBOLS.includes(symbol) ? "crypto" : "stock";
  const q = useQuery({
    queryKey: ["watch-quote", symbol],
    queryFn: () => quoteFn({ data: { symbol, type } }),
    refetchInterval: 60000,
  });
  const quote = q.data?.quote;
  const x = extrasCopy[p.lang];
  const mine = useWatchState().alerts.filter((a) => a.symbol === symbol);
  return (
    <li className="py-2 text-sm">
      <div className="flex items-center gap-3">
        <span className="flex-1 font-semibold">
          {symbol}
          {type === "crypto" && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">{c.crypto}</span>
          )}
        </span>
        <span>
          {quote
            ? `${quote.price.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${quote.currency}`
            : q.isFetching
              ? "…"
              : c.unavailable}
        </span>
        {quote?.change != null && <Delta value={quote.change}>{pct(quote.change)}</Delta>}
        <button
          type="button"
          aria-label={`Remove ${symbol}`}
          onClick={onRemove}
          className="text-muted-foreground hover:text-foreground"
        >
          <X size={14} />
        </button>
      </div>
      {mine.map((a, i) => {
        const hit = alertTriggered(a, quote?.price);
        return (
          <p
            key={i}
            className={`mt-1 flex items-center gap-1 text-xs ${hit ? "font-semibold text-success" : "text-muted-foreground"}`}
          >
            <Bell size={12} />
            {a.direction === "above" ? x.alertAbove : x.alertBelow} {a.target} ·{" "}
            {hit ? x.alertHit : x.alertWaiting}
            <button
              type="button"
              aria-label="Remove alert"
              className="ml-1"
              onClick={() =>
                writeAlerts(
                  readAlertsNow().filter(
                    (b) =>
                      !(
                        b.symbol === a.symbol &&
                        b.direction === a.direction &&
                        b.target === a.target
                      ),
                  ),
                )
              }
            >
              <X size={12} />
            </button>
          </p>
        );
      })}
    </li>
  );
}
