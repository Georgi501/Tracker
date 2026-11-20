import {
  computePortfolioBaseMetrics,
  formatBaseCurrencyAmount,
  holdingsInBaseCurrency,
} from "@/lib/base-currency-accounting";
import { calculatePortfolioGeographicExposure } from "@/lib/geographic-exposure";
import { languageLocale } from "@/lib/i18n";
import {
  calculatePortfolioInvestmentFocus,
  FOCUS_LABELS,
  geoDisplayRows,
  neutralAllocationNames,
} from "@/lib/investment-focus";
import { FOCUS_COPY } from "@/lib/investment-focus-copy";
import { useRef, useState, type KeyboardEvent } from "react";
import { usePortfolio } from "@/lib/store";
import { groupBy } from "@/lib/portfolio";
import { AllocationBreakdown } from "./AllocationBreakdown";
import { Card } from "./AppShell";
import { GeoExposureDisclosure } from "./GeoExposureDisclosure";
import { InvestmentFocusDisclosure } from "./InvestmentFocusDisclosure";
import { ShareAllocationButton } from "./ShareAllocationButton";

const MODES = ["class", "sector", "region", "focus"] as const;
type Mode = (typeof MODES)[number];

export function AllocationCard() {
  const p = usePortfolio();
  const [mode, setMode] = useState<Mode>("class");
  const tabRefs = useRef<Record<Mode, HTMLButtonElement | null>>({
    class: null,
    sector: null,
    region: null,
    focus: null,
  });
  const currency = p.currency ?? "USD";
  const baseMetrics = computePortfolioBaseMetrics(p.holdings, p.transactions ?? [], currency, {
    liveEurPerUsd: p.eurPerUsd ?? null,
    eurUsdPrices: p.eurUsdPrices ?? [],
    splits: p.corporateActions ?? [],
  });
  const baseHoldings = holdingsInBaseCurrency(p.holdings, baseMetrics);
  const unpricedCount = baseHoldings.filter((h) => !Number.isFinite(h.value)).length;
  const geoSummary =
    mode === "region" ? calculatePortfolioGeographicExposure(baseHoldings, p.label) : null;
  const focusSummary = mode === "focus" ? calculatePortfolioInvestmentFocus(baseHoldings) : null;
  const data = geoSummary
    ? geoDisplayRows(geoSummary, p.lang)
    : focusSummary
      ? focusSummary.rows.map((row) => ({
          name: FOCUS_LABELS[p.lang][row.focus],
          value: row.value,
        }))
      : groupBy(
          baseHoldings.filter((h) => Number.isFinite(h.value)),
          (h) => (mode === "class" ? p.t(h.asset.type) : p.label(h.asset.sector)),
        );
  const tabLabel = (m: Mode) =>
    m === "focus"
      ? FOCUS_COPY[p.lang].tab
      : p.t(m === "class" ? "byClass" : m === "sector" ? "bySector" : "byRegion");
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    const target =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? MODES.length - 1
          : step
            ? (index + step + MODES.length) % MODES.length
            : null;
    if (target === null) return;
    event.preventDefault();
    const next = MODES[target]!;
    setMode(next);
    tabRefs.current[next]?.focus();
  };
  return (
    <Card className="cq-card min-w-0 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display font-semibold">{p.t("allocation")}</h3>
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label={p.t("allocation")}
            className="flex max-w-full min-w-0 overflow-x-auto rounded-full bg-secondary p-0.5 text-xs"
          >
            {MODES.map((m, index) => (
              <button
                key={m}
                ref={(el) => {
                  tabRefs.current[m] = el;
                }}
                type="button"
                role="tab"
                id={`allocation-tab-${m}`}
                aria-selected={mode === m}
                aria-controls="allocation-panel"
                tabIndex={mode === m ? 0 : -1}
                onClick={() => setMode(m)}
                onKeyDown={(event) => onTabKeyDown(event, index)}
                className={`rounded-full px-2.5 py-1 font-semibold whitespace-nowrap ${mode === m ? "bg-card shadow-sm" : "text-muted-foreground"}`}
              >
                {tabLabel(m)}
              </button>
            ))}
          </div>
          <ShareAllocationButton data={data} lang={p.lang} />
        </div>
      </div>
      <div id="allocation-panel" role="tabpanel" aria-labelledby={`allocation-tab-${mode}`}>
        <AllocationBreakdown
          locale={languageLocale(p.lang)}
          data={data}
          neutralNames={neutralAllocationNames(p.lang)}
          totalLabel={
            baseHoldings.some((h) => !Number.isFinite(h.value))
              ? p.t("holdingValuePartialTotal")
              : p.t("holdingValueTotal")
          }
          formatValue={(value, compact) =>
            p.currency
              ? formatBaseCurrencyAmount(
                  value,
                  p.currency,
                  p.lang,
                  compact ? { compact: true } : undefined,
                )
              : p.money(value, compact ? { compact: true } : undefined)
          }
        />
        {geoSummary && geoSummary.withheldFundValue > 0 && (
          <button
            type="button"
            onClick={() => {
              setMode("focus");
              requestAnimationFrame(() => tabRefs.current.focus?.focus());
            }}
            className="mt-2 inline-flex min-h-8 items-center rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-secondary/60"
          >
            {FOCUS_COPY[p.lang].cta} {"\u2192"}
          </button>
        )}
        {focusSummary && <InvestmentFocusDisclosure summary={focusSummary} lang={p.lang} />}
        {geoSummary && (
          <GeoExposureDisclosure summary={geoSummary} lang={p.lang} unpricedCount={unpricedCount} />
        )}
      </div>
    </Card>
  );
}
