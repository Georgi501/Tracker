import { useState } from "react";
import { CompanyLogoFallback } from "@/components/CompanyLogo";

// Original FMP image dimensions and visible-ink bounds. Only whitespace is
// compensated; the source image and its aspect ratio stay unchanged.
const layouts: Record<
  string,
  { source: [number, number]; ink: [number, number, number, number]; longest: number }
> = {
  AAPL: { source: [100, 100], ink: [30, 23, 39, 48], longest: 32 },
  MSFT: { source: [250, 250], ink: [0, 0, 250, 250], longest: 32 },
  NVDA: { source: [250, 250], ink: [1, 41, 249, 166], longest: 40 },
  META: { source: [200, 200], ink: [0, 34, 200, 133], longest: 40 },
  AMZN: { source: [250, 250], ink: [0, 174, 250, 57], longest: 42 },
  GOOGL: { source: [250, 250], ink: [2, 0, 246, 250], longest: 32 },
  AVGO: { source: [250, 250], ink: [0, 0, 250, 250], longest: 32 },
  "BRK-B": { source: [100, 100], ink: [0, 0, 100, 100], longest: 32 },
  LLY: { source: [250, 250], ink: [0, 33, 250, 184], longest: 40 },
  JPM: { source: [250, 250], ink: [4, 2, 244, 243], longest: 32 },
  WMT: { source: [250, 250], ink: [14, 0, 222, 250], longest: 34 },
  ORCL: { source: [250, 250], ink: [0, 45, 250, 160], longest: 40 },
  COST: { source: [128, 128], ink: [0, 46, 128, 36], longest: 44 },
  TSLA: { source: [250, 250], ink: [0, 0, 249, 248], longest: 34 },
};

export function CompanySuggestionLogo({ symbol }: { symbol: string }) {
  const [failed, setFailed] = useState(false);
  const [changedSource, setChangedSource] = useState(false);
  const layout = layouts[symbol];
  const optical = layout && !changedSource;
  const scale = optical ? layout.longest / Math.max(layout.ink[2], layout.ink[3]) : 1;
  function inspect(image: HTMLImageElement | null) {
    if (!image?.complete) return;
    if (!image.naturalWidth) setFailed(true);
    else if (
      layout &&
      (image.naturalWidth !== layout.source[0] || image.naturalHeight !== layout.source[1])
    )
      setChangedSource(true);
  }
  return (
    <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-slate-50">
      {failed ? (
        <CompanyLogoFallback symbol={symbol} size={32} />
      ) : (
        <span
          className="relative block shrink-0 overflow-hidden"
          style={{
            width: optical ? layout.ink[2] * scale : 32,
            height: optical ? layout.ink[3] * scale : 32,
          }}
        >
          <img
            ref={inspect}
            src={`https://financialmodelingprep.com/image-stock/${encodeURIComponent(symbol)}.png`}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            onLoad={(event) => inspect(event.currentTarget)}
            className={optical ? "absolute block max-w-none" : "size-full object-contain"}
            style={
              optical
                ? {
                    width: layout.source[0] * scale,
                    height: layout.source[1] * scale,
                    left: -layout.ink[0] * scale,
                    top: -layout.ink[1] * scale,
                  }
                : undefined
            }
          />
        </span>
      )}
    </span>
  );
}
