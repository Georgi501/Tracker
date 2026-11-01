import type { AssetType, Holding } from "./portfolio";

export const ALLOCATION_TARGETS_KEY = "folio-allocation-targets";
export const ALLOCATION_TARGETS_EVENT = "folio-allocation-targets";
export const ALLOCATION_CLASSES: AssetType[] = [
  "stock",
  "etf",
  "crypto",
  "bond",
  "cash",
  "realEstate",
];

export interface AllocationTargets {
  targets: Partial<Record<AssetType, number>>;
  tolerance: number;
}

export interface AllocationDrift {
  assetType: AssetType;
  current: number;
  target: number;
  deviation: number;
  outsideTolerance: boolean;
}

function allocationTargetsKey(userId: string) {
  if (!userId) throw new Error("A signed-in account is required for allocation preferences.");
  return `${ALLOCATION_TARGETS_KEY}:${userId}`;
}

export function parseAllocationTargets(raw: string | null): AllocationTargets | null {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const candidate = value as Record<string, unknown>;
    if (
      typeof candidate["tolerance"] !== "number" ||
      !Number.isFinite(candidate["tolerance"]) ||
      candidate["tolerance"] < 0 ||
      candidate["tolerance"] > 50 ||
      !candidate["targets"] ||
      typeof candidate["targets"] !== "object" ||
      Array.isArray(candidate["targets"])
    )
      return null;
    const targets = candidate["targets"] as Record<string, unknown>;
    const validTargets: Partial<Record<AssetType, number>> = {};
    for (const assetType of ALLOCATION_CLASSES) {
      const target = targets[assetType];
      if (target === undefined) continue;
      if (typeof target !== "number" || !Number.isFinite(target) || target < 0 || target > 100)
        return null;
      validTargets[assetType] = target;
    }
    const total = Object.values(validTargets).reduce((sum, target) => sum + (target ?? 0), 0);
    if (Math.abs(total - 100) > 0.01) return null;
    return { targets: validTargets, tolerance: candidate["tolerance"] };
  } catch {
    return null;
  }
}

export function allocationDrift(
  currentValues: Partial<Record<AssetType, number>>,
  targets: AllocationTargets,
): AllocationDrift[] {
  const total = Object.values(currentValues).reduce(
    (sum, value) => (typeof value === "number" && Number.isFinite(value) ? sum + value : sum),
    0,
  );
  if (!(total > 0)) return [];
  return ALLOCATION_CLASSES.flatMap((assetType) => {
    const target = targets.targets[assetType];
    if (target === undefined) return [];
    const current = ((currentValues[assetType] ?? 0) / total) * 100;
    const deviation = current - target;
    return [
      {
        assetType,
        current,
        target,
        deviation,
        outsideTolerance: Math.abs(deviation) > targets.tolerance,
      },
    ];
  });
}

export function readAllocationTargets(userId: string): AllocationTargets | null {
  return parseAllocationTargets(localStorage.getItem(allocationTargetsKey(userId)));
}

export function writeAllocationTargets(userId: string, value: AllocationTargets) {
  const sum = Object.values(value.targets).reduce(
    (total, target) => total + (typeof target === "number" ? target : 0),
    0,
  );
  if (
    !Number.isFinite(value.tolerance) ||
    value.tolerance < 0 ||
    value.tolerance > 50 ||
    !ALLOCATION_CLASSES.some((assetType) => (value.targets[assetType] ?? 0) > 0) ||
    Math.abs(sum - 100) > 0.01
  )
    throw new Error("Allocation targets must total 100% and tolerance must be between 0 and 50.");
  localStorage.setItem(allocationTargetsKey(userId), JSON.stringify(value));
  window.dispatchEvent(new Event(ALLOCATION_TARGETS_EVENT));
}

export function removeAllocationTargets(userId: string) {
  localStorage.removeItem(allocationTargetsKey(userId));
  window.dispatchEvent(new Event(ALLOCATION_TARGETS_EVENT));
}

export function currentAllocationValues(holdings: Holding[]) {
  const values: Partial<Record<AssetType, number>> = {};
  for (const holding of holdings) {
    if (!Number.isFinite(holding.value) || holding.value < 0) continue;
    values[holding.asset.type] = (values[holding.asset.type] ?? 0) + holding.value;
  }
  return values;
}
