import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { usePortfolio } from "@/lib/store";
import { classValues } from "@/lib/tools";
import type { AssetType } from "@/lib/portfolio";
import type { Lang } from "@/lib/i18n";

const TYPES: AssetType[] = ["stock", "etf", "crypto", "bond", "cash", "realEstate"];

const COPY: Record<
  Lang,
  {
    title: string;
    description: string;
    shock: string;
    monthly: string;
    months: string;
    current: string;
    after: string;
    contribution: string;
    total: string;
    impact: string;
    assumptions: string;
    missing: string;
    reset: string;
    scenarioName: string;
    saveScenario: string;
    savedScenarios: string;
    remove: string;
    savedImpact: string;
  }
> = {
  en: {
    title: "Scenario Studio",
    description:
      "Explore how hypothetical class-level price changes could affect today's portfolio.",
    shock: "Hypothetical price change",
    monthly: "Monthly contribution (USD)",
    months: "Months of contributions",
    current: "Current value",
    after: "After hypothetical change",
    contribution: "Added contributions",
    total: "Scenario total",
    impact: "Change versus today",
    assumptions:
      "Illustrative only: each class receives the same price change; contributions add cash with no investment return. No forecast, fees, taxes or future price data.",
    missing: "Holdings without valid current values are excluded from this scenario.",
    reset: "Reset assumptions",
    scenarioName: "Scenario name",
    saveScenario: "Save scenario",
    savedScenarios: "Compare saved scenarios",
    remove: "Remove",
    savedImpact: "change vs today",
  },
  bg: {
    title: "Студио за сценарии",
    description:
      "Разгледай как хипотетични промени в цените по класове биха повлияли на портфейла днес.",
    shock: "Хипотетична промяна в цената",
    monthly: "Месечна вноска (USD)",
    months: "Месеци с вноски",
    current: "Текуща стойност",
    after: "След хипотетичната промяна",
    contribution: "Добавени вноски",
    total: "Общо по сценария",
    impact: "Промяна спрямо днес",
    assumptions:
      "Само илюстрация: всеки клас получава еднаква промяна в цената; вноските се добавят като пари без доходност. Не е прогноза и не включва такси, данъци или бъдещи цени.",
    missing: "Позиции без валидна текуща стойност не участват в сценария.",
    reset: "Нулирай допусканията",
    scenarioName: "Име на сценария",
    saveScenario: "Запази сценария",
    savedScenarios: "Сравни запазените сценарии",
    remove: "Премахни",
    savedImpact: "промяна спрямо днес",
  },
  de: {
    title: "Szenario-Studio",
    description:
      "Untersuche, wie hypothetische Preisänderungen je Anlageklasse das heutige Portfolio beeinflussen könnten.",
    shock: "Hypothetische Preisänderung",
    monthly: "Monatlicher Beitrag (USD)",
    months: "Monate mit Beiträgen",
    current: "Aktueller Wert",
    after: "Nach hypothetischer Änderung",
    contribution: "Zusätzliche Beiträge",
    total: "Szenario gesamt",
    impact: "Änderung gegenüber heute",
    assumptions:
      "Nur zur Veranschaulichung: Jede Klasse erhält dieselbe Preisänderung; Beiträge werden ohne Rendite als Bargeld addiert. Keine Prognose; Gebühren, Steuern und künftige Preise sind nicht enthalten.",
    missing: "Positionen ohne gültigen aktuellen Wert sind ausgeschlossen.",
    reset: "Annahmen zurücksetzen",
    scenarioName: "Szenarioname",
    saveScenario: "Szenario speichern",
    savedScenarios: "Gespeicherte Szenarien vergleichen",
    remove: "Entfernen",
    savedImpact: "Änderung gegenüber heute",
  },
  es: {
    title: "Estudio de escenarios",
    description: "Explora cómo cambios hipotéticos por clase podrían afectar a la cartera actual.",
    shock: "Cambio hipotético de precio",
    monthly: "Aportación mensual (USD)",
    months: "Meses de aportaciones",
    current: "Valor actual",
    after: "Tras el cambio hipotético",
    contribution: "Aportaciones añadidas",
    total: "Total del escenario",
    impact: "Cambio respecto a hoy",
    assumptions:
      "Solo ilustrativo: cada clase recibe el mismo cambio de precio; las aportaciones se suman como efectivo, sin rendimiento. No es una previsión y no incluye comisiones, impuestos ni precios futuros.",
    missing: "Se excluyen las posiciones sin un valor actual válido.",
    reset: "Restablecer supuestos",
    scenarioName: "Nombre del escenario",
    saveScenario: "Guardar escenario",
    savedScenarios: "Comparar escenarios guardados",
    remove: "Eliminar",
    savedImpact: "cambio frente a hoy",
  },
  it: {
    title: "Studio degli scenari",
    description:
      "Esplora come variazioni ipotetiche dei prezzi per classe potrebbero influire sul portafoglio attuale.",
    shock: "Variazione ipotetica del prezzo",
    monthly: "Contributo mensile (USD)",
    months: "Mesi di contributi",
    current: "Valore attuale",
    after: "Dopo la variazione ipotetica",
    contribution: "Contributi aggiunti",
    total: "Totale scenario",
    impact: "Variazione rispetto a oggi",
    assumptions:
      "Solo a scopo illustrativo: ogni classe riceve la stessa variazione; i contributi si aggiungono come liquidità senza rendimento. Non è una previsione e non include commissioni, imposte o prezzi futuri.",
    missing: "Le posizioni senza un valore attuale valido sono escluse.",
    reset: "Reimposta ipotesi",
    scenarioName: "Nome dello scenario",
    saveScenario: "Salva scenario",
    savedScenarios: "Confronta gli scenari salvati",
    remove: "Rimuovi",
    savedImpact: "variazione rispetto a oggi",
  },
};

const TYPE_LABELS: Record<Lang, Record<AssetType, string>> = {
  en: {
    stock: "Stocks",
    etf: "ETFs",
    crypto: "Crypto",
    bond: "Bonds",
    cash: "Cash",
    realEstate: "Real estate",
  },
  bg: {
    stock: "Акции",
    etf: "ETF-и",
    crypto: "Крипто",
    bond: "Облигации",
    cash: "Пари",
    realEstate: "Имоти",
  },
  de: {
    stock: "Aktien",
    etf: "ETFs",
    crypto: "Krypto",
    bond: "Anleihen",
    cash: "Bargeld",
    realEstate: "Immobilien",
  },
  es: {
    stock: "Acciones",
    etf: "ETF",
    crypto: "Cripto",
    bond: "Bonos",
    cash: "Efectivo",
    realEstate: "Inmuebles",
  },
  it: {
    stock: "Azioni",
    etf: "ETF",
    crypto: "Cripto",
    bond: "Obbligazioni",
    cash: "Liquidità",
    realEstate: "Immobili",
  },
};

export function ScenarioStudio() {
  const p = usePortfolio();
  const c = COPY[p.lang];
  const [shocks, setShocks] = useState<Partial<Record<AssetType, number>>>({});
  const [monthly, setMonthly] = useState(0);
  const [months, setMonths] = useState(12);
  const [scenarioName, setScenarioName] = useState("");
  const [saved, setSaved] = useState<
    { name: string; shocks: Partial<Record<AssetType, number>>; monthly: number; months: number }[]
  >([]);
  useEffect(() => {
    const key = `folio-scenarios:${p.user?.id ?? "guest"}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      setSaved([]);
      return;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      setSaved(
        Array.isArray(parsed)
          ? parsed
              .filter(
                (item): item is (typeof saved)[number] =>
                  !!item &&
                  typeof item.name === "string" &&
                  item.shocks &&
                  typeof item.shocks === "object" &&
                  Number.isFinite(item.monthly) &&
                  Number.isFinite(item.months),
              )
              .slice(0, 5)
          : [],
      );
    } catch {
      setSaved([]);
    }
  }, [p.user?.id]);
  const values = useMemo(() => classValues(p.holdings), [p.holdings]);
  const classes = TYPES.filter((type) => (values[type] ?? 0) > 0);
  const currentValue = classes.reduce((sum, type) => sum + (values[type] ?? 0), 0);
  const shockedValue = classes.reduce(
    (sum, type) => sum + (values[type] ?? 0) * (1 + (shocks[type] ?? 0) / 100),
    0,
  );
  const contributions = monthly * months;
  const scenarioTotal = shockedValue + contributions;

  const money = (value: number) => p.money(value);
  const change = scenarioTotal - currentValue;

  return (
    <Card className="lg:col-span-2">
      <h2 className="font-display font-semibold">{c.title}</h2>
      <p className="mb-4 mt-1 text-xs text-muted-foreground">{c.description}</p>
      {classes.length ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {classes.map((type) => (
              <label key={type} className="rounded-xl border border-border p-3">
                <span className="flex items-center justify-between gap-2 text-sm font-medium">
                  {TYPE_LABELS[p.lang][type]}
                  <output className="tabular-nums text-muted-foreground">
                    {(shocks[type] ?? 0) > 0 ? "+" : ""}
                    {shocks[type] ?? 0}%
                  </output>
                </span>
                <span className="mt-2 block text-xs text-muted-foreground">{c.shock}</span>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  step={1}
                  value={shocks[type] ?? 0}
                  onChange={(event) =>
                    setShocks((current) => ({ ...current, [type]: Number(event.target.value) }))
                  }
                  className="mt-1 w-full accent-primary"
                  aria-label={`${TYPE_LABELS[p.lang][type]} ${c.shock}`}
                />
              </label>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs text-muted-foreground">
              {c.monthly}
              <input
                type="number"
                min={0}
                max={1_000_000}
                step={50}
                value={monthly}
                onChange={(event) =>
                  setMonthly(Math.min(1_000_000, Math.max(0, Number(event.target.value) || 0)))
                }
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              {c.months}
              <input
                type="number"
                min={1}
                max={60}
                value={months}
                onChange={(event) =>
                  setMonths(Math.min(60, Math.max(1, Number(event.target.value) || 1)))
                }
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              />
            </label>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <Result label={c.current} value={money(currentValue)} />
            <Result label={c.after} value={money(shockedValue)} />
            <Result label={c.contribution} value={money(contributions)} />
            <Result label={c.total} value={money(scenarioTotal)} />
            <Result label={c.impact} value={money(change)} />
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{c.assumptions}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="scenario-name">
              {c.scenarioName}
            </label>
            <input
              id="scenario-name"
              value={scenarioName}
              maxLength={40}
              onChange={(event) => setScenarioName(event.target.value)}
              placeholder={c.scenarioName}
              className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={!scenarioName.trim() || saved.length >= 5}
              onClick={() => {
                const next = [
                  ...saved,
                  { name: scenarioName.trim(), shocks: { ...shocks }, monthly, months },
                ];
                setSaved(next);
                localStorage.setItem(
                  `folio-scenarios:${p.user?.id ?? "guest"}`,
                  JSON.stringify(next),
                );
                setScenarioName("");
              }}
            >
              {c.saveScenario}
            </Button>
          </div>
          {!!saved.length && (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-medium">{c.savedScenarios}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {saved.map((scenario, index) => {
                  const total =
                    classes.reduce(
                      (sum, type) =>
                        sum + (values[type] ?? 0) * (1 + (scenario.shocks[type] ?? 0) / 100),
                      0,
                    ) +
                    scenario.monthly * scenario.months;
                  return (
                    <div
                      key={`${scenario.name}-${index}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
                    >
                      <span className="min-w-0 truncate font-medium">{scenario.name}</span>
                      <span className="shrink-0 text-right tabular-nums">
                        <span className="block">{money(total)}</span>
                        <span className="block text-xs text-muted-foreground">
                          {c.savedImpact}: {money(total - currentValue)}
                        </span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const next = saved.filter((_, itemIndex) => itemIndex !== index);
                          setSaved(next);
                          localStorage.setItem(
                            `folio-scenarios:${p.user?.id ?? "guest"}`,
                            JSON.stringify(next),
                          );
                        }}
                      >
                        {c.remove}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {p.holdings.some((holding) => !Number.isFinite(holding.value)) && (
            <p className="mt-2 text-xs text-muted-foreground">{c.missing}</p>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => {
              setShocks({});
              setMonthly(0);
              setMonths(12);
            }}
          >
            {c.reset}
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{c.missing}</p>
      )}
    </Card>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/60 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-display font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
