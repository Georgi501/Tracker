import type { Lang } from "@/lib/i18n";

const copy: Record<Lang, { message: string; retry: string }> = {
  en: {
    message: "History could not be refreshed. Any previous complete history remains displayed.",
    retry: "Retry history",
  },
  bg: {
    message:
      "Историята не можа да се обнови. Предишната пълна история остава видима, ако е налична.",
    retry: "Опитай отново",
  },
  de: {
    message:
      "Der Verlauf konnte nicht aktualisiert werden. Ein zuvor vollständig geladener Verlauf bleibt sichtbar.",
    retry: "Erneut versuchen",
  },
  es: {
    message:
      "No se pudo actualizar el historial. El historial completo anterior sigue visible, si está disponible.",
    retry: "Reintentar",
  },
  it: {
    message:
      "Impossibile aggiornare la cronologia. La precedente cronologia completa rimane visibile, se disponibile.",
    retry: "Riprova",
  },
};

export function HistoryLoadError({
  lang,
  failed,
  pending,
  retry,
}: {
  lang: Lang;
  failed: boolean;
  pending: boolean;
  retry: () => void;
}) {
  if (!failed) return null;
  return (
    <div
      role="alert"
      className="my-3 flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 p-3 text-sm"
    >
      <p className="min-w-0 flex-1">{copy[lang].message}</p>
      <button
        type="button"
        disabled={pending}
        onClick={retry}
        className="font-semibold text-primary hover:underline disabled:opacity-50"
      >
        {copy[lang].retry}
      </button>
    </div>
  );
}
