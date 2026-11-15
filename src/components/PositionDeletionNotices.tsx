import type { PositionOperation } from "@/hooks/use-position-deletion";
import { languageLocale } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

type Copy = Record<
  PositionOperation["phase"] | "undo" | "retry" | "deadline" | "loading" | "listError",
  string
>;
const COPY: Record<Lang, Copy> = {
  en: {
    expired: "The 24-hour recovery period has expired. Undo is no longer available.",
    deadline: "Undo available for 24 hours, until",
    loading: "Loading deleted positions…",
    listError: "Deleted positions could not be loaded. Try again to access Undo.",
    deleting: "Deleting position…",
    deleted: "Position deleted. You can undo this deletion.",
    restoring: "Restoring position…",
    restored: "Position restored.",
    "delete-error":
      "Deletion could not be confirmed. The portfolio was refreshed; if that failed, the warning shows the last known state. Retry safely to confirm the same operation.",
    "restore-error":
      "Restore could not be confirmed. The portfolio was refreshed; if that failed, the warning shows the last known state. Retry safely without duplicating records.",
    undo: "Undo",
    retry: "Try again",
  },
  bg: {
    expired: "24-часовият срок за възстановяване изтече. Отмяната вече не е достъпна.",
    deadline: "Възстановяване в рамките на 24 часа, до",
    loading: "Зареждане на изтритите позиции…",
    listError: "Изтритите позиции не бяха заредени. Опитай отново за достъп до възстановяването.",
    deleting: "Изтриване на позицията…",
    deleted: "Позицията е изтрита. Можеш да отмениш изтриването.",
    restoring: "Възстановяване на позицията…",
    restored: "Позицията е възстановена.",
    "delete-error":
      "Изтриването не е потвърдено. Портфейлът е презареден; ако това е неуспешно, предупреждението показва последното известно състояние. Повтори безопасно същата операция.",
    "restore-error":
      "Възстановяването не е потвърдено. Портфейлът е презареден; ако това е неуспешно, предупреждението показва последното известно състояние. Повтори безопасно без дублиране на записи.",
    undo: "Отмени",
    retry: "Опитай отново",
  },
  de: {
    expired: "Die Wiederherstellungsfrist von 24 Stunden ist abgelaufen.",
    deadline: "24 Stunden lang wiederherstellbar, bis",
    loading: "Gelöschte Positionen werden geladen…",
    listError: "Gelöschte Positionen konnten nicht geladen werden. Versuche es erneut.",
    deleting: "Position wird gelöscht…",
    deleted: "Position gelöscht. Du kannst das Löschen rückgängig machen.",
    restoring: "Position wird wiederhergestellt…",
    restored: "Position wiederhergestellt.",
    "delete-error":
      "Das Löschen konnte nicht bestätigt werden. Das Portfolio wurde neu geladen; bei einem Fehler zeigt die Warnung den letzten bekannten Stand. Wiederhole denselben Vorgang sicher.",
    "restore-error":
      "Die Wiederherstellung konnte nicht bestätigt werden. Das Portfolio wurde neu geladen; bei einem Fehler zeigt die Warnung den letzten bekannten Stand. Wiederhole den Vorgang ohne doppelte Einträge.",
    undo: "Rückgängig",
    retry: "Erneut versuchen",
  },
  es: {
    expired: "El plazo de recuperación de 24 horas ha expirado.",
    deadline: "Se puede deshacer durante 24 horas, hasta",
    loading: "Cargando posiciones eliminadas…",
    listError: "No se pudieron cargar las posiciones eliminadas. Inténtalo de nuevo.",
    deleting: "Eliminando posición…",
    deleted: "Posición eliminada. Puedes deshacer la eliminación.",
    restoring: "Restaurando posición…",
    restored: "Posición restaurada.",
    "delete-error":
      "No se pudo confirmar la eliminación. Se actualizó la cartera; si falló, la advertencia muestra el último estado conocido. Reintenta la misma operación con seguridad.",
    "restore-error":
      "No se pudo confirmar la restauración. Se actualizó la cartera; si falló, la advertencia muestra el último estado conocido. Reintenta sin duplicar registros.",
    undo: "Deshacer",
    retry: "Reintentar",
  },
  it: {
    expired: "Il periodo di ripristino di 24 ore è scaduto.",
    deadline: "Ripristino disponibile per 24 ore, fino a",
    loading: "Caricamento delle posizioni eliminate…",
    listError: "Impossibile caricare le posizioni eliminate. Riprova.",
    deleting: "Eliminazione della posizione…",
    deleted: "Posizione eliminata. Puoi annullare l'eliminazione.",
    restoring: "Ripristino della posizione…",
    restored: "Posizione ripristinata.",
    "delete-error":
      "Impossibile confermare l'eliminazione. Il portafoglio è stato aggiornato; in caso di errore, l'avviso mostra l'ultimo stato noto. Riprova la stessa operazione in sicurezza.",
    "restore-error":
      "Impossibile confermare il ripristino. Il portafoglio è stato aggiornato; in caso di errore, l'avviso mostra l'ultimo stato noto. Riprova senza duplicare i dati.",
    undo: "Annulla",
    retry: "Riprova",
  },
};
export function PositionDeletionNotices({
  operations,
  lang,
  undo,
  retry,
  loading,
  listError,
  refresh,
}: {
  loading: boolean;
  listError: boolean;
  refresh: () => void;
  operations: PositionOperation[];
  lang: Lang;
  undo: (entry: PositionOperation) => void;
  retry: (entry: PositionOperation) => void;
}) {
  const c = COPY[lang];
  return (
    <>
      {loading && (
        <p role="status" className="text-sm text-muted-foreground">
          {c.loading}
        </p>
      )}
      {listError && (
        <div role="alert" className="text-sm">
          <p>{c.listError}</p>
          <button
            type="button"
            onClick={refresh}
            className="min-h-11 rounded-full border border-border px-4 font-semibold"
          >
            {c.retry}
          </button>
        </div>
      )}
      {operations.map((entry) => {
        const error = entry.phase.endsWith("-error");
        const pending = entry.phase === "deleting" || entry.phase === "restoring";
        return (
          <div
            key={entry.operationId}
            role={error ? "alert" : "status"}
            aria-busy={pending}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm"
          >
            <p className="min-w-0 flex-1">
              <strong>{entry.symbol}</strong>: {c[entry.phase]}
              {entry.expiresAt && entry.phase !== "restored" && entry.phase !== "expired" && (
                <span className="mt-1 block text-xs text-muted-foreground">
                  {c.deadline}{" "}
                  <time dateTime={entry.expiresAt}>
                    {new Intl.DateTimeFormat(languageLocale(lang), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(entry.expiresAt))}
                  </time>
                  .
                </span>
              )}
            </p>
            {entry.phase === "deleted" && (
              <button
                type="button"
                onClick={() => undo(entry)}
                className="min-h-11 rounded-full border border-border px-4 font-semibold"
              >
                {c.undo}
              </button>
            )}
            {error && (
              <button
                type="button"
                onClick={() => retry(entry)}
                className="min-h-11 rounded-full border border-border px-4 font-semibold"
              >
                {c.retry}
              </button>
            )}
          </div>
        );
      })}
    </>
  );
}
