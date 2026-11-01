import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  allocationDrift,
  currentAllocationValues,
  readAllocationTargets,
  ALLOCATION_TARGETS_EVENT,
} from "@/lib/allocation-alerts";
import { usePortfolio } from "@/lib/store";
import type { Lang } from "@/lib/i18n";
import type { AssetType } from "@/lib/portfolio";

const LABEL: Record<Lang, Record<string, string>> = {
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

const MESSAGE: Record<Lang, (assetClass: string, deviation: string) => string> = {
  en: (assetClass, deviation) => `${assetClass} allocation is ${deviation} pp from your target.`,
  bg: (assetClass, deviation) =>
    `Делът на „${assetClass}“ се отклонява с ${deviation} п.п. от целта.`,
  de: (assetClass, deviation) =>
    `Die Gewichtung von ${assetClass} weicht ${deviation} Prozentpunkte vom Ziel ab.`,
  es: (assetClass, deviation) =>
    `La asignación de ${assetClass} se desvía ${deviation} pp del objetivo.`,
  it: (assetClass, deviation) =>
    `L'allocazione di ${assetClass} si discosta di ${deviation} pp dall'obiettivo.`,
};

export function AllocationDriftMonitor() {
  const p = usePortfolio();
  const userId = p.user?.id;
  const current = useMemo(() => currentAllocationValues(p.holdings), [p.holdings]);
  const alerted = useRef(new Set<AssetType>());

  useEffect(() => {
    if (!p.isPro || !userId) return;
    const check = () => {
      try {
        const targets = readAllocationTargets(userId);
        if (!targets) return;
        const rows = allocationDrift(current, targets);
        const outside = new Set<AssetType>(
          rows.filter((row) => row.outsideTolerance).map((row) => row.assetType),
        );
        for (const row of rows) {
          if (!row.outsideTolerance) {
            alerted.current.delete(row.assetType);
            continue;
          }
          if (alerted.current.has(row.assetType)) continue;
          alerted.current.add(row.assetType);
          toast.info(
            MESSAGE[p.lang](
              LABEL[p.lang][row.assetType] ?? row.assetType,
              Math.abs(row.deviation).toFixed(1),
            ),
          );
        }
        for (const type of alerted.current) {
          if (!outside.has(type)) alerted.current.delete(type);
        }
      } catch (error) {
        console.error("Unable to check allocation drift", error);
      }
    };
    check();
    window.addEventListener(ALLOCATION_TARGETS_EVENT, check);
    window.addEventListener("storage", check);
    return () => {
      window.removeEventListener(ALLOCATION_TARGETS_EVENT, check);
      window.removeEventListener("storage", check);
    };
  }, [current, p.isPro, p.lang, userId]);

  return null;
}
