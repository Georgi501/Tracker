import { useEffect, useState } from "react";
import { toast } from "sonner";
import { setAnalyticsConsent } from "@/lib/analytics";
import type { Lang } from "@/lib/i18n";
import { usePortfolio } from "@/lib/store";

const COPY: Record<
  Lang,
  { title: string; description: string; reject: string; allow: string; saveError: string }
> = {
  en: {
    title: "Privacy-friendly analytics",
    description:
      "If you agree, we record only event names and a temporary session ID to measure sign-ups and Pro usage. We do not send portfolio or email data to analytics providers.",
    reject: "Reject",
    allow: "Allow analytics",
    saveError: "Could not save your choice.",
  },
  bg: {
    title: "Поверителни измервания",
    description:
      "По избор записваме само име на събитие и временен идентификатор на сесията, за да измерваме регистрации и използване на Pro. Не изпращаме портфейл, имейл или данни към външна аналитична услуга.",
    reject: "Отказвам",
    allow: "Съгласен съм",
    saveError: "Не успяхме да запазим избора ти.",
  },
  de: {
    title: "Datenschutzfreundliche Analyse",
    description:
      "Mit deiner Zustimmung speichern wir nur Ereignisnamen und eine temporäre Sitzungs-ID, um Registrierungen und die Pro-Nutzung zu messen. Portfolio- und E-Mail-Daten werden nicht an Analysedienste gesendet.",
    reject: "Ablehnen",
    allow: "Analyse erlauben",
    saveError: "Deine Auswahl konnte nicht gespeichert werden.",
  },
  es: {
    title: "Analítica respetuosa con la privacidad",
    description:
      "Si aceptas, guardamos solo nombres de eventos y un identificador temporal de sesión para medir registros y uso de Pro. No enviamos datos de cartera ni correo a servicios de analítica.",
    reject: "Rechazar",
    allow: "Permitir analítica",
    saveError: "No se pudo guardar tu elección.",
  },
  it: {
    title: "Analisi rispettosa della privacy",
    description:
      "Se accetti, registriamo solo i nomi degli eventi e un ID temporaneo di sessione per misurare le registrazioni e l'uso di Pro. Non inviamo dati del portafoglio o email ai servizi di analisi.",
    reject: "Rifiuta",
    allow: "Consenti analisi",
    saveError: "Impossibile salvare la scelta.",
  },
};

export function AnalyticsConsent() {
  const p = usePortfolio();
  const [choice, setChoice] = useState<"accepted" | "rejected" | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem("folio-analytics-consent");
    } catch (error) {
      console.error("Unable to read analytics preference", error);
    }
    if (stored === "accepted" || stored === "rejected") setChoice(stored);
    else setOpen(true);

    const refresh = () => {
      let value: string | null = null;
      try {
        value = localStorage.getItem("folio-analytics-consent");
      } catch (error) {
        console.error("Unable to read analytics preference", error);
      }
      setChoice(value === "accepted" || value === "rejected" ? value : null);
      setOpen(value !== "accepted" && value !== "rejected");
    };
    const show = () => setOpen(true);
    window.addEventListener("folio-analytics-consent-changed", refresh);
    window.addEventListener("folio-open-analytics-preferences", show);
    return () => {
      window.removeEventListener("folio-analytics-consent-changed", refresh);
      window.removeEventListener("folio-open-analytics-preferences", show);
    };
  }, []);

  const choose = (accepted: boolean) => {
    try {
      setAnalyticsConsent(accepted);
      setChoice(accepted ? "accepted" : "rejected");
      setOpen(false);
    } catch {
      toast.error(COPY[p.lang].saveError);
      setOpen(true);
    }
  };

  if (!open && choice !== null) return null;
  const c = COPY[p.lang];
  return (
    <aside
      aria-label={c.title}
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-2xl rounded-2xl border border-border bg-card p-4 shadow-2xl sm:inset-x-auto sm:bottom-5 sm:right-5"
    >
      <p className="text-sm font-semibold">{c.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.description}</p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button
          onClick={() => choose(false)}
          className="rounded-full border border-border px-4 py-2 text-xs font-semibold"
        >
          {c.reject}
        </button>
        <button
          onClick={() => choose(true)}
          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          {c.allow}
        </button>
      </div>
    </aside>
  );
}
