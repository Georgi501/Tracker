// Muted CapiSpot brand hues (indigo, gold, blossom, teal) plus softer companions.
export const ALLOC_COLORS = [
  "oklch(0.70 0.13 265)", // indigo
  "oklch(0.80 0.12 82)", // gold
  "oklch(0.70 0.13 5)", // blossom
  "oklch(0.70 0.10 190)", // teal
  "oklch(0.72 0.09 225)", // sky
  "oklch(0.72 0.12 45)", // amber-coral
  "oklch(0.66 0.13 300)", // violet
  "oklch(0.64 0.12 325)", // orchid
  "oklch(0.74 0.11 155)", // mint
  "oklch(0.62 0.11 255)", // blue
  "oklch(0.80 0.06 70)", // sand
  "oklch(0.60 0.10 20)", // clay
];

// Colors are assigned by rank so every slice in one chart is unique;
// past the base palette the same hues repeat in a darker shade.
export function allocationColorAt(index: number, offset = 0): string {
  const i = index + offset;
  const base = ALLOC_COLORS[i % ALLOC_COLORS.length]!;
  return i < ALLOC_COLORS.length ? base : base.replace(/^oklch\(0\.\d+/, "oklch(0.50");
}
