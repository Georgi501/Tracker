import { quoteCoverage } from "@/lib/data-status";
import { languageLocale } from "@/lib/i18n";
import { usePortfolio } from "@/lib/store";
import { trustCopy } from "@/lib/trust-i18n";
import { Database } from "lucide-react";
import { useEffect, useState } from "react";
export function DataStatus() {
  const p = usePortfolio();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  if (!p.user || !p.holdings.length || now === null) return null;
  const c = trustCopy[p.lang];
  const status = quoteCoverage(
    p.holdings.map((h) => h.asset),
    now,
  );
  const incomplete = p.holdings.some((h) => !Number.isFinite(h.value));
  return (
    <details className="mb-4 min-w-0 rounded-xl border border-border/70 bg-card/70 px-3 py-2 text-xs">
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
        <ul className="space-y-1">
          {p.holdings
            .filter((h) => ["stock", "etf", "crypto"].includes(h.asset.type))
            .map((h) => {
              const coverage = quoteCoverage([h.asset], now);
              return (
                <li key={h.asset.id}>
                  {h.asset.symbol}: {c.states[coverage.fresh ? 0 : coverage.stale ? 1 : 2]}
                </li>
              );
            })}
        </ul>
        <button
          type="button"
          disabled={refreshing}
          aria-busy={refreshing}
          onClick={async () => {
            setRefreshing(true);
            setRefreshFailed(false);
            try {
              await p.reload();
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
  );
}
