import { useMemo, useState } from "react";
import { Card } from "@/components/AppShell";
import { goalProjection } from "@/lib/insights";
import { languageLocale, type Lang } from "@/lib/i18n";
import { usePortfolio } from "@/lib/store";

const COPY: Record<
  Lang,
  {
    title: string;
    note: string;
    start: string;
    monthly: string;
    ret: string;
    years: string;
    final: string;
    contributed: string;
    growth: string;
  }
> = {
  en: {
    title: "Compound growth calculator",
    note: "Free illustration using your own assumed return. It is not a forecast.",
    start: "Starting amount",
    monthly: "Monthly contribution",
    ret: "Assumed annual return (%)",
    years: "Years",
    final: "Estimated value",
    contributed: "You contribute",
    growth: "Growth from returns",
  },
  bg: {
    title: "Калкулатор за сложна лихва",
    note: "Безплатна илюстрация с вашата собствена предполагаема доходност. Не е прогноза.",
    start: "Начална сума",
    monthly: "Месечна вноска",
    ret: "Предполагаема годишна доходност (%)",
    years: "Години",
    final: "Приблизителна стойност",
    contributed: "Ваши вноски",
    growth: "Растеж от доходност",
  },
  de: {
    title: "Zinseszins-Rechner",
    note: "Kostenlose Illustration mit Ihrer eigenen angenommenen Rendite. Keine Prognose.",
    start: "Startbetrag",
    monthly: "Monatliche Einzahlung",
    ret: "Angenommene Jahresrendite (%)",
    years: "Jahre",
    final: "Geschätzter Wert",
    contributed: "Ihre Einzahlungen",
    growth: "Wachstum durch Rendite",
  },
  es: {
    title: "Calculadora de interés compuesto",
    note: "Ilustración gratuita con tu propia rentabilidad supuesta. No es una previsión.",
    start: "Importe inicial",
    monthly: "Aportación mensual",
    ret: "Rentabilidad anual supuesta (%)",
    years: "Años",
    final: "Valor estimado",
    contributed: "Tus aportaciones",
    growth: "Crecimiento por rentabilidad",
  },
  it: {
    title: "Calcolatore di interesse composto",
    note: "Illustrazione gratuita con il rendimento ipotizzato da te. Non è una previsione.",
    start: "Importo iniziale",
    monthly: "Versamento mensile",
    ret: "Rendimento annuo ipotizzato (%)",
    years: "Anni",
    final: "Valore stimato",
    contributed: "I tuoi versamenti",
    growth: "Crescita dai rendimenti",
  },
};

const clamp = (value: string, min: number, max: number) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
};

export function CompoundCalculator() {
  const p = usePortfolio();
  const c = COPY[p.lang];
  const [start, setStart] = useState("5000");
  const [monthly, setMonthly] = useState("300");
  const [ret, setRet] = useState("7");
  const [years, setYears] = useState("20");
  const result = useMemo(() => {
    const current = clamp(start, 0, 1e9);
    const contribution = clamp(monthly, 0, 1e7);
    const months = Math.round(clamp(years, 1, 60) * 12);
    const final = goalProjection({
      current,
      monthly: contribution,
      annualReturnPct: clamp(ret, -50, 50),
      months,
    });
    const contributed = current + contribution * months;
    return { final, contributed, growth: final - contributed };
  }, [start, monthly, ret, years]);
  const money = (value: number) =>
    new Intl.NumberFormat(languageLocale(p.lang), {
      style: "currency",
      currency: p.currency,
      maximumFractionDigits: 0,
    }).format(value);
  const input =
    "mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-base text-foreground sm:h-10 sm:text-sm";
  const fields: [string, string, (v: string) => void][] = [
    [c.start, start, setStart],
    [c.monthly, monthly, setMonthly],
    [c.ret, ret, setRet],
    [c.years, years, setYears],
  ];
  return (
    <Card className="lg:col-span-2">
      <h2 className="font-display font-semibold">{c.title}</h2>
      <p className="mb-3 text-xs text-muted-foreground">{c.note}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {fields.map(([label, value, set]) => (
          <label key={label} className="text-xs text-muted-foreground">
            {label}
            <input
              type="number"
              inputMode="decimal"
              className={input}
              value={value}
              onChange={(e) => set(e.target.value)}
            />
          </label>
        ))}
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-secondary/50 p-3">
          <dt className="text-xs text-muted-foreground">{c.final}</dt>
          <dd className="font-display text-xl font-bold">{money(result.final)}</dd>
        </div>
        <div className="rounded-xl bg-secondary/50 p-3">
          <dt className="text-xs text-muted-foreground">{c.contributed}</dt>
          <dd className="font-display text-xl font-bold">{money(result.contributed)}</dd>
        </div>
        <div className="rounded-xl bg-secondary/50 p-3">
          <dt className="text-xs text-muted-foreground">{c.growth}</dt>
          <dd className="font-display text-xl font-bold">{money(result.growth)}</dd>
        </div>
      </dl>
    </Card>
  );
}
