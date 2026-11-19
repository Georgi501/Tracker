import {
  FOCUS_LABELS,
  type InvestmentFocusId,
  type PortfolioFocusSummary,
} from "@/lib/investment-focus";
import { languageLocale, type Lang } from "@/lib/i18n";
import { FOCUS_COPY } from "@/lib/investment-focus-copy";
import { ChevronDown, Info } from "lucide-react";
import { useId, useState } from "react";

export function InvestmentFocusDisclosure({
  summary,
  lang,
}: {
  summary: PortfolioFocusSummary;
  lang: Lang;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (summary.totalValue <= 0) return null;
  const copy = FOCUS_COPY[lang];
  const pct = (v: number) =>
    new Intl.NumberFormat(languageLocale(lang), {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(v / summary.totalValue);

  return (
    <div className="mt-3 border-t border-border/70 pt-2.5 text-xs">
      <p
        className="mb-2 flex items-start gap-1.5 rounded-lg bg-secondary/50 px-2.5 py-2 text-[11px] leading-snug text-muted-foreground"
        data-testid="focus-notice"
      >
        <Info size={13} aria-hidden="true" className="mt-px shrink-0" />
        <span>{copy.notice}</span>
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 py-1 font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
        >
          <span>{copy.toggle}</span>
          <ChevronDown
            size={13}
            aria-hidden="true"
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {summary.fundMandateValue + summary.companyValue > 0 && (
            <span>
              {copy.mandateLabel}: {pct(summary.fundMandateValue + summary.companyValue)}
            </span>
          )}
          {summary.unclassifiedValue > 0 && (
            <span className="font-medium text-amber-600 dark:text-amber-400">
              {copy.unclassifiedLabel}: {pct(summary.unclassifiedValue)}
            </span>
          )}
        </div>
      </div>
      {open && (
        <div
          id={id}
          className="mt-2 space-y-2 rounded-xl border border-border/70 bg-secondary/35 p-3 text-[11px] leading-relaxed text-muted-foreground"
        >
          <p className="text-foreground/90">{copy.method}</p>
          {summary.foreignIssuersPossibleAssets.length > 0 && (
            <p>{copy.foreign(summary.foreignIssuersPossibleAssets.join(", "))}</p>
          )}
          {summary.unclassifiedAssets.length > 0 && (
            <p className="text-amber-700 dark:text-amber-400">
              {copy.unclassified(summary.unclassifiedAssets.join(", "))}
            </p>
          )}
          <ul className="space-y-1 border-t border-border/60 pt-2">
            {summary.details.map((d) => (
              <li key={d.symbol} className="flex flex-wrap items-center justify-between gap-x-2">
                <span className="font-mono font-semibold text-foreground">{d.symbol}</span>
                <span className="min-w-0 text-right">
                  {FOCUS_LABELS[lang][d.focus.focus]}
                  {d.focus.benchmark ? ` · ${d.focus.benchmark}` : ""}
                  {d.focus.verification
                    ? ` · ${d.focus.verification === "web-checked" ? copy.verified : copy.catalogOnly}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
