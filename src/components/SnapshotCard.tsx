import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePortfolio } from "@/lib/store";
import { snapshotCsv, snapshotWeights } from "@/lib/journey";

/** Pro: privacy-safe snapshot with class percentages only (no amounts, quantities or costs). */
export function SnapshotCard() {
  const p = usePortfolio();
  const copy = {
    en: {
      title: "Portfolio allocation",
      asOf: "As of",
      private: "Percentages only — no amounts, quantities or ticker symbols.",
      copy: "Copy to share",
      csv: "Download CSV",
      pdf: "Save as PDF",
      copied: "Copied",
      copyError: "Could not copy the report. Check clipboard permissions and try again.",
    },
    bg: {
      title: "Разпределение на портфейла",
      asOf: "Към",
      private: "Само проценти — без суми, бройки или тикери.",
      copy: "Копирай за споделяне",
      csv: "Изтегли CSV",
      pdf: "Запази като PDF",
      copied: "Копирано",
      copyError: "Отчетът не може да бъде копиран. Провери достъпа до клипборда и опитай отново.",
    },
    de: {
      title: "Portfolio-Aufteilung",
      asOf: "Stand",
      private: "Nur Prozentwerte — keine Beträge, Stückzahlen oder Tickersymbole.",
      copy: "Zum Teilen kopieren",
      csv: "CSV herunterladen",
      pdf: "Als PDF speichern",
      copied: "Kopiert",
      copyError: "Der Bericht konnte nicht kopiert werden. Prüfe den Zwischenablagezugriff.",
    },
    es: {
      title: "Distribución de cartera",
      asOf: "A fecha de",
      private: "Solo porcentajes — sin importes, cantidades ni símbolos bursátiles.",
      copy: "Copiar para compartir",
      csv: "Descargar CSV",
      pdf: "Guardar como PDF",
      copied: "Copiado",
      copyError: "No se pudo copiar el informe. Comprueba el permiso del portapapeles.",
    },
    it: {
      title: "Allocazione del portafoglio",
      asOf: "Al",
      private: "Solo percentuali — senza importi, quantità o simboli ticker.",
      copy: "Copia per condividere",
      csv: "Scarica CSV",
      pdf: "Salva come PDF",
      copied: "Copiato",
      copyError: "Impossibile copiare il report. Controlla l'accesso agli appunti.",
    },
  }[p.lang];
  const w = snapshotWeights(p.holdings);
  const date = new Date().toISOString().slice(0, 10);
  if (!w.length)
    return (
      <p className="text-sm text-muted-foreground">
        {p.lang === "bg" ? "Няма позиции с реална цена." : "No priced positions yet."}
      </p>
    );
  const text =
    `${copy.title} · ${copy.asOf} ${date}\n` +
    w.map((x) => `${p.t(x.cls as never)}: ${x.pct}%`).join("\n");
  const csv = snapshotCsv(w, date);
  const saveCsv = () => {
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `capispot-allocation-${date}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const print = () => {
    const cleanup = () => document.body.classList.remove("print-share-report");
    document.body.classList.add("print-share-report");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
  };
  return (
    <div className="share-report-print space-y-3 rounded-xl">
      <div className="mb-3">
        <h3 className="font-semibold">{copy.title}</h3>
        <p className="text-xs text-muted-foreground">
          {copy.asOf} {date}
        </p>
      </div>
      <div className="bg-brand-gradient rounded-2xl p-4 text-primary-foreground">
        <p className="font-display font-semibold">Capispot</p>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-background/30">
          {w.map((x, i) => (
            <div
              key={x.cls}
              style={{ width: `${x.pct}%`, opacity: 1 - i * 0.18 }}
              className="bg-primary-foreground"
            />
          ))}
        </div>
        <ul className="mt-3 space-y-1 text-sm">
          {w.map((x) => (
            <li key={x.cls} className="flex justify-between">
              <span>{p.t(x.cls as never)}</span>
              <span className="font-semibold">{x.pct}%</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-muted-foreground">{copy.private}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            if (!navigator.clipboard?.writeText) {
              toast.error(copy.copyError);
              return;
            }
            void navigator.clipboard
              .writeText(text)
              .then(() => toast.success(copy.copied))
              .catch(() => toast.error(copy.copyError));
          }}
        >
          {copy.copy}
        </Button>
        <Button variant="secondary" onClick={saveCsv}>
          {copy.csv}
        </Button>
        <Button variant="secondary" onClick={print}>
          {copy.pdf}
        </Button>
      </div>
    </div>
  );
}
