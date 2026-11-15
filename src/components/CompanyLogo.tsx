import { useState } from "react";

const TONES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function CompanyLogoFallback({ symbol, size = 40 }: { symbol: string; size?: number }) {
  const sym = symbol.toUpperCase();
  const tone = TONES[[...sym].reduce((s, ch) => s + ch.charCodeAt(0), 0) % TONES.length];
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        background: `color-mix(in oklab, ${tone} 20%, transparent)`,
        color: tone,
      }}
      className="grid shrink-0 place-items-center rounded-2xl text-[0.7rem] font-bold"
    >
      {sym.replace(/\..*$/, "").slice(0, 4)}
    </span>
  );
}

/** Real company/crypto logo from a public image CDN; falls back to colored initials when unavailable. */
export function CompanyLogo({
  symbol,
  type,
  size = 40,
}: {
  symbol: string;
  type?: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const sym = symbol.toUpperCase();
  const file = type === "crypto" ? `${sym.replace(/-USD$/, "")}USD` : sym;
  const style = { width: size, height: size };
  if (failed || type === "bond" || type === "cash" || type === "realEstate") {
    return <CompanyLogoFallback symbol={sym} size={size} />;
  }
  return (
    <span
      aria-hidden
      style={style}
      className="grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-card p-1 shadow-sm ring-1 ring-border"
    >
      <img
        ref={(image) => {
          // A cached/SSR image can fail before hydration attaches onError.
          if (image?.complete && image.naturalWidth === 0) setFailed(true);
        }}
        src={`https://financialmodelingprep.com/image-stock/${encodeURIComponent(file)}.png`}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="size-full object-contain"
      />
    </span>
  );
}
