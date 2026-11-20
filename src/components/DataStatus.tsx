import { quoteCoverage } from "@/lib/data-status";
import { languageLocale } from "@/lib/i18n";
import { normalizeTransactionsForSplits } from "@/lib/portfolio";
import { usePortfolio } from "@/lib/store";
import { transactionChronology } from "@/lib/transaction-chronology";
import { trustCopy } from "@/lib/trust-i18n";
import { Database } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const chronologyWarning = {
  en: "Some trades have uncertain execution order or insufficient recorded purchases. Affected financial figures are unavailable.",
  bg: "За някои сделки редът на изпълнение е неясен или липсват достатъчно записани покупки. Засегнатите финансови стойности не са налични.",
  de: "Bei einigen Transaktionen ist die Ausführungsreihenfolge unklar oder es fehlen erfasste Käufe. Betroffene Finanzwerte sind nicht verfügbar.",
  es: "Algunas operaciones tienen un orden de ejecución incierto o compras registradas insuficientes. Las cifras afectadas no están disponibles.",
  it: "Per alcune operazioni l’ordine di esecuzione è incerto o gli acquisti registrati sono insufficienti. I valori interessati non sono disponibili.",
};

export function DataStatus() {
  const p = usePortfolio();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const chronology = useMemo(
    () =>
      transactionChronology(
        normalizeTransactionsForSplits(p.transactions ?? [], p.corporateActions ?? []),
      ),
    [p.transactions, p.corporateActions],
  );
  useEffect(() => {
    setNow(Date.now());
  }, []);
  useEffect(() => {
    if (!open) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, [open]);
  if (!p.user || now === null) return null;
  const hasChronologyIssue =
    chronology.mixed.size || chronology.affectedFifo.size || chronology.invalid.size;
  if (!p.holdings.length && !hasChronologyIssue) return null;
  const c = trustCopy[p.lang];
  const status = quoteCoverage(
    p.holdings.map((h) => h.asset),
    now,
  );
  const incomplete = p.holdings.some((h) => !Number.isFinite(h.value));
  return (
    <>
      {!!hasChronologyIssue && (
        <p
          role="status"
          className="mb-4 rounded-xl border border-border px-3 py-2 text-xs text-amber-700 dark:text-amber-300"
        >
          {chronologyWarning[p.lang]}
        </p>
      )}
      {p.holdings.length > 0 && (
        <details
          open={open}
          onToggle={(event) => setOpen(event.currentTarget.open)}
          className="mb-4 min-w-0 rounded-xl border border-border/70 bg-card/70 px-3 py-2 text-xs"
        >
          <summary className="flex min-h-9 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Database size={14} aria-hidden />
              {c.data}
            </span>
            {[status.fresh, status.stale, status.missing].map((value, index) => (
              <span
                key={c.states[index]}
                className={
                  index && value ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"
                }
              >
                {c.states[index]}: <span className="tabular-nums">{value}</span>
              </span>
            ))}
          </summary>
          <div className="max-w-3xl space-y-2 border-t border-border pt-2 text-muted-foreground">
            {status.latest !== null && (
              <p>
                {c.last}:{" "}
                {new Intl.DateTimeFormat(languageLocale(p.lang), {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(status.latest)}
              </p>
            )}
            <p role={incomplete ? "status" : undefined}>{incomplete ? c.partial : c.complete}</p>
            {status.manual > 0 && <p>{c.manual}</p>}
            {(refreshFailed || p.priceNote === "error") && <p role="alert">{c.quoteFailure}</p>}
            {open && (
              <ul className="space-y-1">
                {p.holdings
                  .filter((h) => ["stock", "etf", "crypto"].includes(h.asset.type))
                  .map((h) => {
                    const coverage = quoteCoverage([h.asset], now);
                    return (
                      <li key={h.asset.id}>
                        {h.asset.symbol}: {c.states[coverage.fresh ? 0 : coverage.stale ? 1 : 2]}
                        {h.asset.quoteDiagnostic ? (
                          <span className="ml-1">
                            · {c.quoteDiagnostics[h.asset.quoteDiagnostic]}
                          </span>
                        ) : (
                          h.asset.quoteRefreshFailed && (
                            <span className="ml-1">· {c.quoteFailure}</span>
                          )
                        )}
                      </li>
                    );
                  })}
              </ul>
            )}
            <button
              type="button"
              disabled={refreshing}
              aria-busy={refreshing}
              onClick={async () => {
                setRefreshing(true);
                setRefreshFailed(false);
                try {
                  await p.reload();
                  setNow(Date.now());
                } catch {
                  setRefreshFailed(true);
                } finally {
                  setRefreshing(false);
                }
              }}
              className="min-h-11 rounded-lg border border-border px-3 font-semibold text-primary hover:bg-secondary disabled:opacity-60"
            >
              {c.retry}
            </button>
          </div>
        </details>
      )}
    </>
  );
}
