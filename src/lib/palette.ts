// Muted CapiSpot brand hues (emerald, gold, blossom, violet) plus softer companions.
export const ALLOC_COLORS = [
  "oklch(0.72 0.12 163)", // emerald
  "oklch(0.80 0.12 82)", // gold
  "oklch(0.70 0.13 5)", // blossom
  "oklch(0.66 0.13 290)", // violet
  "oklch(0.72 0.09 215)", // sky
  "oklch(0.72 0.12 45)", // amber-coral
  "oklch(0.76 0.10 125)", // sage
  "oklch(0.64 0.12 325)", // orchid
  "oklch(0.68 0.08 190)", // teal
  "oklch(0.62 0.11 255)", // indigo
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
