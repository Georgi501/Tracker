import { z } from "zod";
import type { FinancialSeriesRow } from "./financial-series";

type Metric = Exclude<keyof FinancialSeriesRow, "date">;
const aliases = {
  revenue: [
    "RevenuesNetOfInterestExpense",
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "Revenues",
    "SalesRevenueNet",
  ],
  costOfRevenue: ["CostOfGoodsAndServicesSold", "CostOfRevenue"],
  grossProfit: ["GrossProfit"],
  operatingIncome: ["OperatingIncomeLoss"],
  operatingExpense: ["OperatingExpenses"],
  netIncome: ["NetIncomeLoss"],
  dilutedEps: ["EarningsPerShareDiluted"],
  operatingCashFlow: ["NetCashProvidedByUsedInOperatingActivities"],
  capex: ["PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquireProductiveAssets"],
  financedAssetPayments: [
    "PaymentsForFinancedPropertyPlantAndEquipmentAndIntangibleAssetsFinancingActivities",
  ],
} as const;
type DirectMetric = keyof typeof aliases;

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((date) => {
    const parsed = new Date(date);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
  });
const factSchema = z.object({
  start: dateSchema,
  end: dateSchema,
  val: z.number().finite(),
  accn: z.string().regex(/^\d{10}-\d{2}-\d{6}$/),
  form: z.enum(["10-K", "10-K/A"]),
  filed: dateSchema,
});
const companySchema = z.object({
  cik: z.number().int().positive(),
  entityName: z.string(),
  facts: z.object({
    nvda: z
      .record(z.string(), z.object({ units: z.record(z.string(), z.array(z.unknown())) }))
      .optional(),
    "us-gaap": z
      .record(z.string(), z.object({ units: z.record(z.string(), z.array(z.unknown())) }))
      .optional(),
  }),
});

export interface SecEvidence {
  tags: string[];
  unit: "USD" | "USD/shares";
  start: string;
  end: string;
  filed: string;
  accession: string;
  filingUrl: string;
  derived: boolean;
}
export interface SecAnnualRow extends FinancialSeriesRow {
  start: string;
  sources: Partial<Record<Metric, SecEvidence>>;
}
type Candidate = z.infer<typeof factSchema> & {
  namespace: "us-gaap" | "nvda";
  tag: string;
  unit: "USD" | "USD/shares";
};

/**
 * Latest disclosed annual 10-K facts as of a fixed date, shared by the app and audit runner.
 * Fiscal periods come from start/end, never fy/frame (comparatives reuse the filing's fy).
 * Only the audited NVIDIA financed-asset extension is supported; other custom tags,
 * non-USD facts, quarterly/YTD and transition periods stay unavailable.
 */
export function extractSecAnnualHistory(
  payload: unknown,
  options: { asOf: string; years?: number },
) {
  const asOf = dateSchema.parse(options.asOf);
  const years = z
    .number()
    .int()
    .min(1)
    .max(40)
    .parse(options.years ?? 10);
  const company = companySchema.parse(payload);
  const concepts = company.facts["us-gaap"] ?? {};
  const candidates = new Map<string, Map<DirectMetric, Candidate[]>>();
  const starts = new Map<string, Set<string>>();
  const issues: string[] = [];
  for (const [metricName, tags] of Object.entries(aliases)) {
    const metric = metricName as DirectMetric;
    const unit = metric === "dilutedEps" ? "USD/shares" : "USD";
    for (const tag of tags) {
      // ProductiveAssets is broader than PP&E: use only for NVIDIA's audited FCF definition.
      if (
        (metric === "financedAssetPayments" || tag === "PaymentsToAcquireProductiveAssets") &&
        company.cik !== 1045810
      )
        continue;
      const namespace = metric === "financedAssetPayments" ? "nvda" : "us-gaap";
      const concept = namespace === "nvda" ? company.facts.nvda?.[tag] : concepts[tag];
      for (const raw of concept?.units[unit] ?? []) {
        const parsed = factSchema.safeParse(raw);
        if (!parsed.success) continue;
        const fact = parsed.data;
        const days = (Date.parse(fact.end) - Date.parse(fact.start)) / 86_400_000 + 1;
        if (
          days < 350 ||
          days > 380 ||
          fact.end > asOf ||
          fact.filed > asOf ||
          fact.filed < fact.end
        )
          continue;
        const periodStarts = starts.get(fact.end) ?? new Set<string>();
        periodStarts.add(fact.start);
        starts.set(fact.end, periodStarts);
        const period = candidates.get(fact.end) ?? new Map<DirectMetric, Candidate[]>();
        const points = period.get(metric) ?? [];
        points.push({ ...fact, namespace, tag, unit });
        period.set(metric, points);
        candidates.set(fact.end, period);
      }
    }
  }
  const evidence = (fact: Candidate): SecEvidence => ({
    tags: [`${fact.namespace}:${fact.tag}`],
    unit: fact.unit,
    start: fact.start,
    end: fact.end,
    filed: fact.filed,
    accession: fact.accn,
    filingUrl: `https://www.sec.gov/Archives/edgar/data/${company.cik}/${fact.accn.replaceAll("-", "")}/${fact.accn}-index.html`,
    derived: false,
  });
  const allRows: SecAnnualRow[] = [];
  for (const [end, period] of [...candidates].sort(([a], [b]) => a.localeCompare(b))) {
    if (starts.get(end)!.size !== 1) {
      issues.push(`${end}: ambiguous annual start dates; period omitted.`);
      continue;
    }
    const row: SecAnnualRow = {
      date: end,
      start: [...starts.get(end)!][0]!,
      sources: {},
      revenue: null,
      costOfRevenue: null,
      grossProfit: null,
      operatingIncome: null,
      operatingExpense: null,
      netIncome: null,
      dilutedEps: null,
      operatingCashFlow: null,
      freeCashFlow: null,
    };
    const picked = new Map<DirectMetric, Candidate>();
    for (const [metric, facts] of period) {
      const sorted = [...facts].sort(
        (a, b) => b.filed.localeCompare(a.filed) || b.accn.localeCompare(a.accn),
      );
      const latest = sorted[0]!;
      const sameFiling = sorted.filter(
        (fact) => fact.filed === latest.filed && fact.accn === latest.accn,
      );
      if (new Set(sameFiling.map((fact) => fact.val)).size !== 1) {
        issues.push(`${end}: conflicting ${metric} facts in ${latest.accn}; metric omitted.`);
        continue;
      }
      const preferred = sameFiling.sort(
        (a, b) =>
          (aliases[metric] as readonly string[]).indexOf(a.tag) -
          (aliases[metric] as readonly string[]).indexOf(b.tag),
      )[0]!;
      picked.set(metric, preferred);
      if (metric !== "capex" && metric !== "financedAssetPayments") {
        row[metric] = preferred.val;
        row.sources[metric] = evidence(preferred);
      }
    }
    const derive = (
      metric: "grossProfit" | "freeCashFlow",
      leftKey: DirectMetric,
      rightKey: DirectMetric,
    ) => {
      if (row[metric] != null) return;
      const left = picked.get(leftKey);
      const right = picked.get(rightKey);
      if (
        !left ||
        !right ||
        left.accn !== right.accn ||
        left.start !== right.start ||
        left.end !== right.end
      )
        return;
      if (rightKey === "capex" && right.val < 0) {
        issues.push(`${end}: negative capex outflow; FCF omitted.`);
        return;
      }
      const principal =
        company.cik === 1045810 && metric === "freeCashFlow"
          ? picked.get("financedAssetPayments")
          : undefined;
      if (
        company.cik === 1045810 &&
        metric === "freeCashFlow" &&
        (!principal ||
          principal.accn !== left.accn ||
          principal.start !== left.start ||
          principal.end !== left.end ||
          principal.val < 0)
      ) {
        issues.push(`${end}: verified NVIDIA financed-asset payments unavailable; FCF omitted.`);
        return;
      }
      row[metric] = left.val - right.val - (principal?.val ?? 0);
      row.sources[metric] = {
        ...evidence(left),
        tags: [
          `${left.namespace}:${left.tag}`,
          `${right.namespace}:${right.tag}`,
          ...(principal ? [`${principal.namespace}:${principal.tag}`] : []),
        ],
        derived: true,
      };
    };
    derive("grossProfit", "revenue", "costOfRevenue");
    derive("freeCashFlow", "operatingCashFlow", "capex");
    allRows.push(row);
  }
  const last = allRows.at(-1);
  // Count fiscal years, not filings: missing years retain their gap.
  const firstYear = last ? Number(last.date.slice(0, 4)) - years + 1 : 0;
  const rows = allRows.filter((row) => Number(row.date.slice(0, 4)) >= firstYear);
  return {
    cik: company.cik,
    name: company.entityName,
    asOf,
    currency: "USD" as const,
    policy:
      "Latest annual 10-K/10-K/A disclosures available as of asOf; EPS is as disclosed, not a uniformly split-adjusted series.",
    rows,
    issues,
  };
}
