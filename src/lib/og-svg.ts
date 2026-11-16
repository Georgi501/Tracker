export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function cleanText(raw: string | null, fallback: string, maxLength: number): string {
  if (!raw) return fallback;
  const normalized = [...raw]
    .map((ch) => {
      const code = ch.charCodeAt(0);
      return code < 32 || code === 127 ? " " : ch;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return fallback;
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

const SNAPSHOT_CLASS_LABELS: Record<string, { label: string; color: string }> = {
  stock: { label: "Stocks", color: "#10b981" },
  etf: { label: "ETFs", color: "#38bdf8" },
  crypto: { label: "Crypto", color: "#f59e0b" },
  bond: { label: "Bonds", color: "#a78bfa" },
  cash: { label: "Cash", color: "#64748b" },
  realestate: { label: "Real Estate", color: "#fb7185" },
};

const DEFAULT_SNAPSHOT_WEIGHTS = [
  { key: "stock", label: "Stocks", pct: 55, color: "#10b981" },
  { key: "etf", label: "ETFs", pct: 30, color: "#38bdf8" },
  { key: "crypto", label: "Crypto", pct: 10, color: "#f59e0b" },
  { key: "cash", label: "Cash", pct: 5, color: "#64748b" },
];

function parseSnapshotWeights(raw: string | null) {
  if (!raw) return DEFAULT_SNAPSHOT_WEIGHTS;
  const parsed: { key: string; label: string; pct: number; color: string }[] = [];
  for (const part of raw.split(",").slice(0, 6)) {
    const [rawKey, rawVal] = part.split(":");
    const key = (rawKey ?? "").trim().toLowerCase();
    const meta = SNAPSHOT_CLASS_LABELS[key];
    const pct = Number(rawVal);
    if (!meta || !Number.isFinite(pct) || pct <= 0 || pct > 100) continue;
    if (parsed.some((item) => item.key === key)) continue;
    parsed.push({ key, label: meta.label, pct: Math.round(pct * 10) / 10, color: meta.color });
  }
  if (!parsed.length) return DEFAULT_SNAPSHOT_WEIGHTS;
  const total = parsed.reduce((sum, item) => sum + item.pct, 0);
  if (total <= 0) return DEFAULT_SNAPSHOT_WEIGHTS;
  return parsed.map((item) => ({
    ...item,
    pct: Math.round((item.pct / total) * 1000) / 10,
  }));
}

export function renderAssetOgSvg(params: {
  symbol?: string | null;
  name?: string | null;
  sector?: string | null;
}): string {
  const symbol = cleanText(params.symbol ?? null, "CAPISPOT", 18).toUpperCase();
  const name = cleanText(params.name ?? null, "Verified Market & Financial Overview", 52);
  const sector = cleanText(params.sector ?? null, "Equities & ETFs", 32);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escapeXml(symbol)} — ${escapeXml(name)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#060914"/>
      <stop offset="55%" stop-color="#0a1628"/>
      <stop offset="100%" stop-color="#07221d"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1040" cy="120" r="240" fill="#10b981" fill-opacity="0.08"/>
  <circle cx="160" cy="540" r="220" fill="#38bdf8" fill-opacity="0.06"/>
  <rect x="64" y="64" width="1072" height="502" rx="28" fill="#0d1526" fill-opacity="0.88" stroke="#1e293b" stroke-width="2"/>
  <rect x="108" y="108" width="44" height="44" rx="12" fill="url(#accent)"/>
  <text x="130" y="138" text-anchor="middle" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="22" font-weight="800" fill="#060914">C</text>
  <text x="168" y="138" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="26" font-weight="700" fill="#f8fafc">CapiSpot</text>
  <rect x="920" y="108" width="172" height="40" rx="20" fill="#10b981" fill-opacity="0.14" stroke="#10b981" stroke-opacity="0.45"/>
  <text x="1006" y="134" text-anchor="middle" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="16" font-weight="600" fill="#34d399">${escapeXml(sector)}</text>
  <text x="108" y="278" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="88" font-weight="800" letter-spacing="-2" fill="#ffffff">${escapeXml(symbol)}</text>
  <text x="108" y="346" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="34" font-weight="500" fill="#cbd5e1">${escapeXml(name)}</text>
  <rect x="108" y="420" width="984" height="4" rx="2" fill="url(#accent)" fill-opacity="0.5"/>
  <text x="108" y="486" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="22" font-weight="500" fill="#94a3b8">Live quotes · SEC EDGAR 10-K financials · Dividend &amp; FIFO tracking</text>
  <text x="1092" y="486" text-anchor="end" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="22" font-weight="600" fill="#34d399">capispot.com</text>
</svg>`;
}

export function renderSnapshotOgSvg(params: { weights?: string | null }): string {
  const weights = parseSnapshotWeights(params.weights ?? null);
  const barWidth = 984;
  let cursorX = 108;
  const barSegments = weights
    .map((item) => {
      const segWidth = Math.max(8, (item.pct / 100) * barWidth);
      const rect = `<rect x="${cursorX.toFixed(1)}" y="272" width="${segWidth.toFixed(1)}" height="36" fill="${item.color}"/>`;
      cursorX += segWidth;
      return rect;
    })
    .join("\n    ");

  const legendItems = weights
    .slice(0, 4)
    .map((item, idx) => {
      const colX = 108 + (idx % 2) * 500;
      const rowY = 368 + Math.floor(idx / 2) * 58;
      return `<circle cx="${colX + 10}" cy="${rowY - 7}" r="9" fill="${item.color}"/>
    <text x="${colX + 32}" y="${rowY}" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="26" font-weight="600" fill="#e2e8f0">${escapeXml(item.label)}</text>
    <text x="${colX + 430}" y="${rowY}" text-anchor="end" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="26" font-weight="700" fill="#ffffff">${escapeXml(String(item.pct))}%</text>`;
    })
    .join("\n    ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="CapiSpot Portfolio Allocation Snapshot">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#060914"/>
      <stop offset="60%" stop-color="#0a1628"/>
      <stop offset="100%" stop-color="#07221d"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
    <clipPath id="barClip">
      <rect x="108" y="272" width="984" height="36" rx="18"/>
    </clipPath>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="64" y="64" width="1072" height="502" rx="28" fill="#0d1526" fill-opacity="0.9" stroke="#1e293b" stroke-width="2"/>
  <rect x="108" y="108" width="44" height="44" rx="12" fill="url(#accent)"/>
  <text x="130" y="138" text-anchor="middle" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="22" font-weight="800" fill="#060914">C</text>
  <text x="168" y="138" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="26" font-weight="700" fill="#f8fafc">CapiSpot</text>
  <text x="1092" y="136" text-anchor="end" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="18" font-weight="600" fill="#34d399">Percentages only · Privacy-safe</text>
  <text x="108" y="226" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="44" font-weight="800" fill="#ffffff">Portfolio Allocation Snapshot</text>
  <rect x="108" y="272" width="984" height="36" rx="18" fill="#1e293b"/>
  <g clip-path="url(#barClip)">
    ${barSegments}
  </g>
  ${legendItems}
  <text x="108" y="516" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="20" font-weight="500" fill="#94a3b8">No account balances, quantities, or personal data exposed</text>
  <text x="1092" y="516" text-anchor="end" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="20" font-weight="600" fill="#34d399">capispot.com</text>
</svg>`;
}
