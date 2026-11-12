import { useCountUp } from "@/hooks/use-count-up";

export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  return <>{format(useCountUp(value))}</>;
}

/** Tiny inline trend line from real closes; colored by direction. */
export function Sparkline({ data, className }: { data: number[]; className?: string }) {
  if (data.length < 2) return null;
  const w = 80;
  const h = 26;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map(
    (v, i) => [(i / (data.length - 1)) * w, h - 2 - ((v - min) / span) * (h - 4)] as const,
  );
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const up = (data.at(-1) ?? 0) >= (data[0] ?? 0);
  const color = up ? "var(--success)" : "var(--destructive)";
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      aria-hidden
      className={className}
      style={{ overflow: "visible" }}
    >
      <path d={`${line} L${w} ${h} L0 ${h} Z`} fill={color} opacity={0.12} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EmptyIllustration() {
  return (
    <svg viewBox="0 0 160 110" width={160} height={110} aria-hidden className="empty-illustration">
      <defs>
        <linearGradient id="eg" x1="0" x2="1">
          <stop offset="0" stopColor="var(--sun)" />
          <stop offset="0.5" stopColor="var(--blossom)" />
          <stop offset="1" stopColor="var(--violet)" />
        </linearGradient>
      </defs>
      <rect x="14" y="58" width="22" height="40" rx="6" fill="var(--violet)" opacity=".35" />
      <rect x="46" y="40" width="22" height="58" rx="6" fill="var(--blossom)" opacity=".4" />
      <rect x="78" y="48" width="22" height="50" rx="6" fill="var(--sun)" opacity=".45" />
      <rect x="110" y="22" width="22" height="76" rx="6" fill="var(--primary)" opacity=".5" />
      <path
        d="M10 74 L44 52 L76 60 L122 16"
        fill="none"
        stroke="url(#eg)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="122" cy="16" r="5" fill="var(--primary)" />
    </svg>
  );
}
