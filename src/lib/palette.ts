// CapiSpot brand colors with distinct shades for additional allocation categories.
export const ALLOC_COLORS = [
  "oklch(0.82 0.15 85)", // sun
  "oklch(0.76 0.15 355)", // blossom
  "oklch(0.73 0.14 295)", // violet
  "oklch(0.78 0.13 195)", // teal
  "oklch(0.76 0.15 295)", // violet
  "oklch(0.76 0.13 164)", // primary
  "oklch(0.80 0.14 125)", // lime
  "oklch(0.86 0.15 90)", // gold
];

export function allocationColor(key: string): string {
  let hash = 0;
  for (const character of key.trim().toLowerCase()) {
    hash = (hash * 31 + character.codePointAt(0)!) >>> 0;
  }
  return ALLOC_COLORS[hash % ALLOC_COLORS.length]!;
}
