import { cc } from "@/lib/community";

export interface SnapshotRow {
  symbol: string;
  name: string;
  type: string;
  weight: number | null;
  quantity: number | null;
  cost_usd: number | null;
}

/** Renders only the fields the owner chose to share; absent fields are never inferred. */
export function PortfolioSnapshot({ rows, lang }: { rows: SnapshotRow[]; lang: string }) {
  const c = cc(lang);
  const nf = new Intl.NumberFormat(lang, { maximumFractionDigits: 4 });
  const usd = new Intl.NumberFormat(lang, { style: "currency", currency: "USD" });
  return (
    <ul className="space-y-2">
      {rows.map((w) => (
        <li key={w.symbol}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
            <span className="min-w-0">
              <b>{w.symbol}</b> <span className="text-muted-foreground">{w.name}</span>
            </span>
            <span className="flex items-baseline gap-3 tabular-nums">
              {w.quantity != null && (
                <span className="text-xs text-muted-foreground">
                  {c.qty}: {nf.format(Number(w.quantity))}
                </span>
              )}
              {w.cost_usd != null && (
                <span className="text-xs text-muted-foreground">
                  {c.cost}: {usd.format(Number(w.cost_usd))}
                </span>
              )}
              {w.weight != null && <b>{Number(w.weight).toFixed(1)}%</b>}
            </span>
          </div>
          {w.weight != null && (
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="bg-brand-gradient h-full rounded-full"
                style={{ width: `${Math.min(100, Number(w.weight))}%` }}
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
