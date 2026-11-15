import { benchmarkCopy } from "@/lib/benchmark-i18n";
import type { Lang } from "@/lib/i18n";

export function PortfolioComparisonLegend({
  lang,
  indexName,
  portfolioValue,
  indexValue,
  differenceValue,
  portfolioColor,
}: {
  lang: Lang;
  indexName: string;
  portfolioValue: string;
  indexValue: string;
  differenceValue: string;
  portfolioColor: string;
}) {
  const c = benchmarkCopy[lang];
  return (
    <div className="dashboard-chart-legend mt-4 space-y-2 text-sm leading-relaxed">
      <dl className="flex flex-wrap gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <dt className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block w-4 shrink-0 border-t-[3px]"
              style={{ borderColor: portfolioColor }}
            />
            {c.portfolio}
          </dt>
          <dd className="font-semibold tabular-nums">{portfolioValue}</dd>
        </div>
        <div className="flex flex-wrap items-baseline gap-2">
          <dt className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block w-4 shrink-0 border-t-[3px] border-dashed border-chart-2"
            />
            {indexName}
          </dt>
          <dd className="font-semibold tabular-nums">{indexValue}</dd>
        </div>
        <div className="flex flex-wrap items-baseline gap-2">
          <dt className="text-muted-foreground">{c.difference}</dt>
          <dd className="font-semibold tabular-nums">{differenceValue}</dd>
        </div>
      </dl>
      <p className="text-xs leading-relaxed text-muted-foreground">{c.priceReturn}</p>
    </div>
  );
}
