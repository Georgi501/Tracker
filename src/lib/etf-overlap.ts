import type { Holding } from "./portfolio";
import {
  calculatePortfolioGeographicExposure,
  resolveFundExposureEntry,
  type FundExposureEntry,
} from "./geographic-exposure";

export interface EtfHoldingSet {
  symbol: string;
  holdings: { symbol: string; name: string; weight: number }[];
}

export interface UnderlyingExposure {
  symbol: string;
  name: string;
  weight: number;
  sources: string[];
}

export interface EtfExposureProfile {
  symbol: string;
  sectors: Record<string, number>;
  regions: Record<string, number>;
}

const SUPPORTED_ETF_SYMBOLS = [
  "VOO",
  "SPY",
  "IVV",
  "VTI",
  "VUAA",
  "VUSA",
  "CSPX",
  "SXR8",
  "SPYL",
  "ZPRV",
  "QQQ",
  "EQQQ",
  "SXRV",
  "VWCE",
  "VWRP",
  "VWRL",
  "VHYL",
  "IWDA",
  "SWDA",
  "EUNL",
  "XDWD",
  "IUSQ",
  "SSAC",
  "IS3N",
  "EIMI",
  "EXSA",
  "MEUD",
  "IXUA",
] as const;

/**
 * Identity-only catalog for supported ETFs in distributable builds.
 * Zero proprietary third-party sector or country weight tables are embedded;
 * authorized weight profiles can be supplied cleanly via custom registries/maps.
 */
export const SUPPORTED_ETF_EXPOSURE_PROFILES: Record<string, EtfExposureProfile> =
  Object.fromEntries(
    SUPPORTED_ETF_SYMBOLS.map((symbol) => [symbol, { symbol, sectors: {}, regions: {} }]),
  );

export function resolveEtfExposureProfile(
  symbol: string,
  profiles: Record<string, EtfExposureProfile> = SUPPORTED_ETF_EXPOSURE_PROFILES,
): EtfExposureProfile | null {
  const upper = symbol.trim().toUpperCase();
  if (profiles[upper]) return profiles[upper]!;
  if (profiles === SUPPORTED_ETF_EXPOSURE_PROFILES) {
    const identity = resolveFundExposureEntry({ symbol: upper });
    if (identity) {
      return { symbol: upper, sectors: {}, regions: {} };
    }
    return null;
  }
  const baseTicker = upper.split(".")[0];
  if (baseTicker && profiles[baseTicker]) return profiles[baseTicker]!;
  return null;
}

export function calculatePortfolioExposures(
  holdings: Holding[],
  dimension: "sector" | "region",
  mode: "direct" | "lookThrough" = "direct",
  labelFn: (raw: string) => string = (value) => value,
  profiles: Record<string, EtfExposureProfile> = SUPPORTED_ETF_EXPOSURE_PROFILES,
  options?: {
    registry?: readonly FundExposureEntry[];
    equityCountries?: Readonly<Record<string, string>>;
  },
): {
  rows: { name: string; value: number }[];
  decomposedEtfs: string[];
  fallbackEtfs: string[];
} {
  if (
    dimension === "region" &&
    mode === "lookThrough" &&
    profiles === SUPPORTED_ETF_EXPOSURE_PROFILES
  ) {
    const geo = calculatePortfolioGeographicExposure(holdings, labelFn, options);
    return {
      rows: geo.rows.map((row) => ({ name: row.name, value: row.value })),
      decomposedEtfs: geo.decomposedEtfs,
      fallbackEtfs: [...new Set([...geo.unresolvedAssets, ...geo.licenseWithheldAssets])],
    };
  }

  const totals = new Map<string, number>();
  const decomposedEtfs: string[] = [];
  const fallbackEtfs: string[] = [];

  const add = (category: string, amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const label = labelFn(category);
    totals.set(label, (totals.get(label) ?? 0) + amount);
  };

  for (const holding of holdings) {
    if (!Number.isFinite(holding.value) || holding.value <= 0) continue;
    const directCategory = dimension === "sector" ? holding.asset.sector : holding.asset.region;
    if (mode === "lookThrough" && holding.asset.type === "etf") {
      const profile = resolveEtfExposureProfile(holding.asset.symbol, profiles);
      const weights = profile ? (dimension === "sector" ? profile.sectors : profile.regions) : null;
      const entries = weights
        ? Object.entries(weights).filter(
            ([, weight]) => typeof weight === "number" && Number.isFinite(weight) && weight > 0,
          )
        : [];
      const weightSum = entries.reduce((sum, [, weight]) => sum + weight, 0);
      if (entries.length > 0 && weightSum > 0) {
        if (!decomposedEtfs.includes(holding.asset.symbol)) {
          decomposedEtfs.push(holding.asset.symbol);
        }
        for (const [category, weight] of entries) {
          add(category, holding.value * (weight / weightSum));
        }
        continue;
      }
      if (!fallbackEtfs.includes(holding.asset.symbol)) {
        fallbackEtfs.push(holding.asset.symbol);
      }
    }
    add(directCategory, holding.value);
  }

  return {
    rows: [...totals.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    decomposedEtfs,
    fallbackEtfs,
  };
}

export function calculateEtfOverlap(
  holdings: Holding[],
  compositions: EtfHoldingSet[],
): UnderlyingExposure[] {
  const portfolioValue = holdings.reduce(
    (sum, holding) => sum + (Number.isFinite(holding.value) ? Math.max(0, holding.value) : 0),
    0,
  );
  if (portfolioValue <= 0) return [];

  const values = new Map<string, UnderlyingExposure>();
  const add = (symbol: string, name: string, value: number, source: string) => {
    const key = symbol.toUpperCase();
    const current = values.get(key) ?? { symbol: key, name: "", weight: 0, sources: [] };
    if (!current.name) current.name = name;
    current.weight += value / portfolioValue;
    if (!current.sources.includes(source)) current.sources.push(source);
    values.set(key, current);
  };

  for (const fund of compositions) {
    const fundValue = holdings.find(
      (holding) =>
        holding.asset.type === "etf" &&
        holding.asset.symbol.toUpperCase() === fund.symbol.toUpperCase(),
    )?.value;
    if (!fundValue || !Number.isFinite(fundValue) || fundValue <= 0) continue;
    for (const constituent of fund.holdings) {
      if (!Number.isFinite(constituent.weight) || constituent.weight <= 0) continue;
      add(constituent.symbol, constituent.name, fundValue * constituent.weight, fund.symbol);
    }
  }

  for (const holding of holdings) {
    if (holding.asset.type === "stock" && Number.isFinite(holding.value) && holding.value > 0) {
      add(holding.asset.symbol, holding.asset.name, holding.value, holding.asset.symbol);
    }
  }

  return [...values.values()].sort((a, b) => b.weight - a.weight);
}

export interface EtfComparisonRow {
  name: string;
  weights: Record<string, number>;
  overlap: number;
}

export interface EtfComparisonResult {
  symbols: string[];
  sectorOverlap: number;
  regionOverlap: number;
  sectors: EtfComparisonRow[];
  regions: EtfComparisonRow[];
}

function buildComparisonDimension(
  profiles: EtfExposureProfile[],
  dimension: "sectors" | "regions",
): { rows: EtfComparisonRow[]; totalOverlap: number } {
  const keys = new Set<string>();
  for (const profile of profiles) {
    for (const key of Object.keys(profile[dimension])) {
      keys.add(key);
    }
  }

  let totalOverlap = 0;
  const rows: EtfComparisonRow[] = [];

  for (const key of keys) {
    const weights: Record<string, number> = {};
    let minWeight = Infinity;
    let maxWeight = 0;
    for (const profile of profiles) {
      const raw = profile[dimension][key] ?? 0;
      const w = Number.isFinite(raw) && raw > 0 ? raw : 0;
      weights[profile.symbol] = w;
      if (w < minWeight) minWeight = w;
      if (w > maxWeight) maxWeight = w;
    }
    const overlap = Number.isFinite(minWeight) ? minWeight : 0;
    if (key !== "Unknown" && key !== "Non-Geographic") {
      totalOverlap += overlap;
    }
    if (maxWeight > 0) {
      rows.push({ name: key, weights, overlap });
    }
  }

  rows.sort((a, b) => b.overlap - a.overlap || a.name.localeCompare(b.name));
  return {
    rows,
    totalOverlap: Math.min(1, Math.max(0, totalOverlap)),
  };
}

/**
 * Compares 2 or 3 ETFs using provided/authorized exposure profiles.
 * Third-party tables without distribution rights remain empty rather than fabricated.
 */
export function compareEtfProfiles(
  symbols: readonly string[],
  profiles: Record<string, EtfExposureProfile> = SUPPORTED_ETF_EXPOSURE_PROFILES,
): EtfComparisonResult | null {
  const resolved: EtfExposureProfile[] = [];
  const seen = new Set<string>();

  for (const raw of symbols) {
    const profile = resolveEtfExposureProfile(raw, profiles);
    if (!profile || seen.has(profile.symbol)) continue;
    seen.add(profile.symbol);
    resolved.push(profile);
    if (resolved.length === 3) break;
  }

  if (resolved.length < 2) return null;

  const sectors = buildComparisonDimension(resolved, "sectors");
  const regions = buildComparisonDimension(resolved, "regions");

  return {
    symbols: resolved.map((p) => p.symbol),
    sectorOverlap: sectors.totalOverlap,
    regionOverlap: regions.totalOverlap,
    sectors: sectors.rows,
    regions: regions.rows,
  };
}
