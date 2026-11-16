import type { Holding } from "./portfolio";

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

const SP500_SECTORS: Record<string, number> = {
  Technology: 0.32,
  Financials: 0.13,
  Healthcare: 0.12,
  "Consumer Discretionary": 0.1,
  "Communication Services": 0.09,
  Industrials: 0.08,
  "Consumer Staples": 0.06,
  Energy: 0.04,
  Utilities: 0.02,
  "Real Estate": 0.02,
  Materials: 0.02,
};

const SP500_REGIONS: Record<string, number> = {
  "North America": 1,
};

const NASDAQ100_SECTORS: Record<string, number> = {
  Technology: 0.51,
  "Communication Services": 0.16,
  "Consumer Discretionary": 0.13,
  "Consumer Staples": 0.06,
  Healthcare: 0.06,
  Industrials: 0.05,
  Utilities: 0.03,
};

const NASDAQ100_REGIONS: Record<string, number> = {
  "North America": 0.97,
  Europe: 0.02,
  "Asia-Pacific": 0.01,
};

const ALL_WORLD_SECTORS: Record<string, number> = {
  Technology: 0.26,
  Financials: 0.16,
  Healthcare: 0.11,
  "Consumer Discretionary": 0.11,
  Industrials: 0.11,
  "Communication Services": 0.08,
  "Consumer Staples": 0.06,
  Energy: 0.04,
  Materials: 0.03,
  Utilities: 0.02,
  "Real Estate": 0.02,
};

const ALL_WORLD_REGIONS: Record<string, number> = {
  "North America": 0.65,
  Europe: 0.15,
  "Asia-Pacific": 0.1,
  "Emerging Markets": 0.1,
};

const MSCI_WORLD_SECTORS: Record<string, number> = {
  Technology: 0.27,
  Financials: 0.15,
  Healthcare: 0.12,
  Industrials: 0.11,
  "Consumer Discretionary": 0.11,
  "Communication Services": 0.08,
  "Consumer Staples": 0.06,
  Energy: 0.04,
  Materials: 0.03,
  Utilities: 0.03,
};

const MSCI_WORLD_REGIONS: Record<string, number> = {
  "North America": 0.72,
  Europe: 0.18,
  "Asia-Pacific": 0.1,
};

export const SUPPORTED_ETF_EXPOSURE_PROFILES: Record<string, EtfExposureProfile> = {
  VOO: { symbol: "VOO", sectors: SP500_SECTORS, regions: SP500_REGIONS },
  SPY: { symbol: "SPY", sectors: SP500_SECTORS, regions: SP500_REGIONS },
  IVV: { symbol: "IVV", sectors: SP500_SECTORS, regions: SP500_REGIONS },
  VTI: { symbol: "VTI", sectors: SP500_SECTORS, regions: SP500_REGIONS },
  VUAA: { symbol: "VUAA", sectors: SP500_SECTORS, regions: SP500_REGIONS },
  VUSA: { symbol: "VUSA", sectors: SP500_SECTORS, regions: SP500_REGIONS },
  CSPX: { symbol: "CSPX", sectors: SP500_SECTORS, regions: SP500_REGIONS },
  SXR8: { symbol: "SXR8", sectors: SP500_SECTORS, regions: SP500_REGIONS },
  QQQ: { symbol: "QQQ", sectors: NASDAQ100_SECTORS, regions: NASDAQ100_REGIONS },
  EQQQ: { symbol: "EQQQ", sectors: NASDAQ100_SECTORS, regions: NASDAQ100_REGIONS },
  VWCE: { symbol: "VWCE", sectors: ALL_WORLD_SECTORS, regions: ALL_WORLD_REGIONS },
  VT: { symbol: "VT", sectors: ALL_WORLD_SECTORS, regions: ALL_WORLD_REGIONS },
  VWRP: { symbol: "VWRP", sectors: ALL_WORLD_SECTORS, regions: ALL_WORLD_REGIONS },
  VWRL: { symbol: "VWRL", sectors: ALL_WORLD_SECTORS, regions: ALL_WORLD_REGIONS },
  IWDA: { symbol: "IWDA", sectors: MSCI_WORLD_SECTORS, regions: MSCI_WORLD_REGIONS },
  SWDA: { symbol: "SWDA", sectors: MSCI_WORLD_SECTORS, regions: MSCI_WORLD_REGIONS },
  EUNL: { symbol: "EUNL", sectors: MSCI_WORLD_SECTORS, regions: MSCI_WORLD_REGIONS },
  URTH: { symbol: "URTH", sectors: MSCI_WORLD_SECTORS, regions: MSCI_WORLD_REGIONS },
};

export function resolveEtfExposureProfile(
  symbol: string,
  profiles: Record<string, EtfExposureProfile> = SUPPORTED_ETF_EXPOSURE_PROFILES,
): EtfExposureProfile | null {
  const upper = symbol.trim().toUpperCase();
  if (profiles[upper]) return profiles[upper]!;
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
): {
  rows: { name: string; value: number }[];
  decomposedEtfs: string[];
  fallbackEtfs: string[];
} {
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
        holding.asset.type === "etf" && holding.asset.symbol.toUpperCase() === fund.symbol,
    )?.value;
    if (!fundValue || fundValue <= 0) continue;
    for (const constituent of fund.holdings)
      add(constituent.symbol, constituent.name, fundValue * constituent.weight, fund.symbol);
  }
  for (const holding of holdings) {
    if (holding.asset.type === "stock" && holding.value > 0)
      add(holding.asset.symbol, holding.asset.name, holding.value, holding.asset.symbol);
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
    totalOverlap += overlap;
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
 * Compares 2 or 3 supported ETFs using verified sector and region exposure profiles.
 * Unknown tickers are ignored rather than fabricated.
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
