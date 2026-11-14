import { useState } from "react";
import { languageLocale, type Lang } from "@/lib/i18n";
import type { CompanyResearchData } from "@/lib/market.functions";

const KEYS = ["strongBuy", "buy", "hold", "sell", "strongSell"] as const;
const COLORS = [
  "var(--flow-operating)",
  "var(--flow-revenue)",
  "var(--flow-cost)",
  "var(--flow-expense)",
  "var(--flow-tax)",
];
const COPY = {
  en: {
    period: "Recommendation period",
    ratings: "Ratings",
    history: "Monthly rating totals",
    current: "Current",
    ago: (n: string) => `${n} ${n === "1" ? "month" : "months"} ago`,
  },
  bg: {
    period: "Период на оценките",
    ratings: "Оценки",
    history: "Общ брой оценки по месеци",
    current: "Текущ",
    ago: (n: string) => `Преди ${n} мес.`,
  },
  de: {
    period: "Bewertungszeitraum",
    ratings: "Bewertungen",
    history: "Monatliche Gesamtzahlen",
    current: "Aktuell",
    ago: (n: string) => `Vor ${n} Monaten`,
  },
  es: {
    period: "Período de valoraciones",
    ratings: "Valoraciones",
    history: "Totales mensuales",
    current: "Actual",
    ago: (n: string) => `Hace ${n} meses`,
  },
  it: {
    period: "Periodo delle valutazioni",
    ratings: "Valutazioni",
    history: "Totali mensili",
    current: "Attuale",
    ago: (n: string) => `${n} mesi fa`,
  },
} satisfies Record<
  Lang,
  { period: string; ratings: string; history: string; current: string; ago: (n: string) => string }
>;

export function RecommendationTrend({
  recommendations,
  names,
  lang,
  unavailable,
}: {
  recommendations: CompanyResearchData["recommendations"];
  names: readonly string[];
  lang: Lang;
  unavailable: string;
}) {
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const c = COPY[lang];
  const periodName = (period: string) =>
    period === "0m" ? c.current : /^-\d+m$/.test(period) ? c.ago(period.slice(1, -1)) : period;
  const selected =
    recommendations.find((item) => item.period === selectedPeriod) ?? recommendations[0];
  const total = selected ? KEYS.reduce((sum, key) => sum + selected[key], 0) : 0;
  const format = new Intl.NumberFormat(languageLocale(lang), { maximumFractionDigits: 1 });
  let offset = 0;
  return (
    <div className="space-y-4">
      {selected && (
        <label className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          {c.period}
          <select
            aria-label={c.period}
            value={selected.period}
            onChange={(event) => setSelectedPeriod(event.target.value)}
            className="min-h-10 max-w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          >
            {recommendations.map((item) => (
              <option key={item.period} value={item.period}>
                {periodName(item.period)}
              </option>
            ))}
          </select>
        </label>
      )}
      {selected && total > 0 ? (
        <div className="recommendation-summary">
          <div className="relative mx-auto size-44 shrink-0">
            <svg
              viewBox="0 0 180 180"
              role="img"
              aria-label={`${format.format(total)} ${c.ratings} · ${periodName(selected.period)}`}
              className="size-full"
            >
              {KEYS.map((key, index) => {
                const percent = (selected[key] / total) * 100;
                const start = offset;
                offset += percent;
                return selected[key] > 0 ? (
                  <circle
                    key={key}
                    data-recommendation-segment={key}
                    cx={90}
                    cy={90}
                    r={70}
                    pathLength={100}
                    fill="none"
                    stroke={COLORS[index]}
                    strokeWidth={20}
                    strokeDasharray={`${percent} ${100 - percent}`}
                    strokeDashoffset={-start}
                    transform="rotate(-90 90 90)"
                  />
                ) : null;
              })}
            </svg>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
            >
              <span className="numeric-display text-3xl font-bold">{format.format(total)}</span>
              <span className="text-xs text-muted-foreground">{c.ratings}</span>
            </div>
          </div>
          <ul aria-label={c.ratings} className="min-w-0 space-y-2.5">
            {KEYS.map((key, index) => (
              <li
                key={key}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <i
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: COLORS[index] }}
                  />
                  {names[index]}
                </span>
                <strong className="tabular-nums">{format.format(selected[key])}</strong>
                <span className="min-w-14 text-right tabular-nums text-muted-foreground">
                  {format.format((selected[key] / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="py-4 text-sm text-muted-foreground">{unavailable}</p>
      )}
      {recommendations.length > 0 && (
        <div className="border-t border-border/60 pt-3">
          <p className="mb-2 text-xs text-muted-foreground">{c.history}</p>
          <dl className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
            {recommendations.slice(0, 4).map((item) => (
              <div key={item.period}>
                <dt className="text-muted-foreground">{periodName(item.period)}</dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {format.format(KEYS.reduce((sum, key) => sum + item[key], 0))}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
