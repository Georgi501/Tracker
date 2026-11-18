import { languageLocale } from "@/lib/i18n";
import { useState } from "react";
import { usePortfolio } from "@/lib/store";
import { groupBy } from "@/lib/portfolio";
import { AllocationBreakdown } from "./AllocationBreakdown";
import { Card } from "./AppShell";
import { ShareAllocationButton } from "./ShareAllocationButton";

export function AllocationCard() {
  const p = usePortfolio();
  const [mode, setMode] = useState<"class" | "sector" | "region">("class");
  const data = groupBy(
    p.holdings.filter((h) => Number.isFinite(h.value)),
    (h) =>
      mode === "class"
        ? p.t(h.asset.type)
        : p.label(mode === "sector" ? h.asset.sector : h.asset.region),
  );
  return (
    <Card className="cq-card p-4 sm:p-5">
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
    </Card>
  );
}
