import { languageLocale, type Lang } from "@/lib/i18n";
import { attributionForRange, type AttributionDay } from "@/lib/performance-attribution";
import { trustCopy } from "@/lib/trust-i18n";
import { Skeleton } from "./ui/skeleton";
export function PerformanceAttribution({
  days,
  start,
  end,
  lang,
  currency,
  pending,
}: {
  days: AttributionDay[] | null | undefined;
  start: number;
  end: number;
  lang: Lang;
  currency: "USD" | "EUR";
  pending: boolean;
}) {
  const c = trustCopy[lang],
    result = attributionForRange(days, start, end);
  const money = (n: number) =>
    new Intl.NumberFormat(languageLocale(lang), {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
      signDisplay: "exceptZero",
    }).format(n);
  return (
    <section
      aria-busy={pending}
      className="analytics-surface min-w-0 rounded-2xl border border-border p-4 sm:p-5 lg:col-span-3"
    >
      <h2 className="font-display text-lg font-semibold">{c.attribution}</h2>
      {pending ? (
        <div
          role="status"
          aria-label={c.loading}
          className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {c.drivers.map((label) => (
            <Skeleton key={label} className="h-20 w-full" />
          ))}
        </div>
      ) : !result ? (
        <p className="mt-3 text-sm text-muted-foreground">{c.unavailable}</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Intl.DateTimeFormat(languageLocale(lang), {
              dateStyle: "medium",
              timeZone: "UTC",
            }).format(result.start)}{" "}
            —{" "}
            {new Intl.DateTimeFormat(languageLocale(lang), {
              dateStyle: "medium",
              timeZone: "UTC",
            }).format(result.end)}
          </p>
          <dl className="mt-4 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-4">
            {[result.price, result.dividends, result.fees, result.fx].map((value, index) => (
              <div key={c.drivers[index]} className="min-w-0 rounded-xl bg-secondary/50 p-3">
                <dt className="text-xs text-muted-foreground">{c.drivers[index]}</dt>
                <dd
                  className={`mt-2 break-words text-lg font-semibold tabular-nums ${value > 0 ? "text-success" : value < 0 ? "text-destructive" : ""}`}
                >
                  {money(value)}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm">
            <span>{c.net}</span>
            <strong className="tabular-nums">{money(result.total)}</strong>
          </div>
        </>
      )}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{c.method}</p>
      <p className="mt-2 text-xs text-muted-foreground">{c.taxNote}</p>
    </section>
  );
}
