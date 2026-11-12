import { useEffect, useRef, useState, type KeyboardEvent } from "react";

export interface ChartPoint {
  key: string;
  heading: string;
  axisLabel?: string;
  value: number | null;
}

interface FinancialBarChartProps {
  points: ChartPoint[];
  color: string;
  name: string;
  ariaLabel: string;
  noDataLabel: string;
  format: (value: number) => string;
}

/**
 * Bars start at the zero baseline (negatives go below it). A missing value keeps its slot with a
 * hollow marker, a reported zero is drawn as a thin solid line, so the two are never confused.
 */
export function FinancialBarChart({
  points,
  color,
  name,
  ariaLabel,
  noDataLabel,
  format,
}: FinancialBarChartProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const values = points.flatMap((point) => (point.value == null ? [] : [point.value]));
  const top = Math.max(0, ...values);
  const bottom = Math.min(0, ...values);
  const span = top - bottom || 1;
  const hi = top + span * 0.06;
  const lo = bottom - span * 0.06;
  const range = hi - lo;
  const pct = (value: number) => ((hi - value) / range) * 100;
  const zero = pct(0);
  const hasAxisLabels = points.some((point) => point.axisLabel);

  useEffect(() => {
    if (active == null) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setActive(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [active]);

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = points.length - 1;
    const next =
      event.key === "ArrowRight"
        ? Math.min(last, (active ?? -1) + 1)
        : event.key === "ArrowLeft"
          ? Math.max(0, (active ?? last + 1) - 1)
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (event.key === "Escape") {
      setActive(null);
      return;
    }
    if (next == null) return;
    event.preventDefault();
    setActive(next);
  };

  const activePoint = active == null ? null : points[active];
  const activeText = activePoint
    ? `${activePoint.heading}, ${name}: ${activePoint.value == null ? noDataLabel : format(activePoint.value)}`
    : "";

  return (
    <div ref={rootRef} className="relative">
      <div
        role="group"
        tabIndex={0}
        aria-label={ariaLabel}
        onKeyDown={move}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setActive(null);
        }}
        className="relative h-20 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-muted-foreground/50"
          style={{ top: `${zero}%` }}
        />
        <div className="absolute inset-0 flex">
          {points.map((point, index) => {
            const isActive = active === index;
            const shape =
              point.value == null
                ? {
                    top: `${zero}%`,
                    width: 7,
                    height: 7,
                    transform: "translate(-50%, -50%)",
                    borderRadius: "9999px",
                    border: `1.5px solid ${color}`,
                    opacity: 0.7,
                  }
                : point.value === 0
                  ? {
                      top: `${zero}%`,
                      width: "min(62%, 28px)",
                      height: 2,
                      transform: "translate(-50%, -50%)",
                      background: color,
                      borderRadius: 1,
                    }
                  : {
                      top: `${point.value > 0 ? pct(point.value) : zero}%`,
                      height: `${(Math.abs(point.value) / range) * 100}%`,
                      width: "min(62%, 28px)",
                      transform: "translateX(-50%)",
                      background: `linear-gradient(${point.value > 0 ? "to bottom" : "to top"}, color-mix(in oklab, ${color} 95%, transparent), color-mix(in oklab, ${color} 40%, transparent))`,
                      borderRadius: point.value > 0 ? "4px 4px 0 0" : "0 0 4px 4px",
                    };
            return (
              <div
                key={point.key}
                data-testid="financial-slot"
                data-missing={point.value == null ? "true" : undefined}
                className="relative flex-1 cursor-pointer"
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") setActive(index);
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType === "mouse") setActive(null);
                }}
                onClick={() => setActive((current) => (current === index ? null : index))}
              >
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 transition-[filter,outline-color] duration-150 ease-out motion-reduce:transition-none"
                  style={{
                    ...shape,
                    filter: isActive ? "brightness(1.35) saturate(1.1)" : undefined,
                    outline: isActive
                      ? `1.5px solid color-mix(in oklab, ${color} 75%, white)`
                      : "1.5px solid transparent",
                    outlineOffset: 1,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {hasAxisLabels && (
        <div aria-hidden="true" className="mt-1 flex">
          {points.map((point, index) => (
            <span
              key={point.key}
              className={`flex-1 text-center text-[10px] tabular-nums transition-colors duration-150 motion-reduce:transition-none ${active === index ? "font-semibold text-foreground" : "text-muted-foreground"}`}
            >
              {point.axisLabel}
            </span>
          ))}
        </div>
      )}

      <div
        aria-hidden="true"
        data-testid="financial-readout"
        className="mt-1 flex h-5 items-center gap-1.5 whitespace-nowrap text-xs"
      >
        {activePoint && (
          <>
            <span
              className="size-2 shrink-0 rounded-sm"
              style={{ backgroundColor: color, opacity: activePoint.value == null ? 0.5 : 1 }}
            />
            <span className="font-semibold">{activePoint.heading}</span>
            <span className="ml-auto truncate font-medium tabular-nums text-foreground">
              {activePoint.value == null ? noDataLabel : format(activePoint.value)}
            </span>
          </>
        )}
      </div>
      <p aria-live="polite" className="sr-only">
        {activeText}
      </p>
    </div>
  );
}
