import { calculatePortfolioGeographicExposure } from "@/lib/geographic-exposure";
import { languageLocale } from "@/lib/i18n";
import { useState } from "react";
import { usePortfolio } from "@/lib/store";
import { groupBy } from "@/lib/portfolio";
import { AllocationBreakdown } from "./AllocationBreakdown";
import { Card } from "./AppShell";
import { GeoExposureDisclosure } from "./GeoExposureDisclosure";
import { ShareAllocationButton } from "./ShareAllocationButton";

export function AllocationCard() {
  const p = usePortfolio();
  const [mode, setMode] = useState<"class" | "sector" | "region">("class");
  const unpricedCount = p.holdings.filter((h) => !Number.isFinite(h.value)).length;
  const geoSummary =
    mode === "region" ? calculatePortfolioGeographicExposure(p.holdings, p.label) : null;
  const data = geoSummary
    ? geoSummary.rows.map((row) => ({ name: row.name, value: row.value }))
    : groupBy(
        p.holdings.filter((h) => Number.isFinite(h.value)),
        (h) => (mode === "class" ? p.t(h.asset.type) : p.label(h.asset.sector)),
      );
  return (
    <Card className="cq-card min-w-0 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display font-semibold">{p.t("allocation")}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-secondary p-0.5 text-xs">
            {(["class", "sector", "region"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-full px-2.5 py-1 font-semibold ${mode === m ? "bg-card shadow-sm" : "text-muted-foreground"}`}
              >
                {p.t(m === "class" ? "byClass" : m === "sector" ? "bySector" : "byRegion")}
              </button>
            ))}
          </div>
          <ShareAllocationButton data={data} lang={p.lang} />
        </div>
      </div>
      <AllocationBreakdown
        locale={languageLocale(p.lang)}
        data={data}
        totalLabel={
          p.holdings.some((h) => !Number.isFinite(h.value))
            ? p.t("holdingValuePartialTotal")
            : p.t("holdingValueTotal")
        }
        formatValue={(value, compact) => p.money(value, compact ? { compact: true } : undefined)}
      />
      {geoSummary && (
        <GeoExposureDisclosure summary={geoSummary} lang={p.lang} unpricedCount={unpricedCount} />
      )}
    </Card>
  );
}
