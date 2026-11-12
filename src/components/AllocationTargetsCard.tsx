import { Card } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  ALLOCATION_CLASSES,
  allocationDrift,
  currentAllocationValues,
  readAllocationTargets,
  removeAllocationTargets,
  writeAllocationTargets,
  type AllocationTargets,
} from "@/lib/allocation-alerts";
import type { Lang } from "@/lib/i18n";
import type { AssetType } from "@/lib/portfolio";
import { usePortfolio } from "@/lib/store";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Copy = {
  title: string;
  description: string;
  target: string;
  tolerance: string;
  save: string;
  clear: string;
  saved: string;
  cleared: string;
  invalid: string;
  current: string;
  deviation: (value: string) => string;
  balanced: string;
  noValues: string;
  local: string;
  signIn: string;
};

const COPY: Record<Lang, Copy> = {
  en: {
    title: "Allocation drift alerts",
    description:
      "Set your preferred asset-class weights and an allowed deviation in percentage points.",
    target: "Target weight (%)",
    tolerance: "Allowed deviation (pp)",
    save: "Save targets",
    clear: "Remove targets",
    saved: "Allocation targets saved on this device.",
    cleared: "Allocation targets removed.",
    invalid: "Targets must total 100% and the tolerance must be between 0 and 50.",
    current: "Current",
    deviation: (value) => `${value} pp from target`,
    balanced: "All configured classes are within your tolerance.",
    noValues: "Add positions with current values to compare your allocation.",
    local:
      "These preferences are stored locally on this device. In-app alerts appear when you open CapiSpot.",
    signIn: "Sign in to save allocation preferences.",
  },
  bg: {
    title: "Известия при отклонение от целите",
    description: "Задай желани тегла по класове активи и допустимо отклонение в процентни пункта.",
    target: "Целево тегло (%)",
    tolerance: "Допустимо отклонение (п.п.)",
    save: "Запази целите",
    clear: "Премахни целите",
    saved: "Целите за разпределение са запазени на това устройство.",
    cleared: "Целите за разпределение са премахнати.",
    invalid: "Целите трябва да са общо 100%, а отклонението — между 0 и 50 п.п.",
    current: "Текущо",
    deviation: (value) => `${value} п.п. от целта`,
    balanced: "Всички настроени класове са в допустимото отклонение.",
    noValues: "Добави позиции с текущи стойности, за да сравниш разпределението.",
    local:
      "Настройките се пазят локално на това устройство. Известието в приложението се показва при отваряне на CapiSpot.",
    signIn: "Влез в профила си, за да запазиш настройките за разпределение.",
  },
  de: {
    title: "Benachrichtigungen bei Abweichungen",
    description: "Lege Zielgewichte je Anlageklasse und eine Toleranz in Prozentpunkten fest.",
    target: "Zielgewicht (%)",
    tolerance: "Toleranz (Prozentpunkte)",
    save: "Ziele speichern",
    clear: "Ziele entfernen",
    saved: "Allokationsziele auf diesem Gerät gespeichert.",
    cleared: "Allokationsziele entfernt.",
    invalid: "Die Ziele müssen zusammen 100 % ergeben; die Toleranz muss zwischen 0 und 50 liegen.",
    current: "Aktuell",
    deviation: (value) => `${value} Prozentpunkte vom Ziel`,
    balanced: "Alle festgelegten Klassen liegen innerhalb der Toleranz.",
    noValues: "Füge Positionen mit aktuellen Werten hinzu, um die Aufteilung zu vergleichen.",
    local:
      "Diese Einstellungen werden lokal auf diesem Gerät gespeichert. In-App-Hinweise erscheinen beim Öffnen von CapiSpot.",
    signIn: "Melde dich an, um Allokationseinstellungen zu speichern.",
  },
  es: {
    title: "Avisos de desviación de asignación",
    description:
      "Define pesos objetivo por clase y una desviación permitida en puntos porcentuales.",
    target: "Peso objetivo (%)",
    tolerance: "Desviación permitida (pp)",
    save: "Guardar objetivos",
    clear: "Eliminar objetivos",
    saved: "Objetivos guardados en este dispositivo.",
    cleared: "Objetivos eliminados.",
    invalid: "Los objetivos deben sumar 100 % y la tolerancia debe estar entre 0 y 50.",
    current: "Actual",
    deviation: (value) => `${value} pp respecto al objetivo`,
    balanced: "Todas las clases configuradas están dentro de la tolerancia.",
    noValues: "Añade posiciones con valores actuales para comparar la asignación.",
    local:
      "Estas preferencias se guardan localmente en este dispositivo. Los avisos aparecen al abrir CapiSpot.",
    signIn: "Inicia sesión para guardar las preferencias de asignación.",
  },
  it: {
    title: "Avvisi di scostamento dell'allocazione",
    description:
      "Imposta i pesi obiettivo per classe e uno scostamento consentito in punti percentuali.",
    target: "Peso obiettivo (%)",
    tolerance: "Scostamento consentito (pp)",
    save: "Salva obiettivi",
    clear: "Rimuovi obiettivi",
    saved: "Obiettivi salvati su questo dispositivo.",
    cleared: "Obiettivi rimossi.",
    invalid: "Gli obiettivi devono totalizzare il 100% e la tolleranza deve essere tra 0 e 50.",
    current: "Attuale",
    deviation: (value) => `${value} pp dall'obiettivo`,
    balanced: "Tutte le classi configurate sono entro la tolleranza.",
    noValues: "Aggiungi posizioni con valori attuali per confrontare l'allocazione.",
    local:
      "Queste preferenze sono salvate localmente su questo dispositivo. Gli avvisi appaiono all'apertura di CapiSpot.",
    signIn: "Accedi per salvare le preferenze di allocazione.",
  },
};

const LABELS: Record<Lang, Record<AssetType, string>> = {
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

const DEFAULT: AllocationTargets = {
  targets: { stock: 60, etf: 40, crypto: 0, bond: 0, cash: 0, realEstate: 0 },
  tolerance: 5,
};

export function AllocationTargetsCard() {
  const p = usePortfolio();
  const c = COPY[p.lang];
  const values = useMemo(() => currentAllocationValues(p.holdings), [p.holdings]);
  const [targets, setTargets] = useState<AllocationTargets["targets"]>(DEFAULT.targets);
  const [tolerance, setTolerance] = useState(DEFAULT.tolerance);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    setTargets(DEFAULT.targets);
    setTolerance(DEFAULT.tolerance);
    setConfigured(false);
    if (!p.user) return;
    try {
      const saved = readAllocationTargets(p.user.id);
      if (saved) {
        setTargets({ ...DEFAULT.targets, ...saved.targets });
        setTolerance(saved.tolerance);
        setConfigured(true);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load allocation preferences.",
      );
    }
  }, [p.user]);

  const rows = useMemo(
    () => allocationDrift(values, { targets, tolerance }),
    [targets, tolerance, values],
  );
  const totalTarget = ALLOCATION_CLASSES.reduce(
    (sum, assetType) => sum + (targets[assetType] ?? 0),
    0,
  );

  const save = () => {
    if (!p.user) {
      toast.error(c.signIn);
      return;
    }
    if (Math.abs(totalTarget - 100) > 0.01 || tolerance < 0 || tolerance > 50) {
      toast.error(c.invalid);
      return;
    }
    try {
      writeAllocationTargets(p.user.id, { targets, tolerance });
      setConfigured(true);
      toast.success(c.saved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : c.invalid);
    }
  };

  const clear = () => {
    if (!p.user) {
      toast.error(c.signIn);
      return;
    }
    try {
      removeAllocationTargets(p.user.id);
      setTargets(DEFAULT.targets);
      setTolerance(DEFAULT.tolerance);
      setConfigured(false);
      toast.success(c.cleared);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to remove allocation preferences.",
      );
    }
  };

  return (
    <Card className="lg:col-span-2">
      <h2 className="font-display font-semibold">{c.title}</h2>
      <p className="mb-4 mt-1 text-xs text-muted-foreground">{c.description}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {ALLOCATION_CLASSES.map((assetType) => (
          <label
            key={assetType}
            className="flex items-center justify-between gap-3 rounded-lg bg-secondary/50 px-3 py-2 text-sm"
          >
            <span>{LABELS[p.lang][assetType]}</span>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={targets[assetType] ?? 0}
              aria-label={`${LABELS[p.lang][assetType]} ${c.target}`}
              onChange={(event) =>
                setTargets((current) => ({
                  ...current,
                  [assetType]: Number(event.target.value) || 0,
                }))
              }
              className="h-9 w-20 rounded-md border border-input bg-background px-2 text-right tabular-nums"
            />
          </label>
        ))}
      </div>
      <p
        className={`mt-2 text-xs ${Math.abs(totalTarget - 100) <= 0.01 ? "text-muted-foreground" : "text-destructive"}`}
      >
        {c.target}: {totalTarget.toFixed(0)}%
      </p>
      <label className="mt-3 flex items-center gap-3 text-sm">
        <span>{c.tolerance}</span>
        <input
          type="number"
          min={0}
          max={50}
          step={0.5}
          value={tolerance}
          onChange={(event) =>
            setTolerance(Math.min(50, Math.max(0, Number(event.target.value) || 0)))
          }
          className="h-9 w-20 rounded-md border border-input bg-background px-2 text-right tabular-nums"
        />
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={save}>
          {c.save}
        </Button>
        {configured && (
          <Button type="button" variant="secondary" onClick={clear}>
            {c.clear}
          </Button>
        )}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{c.local}</p>
      {configured && (
        <div className="mt-4 space-y-2" aria-live="polite">
          {!rows.length ? (
            <p className="text-sm text-muted-foreground">{c.noValues}</p>
          ) : rows.some((row) => row.outsideTolerance) ? (
            rows
              .filter((row) => row.outsideTolerance)
              .map((row) => (
                <p
                  key={row.assetType}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm"
                >
                  <b>{LABELS[p.lang][row.assetType]}</b>: {c.current} {row.current.toFixed(1)}% ·{" "}
                  {c.deviation(row.deviation.toFixed(1))}
                </p>
              ))
          ) : (
            <p className="text-sm text-success">{c.balanced}</p>
          )}
        </div>
      )}
    </Card>
  );
}
