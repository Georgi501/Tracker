import { toast } from "sonner";
import type { Lang } from "./i18n";

const COPY: Record<Lang, { undo: string; done: (count: number) => string; partial: string }> = {
  en: {
    undo: "Undo import",
    done: (count) => `${count} imported transactions removed.`,
    partial:
      "Some imported transactions were already unavailable; the remaining ones were removed.",
  },
  bg: {
    undo: "Отмени импорта",
    done: (count) => `Премахнати са ${count} импортирани сделки.`,
    partial: "Някои импортирани сделки вече липсват; останалите са премахнати.",
  },
  de: {
    undo: "Import rückgängig",
    done: (count) => `${count} importierte Transaktionen entfernt.`,
    partial:
      "Einige importierte Transaktionen waren nicht mehr vorhanden; die übrigen wurden entfernt.",
  },
  es: {
    undo: "Deshacer importación",
    done: (count) => `Se eliminaron ${count} operaciones importadas.`,
    partial:
      "Algunas operaciones importadas ya no estaban disponibles; se eliminaron las restantes.",
  },
  it: {
    undo: "Annulla importazione",
    done: (count) => `Rimosse ${count} operazioni importate.`,
    partial: "Alcune operazioni importate non erano più disponibili; le altre sono state rimosse.",
  },
};

export function notifyImportWithUndo(
  message: string,
  transactionIds: string[],
  createdAssetIds: string[],
  lang: Lang,
  undoImport: (transactionIds: string[], assetIds: string[]) => Promise<number>,
) {
  const copy = COPY[lang];
  toast.success(message, {
    duration: 10_000,
    action: {
      label: copy.undo,
      onClick: () => {
        void undoImport(transactionIds, createdAssetIds)
          .then((count) => {
            if (count === transactionIds.length) toast.success(copy.done(count));
            else toast.error(copy.partial);
          })
          .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Error"));
      },
    },
  });
}
