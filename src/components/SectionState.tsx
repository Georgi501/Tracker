import type { ReactNode } from "react";
import { Search, Users, MessageCircle, Layers3 } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
const icons = { search: Search, community: Users, messages: MessageCircle, portfolio: Layers3 };
export function ListSkeleton({ label, rows = 3 }: { label: string; rows?: number }) {
  return (
    <div role="status" aria-busy="true" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          aria-hidden
          className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4"
        >
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  action,
  icon = "portfolio",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: keyof typeof icons;
}) {
  const Icon = icons[icon];
  return (
    <section className="analytics-surface flex min-h-52 flex-col items-center justify-center rounded-2xl border border-border/70 px-5 py-8 text-center">
      <span
        aria-hidden
        className="mb-4 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"
      >
        <Icon size={23} />
      </span>
      <h2 className="font-display text-base font-semibold">{title}</h2>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </section>
  );
}
