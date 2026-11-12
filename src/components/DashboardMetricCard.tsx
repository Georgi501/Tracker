import { memo, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Info } from "lucide-react";
import { MetricSurface } from "./DashboardMotion";
import { Skeleton } from "./ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export const DashboardMetricCard = memo(function DashboardMetricCard({
  label,
  help,
  value,
  sub,
  n,
  pending = false,
}: {
  label: string;
  help: string;
  value: ReactNode;
  sub?: string;
  n?: number;
  pending?: boolean;
}) {
  const numeric = n !== undefined && Number.isFinite(n);
  const directional = numeric && n !== 0;
  const valueTone = numeric ? (n! >= 0 ? "text-success" : "text-destructive") : "";
  const positive = directional && n! > 0;
  return (
    <MetricSurface
      className={`dashboard-metric analytics-surface relative min-h-[92px] min-w-0 overflow-hidden rounded-2xl border border-border/70 p-3 sm:min-h-[104px] sm:p-4 ${directional ? (positive ? "metric-positive" : "metric-negative") : ""}`}
    >
      <dl aria-busy={pending}>
        <dt className="flex min-h-6 items-center gap-1.5 text-[10px] font-semibold uppercase leading-snug tracking-[0.08em] text-muted-foreground sm:text-[11px]">
          <span className="min-w-0 flex-1">{label}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`${label}: ${help}`}
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Info size={13} aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-64 text-left normal-case tracking-normal">
              {help}
            </TooltipContent>
          </Tooltip>
        </dt>
        <dd className="numeric-display mt-1 min-h-6 break-words text-base font-semibold tracking-tight sm:text-xl">
          {pending ? (
            <Skeleton className="h-6 w-24 max-w-full" />
          ) : !numeric ? (
            value
          ) : (
            <span className={valueTone}>{value}</span>
          )}
        </dd>
        {sub && (
          <dd className="mt-1 flex min-h-4 items-center gap-1 text-[11px] font-semibold tabular-nums">
            {pending ? (
              <Skeleton className="h-3 w-16" />
            ) : (
              <>
                {directional &&
                  (positive ? (
                    <ArrowUpRight aria-hidden size={13} className="text-success" />
                  ) : (
                    <ArrowDownRight aria-hidden size={13} className="text-destructive" />
                  ))}
                {numeric ? <span className={valueTone}>{sub}</span> : sub}
              </>
            )}
          </dd>
        )}
      </dl>
    </MetricSurface>
  );
});

export function DashboardAnalyticsSkeleton() {
  return (
    <>
      <div
        aria-hidden
        className="analytics-surface min-h-[480px] rounded-2xl sm:min-h-[520px] border border-border/70 p-5 lg:col-span-2"
      >
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-4 h-10 w-48" />
        <Skeleton className="mt-8 h-56 w-full" />
        <div className="mt-6 flex gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-12 rounded-full" />
          ))}
        </div>
      </div>
      <div aria-hidden className="grid grid-cols-2 gap-2 sm:grid-cols-1 sm:gap-2.5">
        {[0, 1].map((i) => (
          <MetricSkeleton key={i} />
        ))}
        {[0, 1].map((group) => (
          <div key={group} className="contents sm:grid sm:grid-cols-2 sm:gap-2.5">
            {[0, 1].map((i) => (
              <MetricSkeleton key={i} />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function MetricSkeleton() {
  return (
    <div className="analytics-surface min-h-[92px] rounded-2xl border border-border/70 p-3 sm:min-h-[104px] sm:p-4">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-4 h-6 w-24 max-w-full" />
    </div>
  );
}
