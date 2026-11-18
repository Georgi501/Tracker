import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/AppShell";
import { usePortfolio } from "@/lib/store";
import type { Lang } from "@/lib/i18n";

interface Item {
  id: string;
  author: string | null;
  body: string;
  created_at: string;
  hidden_at: string | null;
  reports: number;
}
type Action = "hide" | "unhide" | "delete" | "dismiss";

const COPY: Record<
  Lang,
  {
    title: string;
    empty: string;
    unavailable: string;
    hidden: string;
    dismiss: string;
    hide: string;
    unhide: string;
    delete: string;
    confirmDelete: string;
    reports: (count: number) => string;
  }
> = {
  en: {
    title: "Reported wall posts",
    empty: "No reports.",
    unavailable: "Moderation queue is currently unavailable.",
    hidden: "hidden",
    dismiss: "Dismiss reports",
    hide: "Hide",
    unhide: "Unhide",
    delete: "Delete",
    confirmDelete: "Delete this post permanently?",
    reports: (count) => `${count} report${count === 1 ? "" : "s"}`,
  },
  bg: {
    title: "Докладвани публикации в стената",
    empty: "Няма докладвани публикации.",
    unavailable: "Опашката за модерация в момента не е достъпна.",
    hidden: "скрита",
    dismiss: "Отхвърли сигналите",
    hide: "Скрий",
    unhide: "Покажи",
    delete: "Изтрий",
    confirmDelete: "Да се изтрие ли тази публикация окончателно?",
    reports: (count) => `${count} сигнал${count === 1 ? "" : "а"}`,
  },
  de: {
    title: "Gemeldete Pinnwand-Beiträge",
    empty: "Keine Meldungen.",
    unavailable: "Moderationsliste ist derzeit nicht verfügbar.",
    hidden: "ausgeblendet",
    dismiss: "Meldungen verwerfen",
    hide: "Ausblenden",
    unhide: "Einblenden",
    delete: "Löschen",
    confirmDelete: "Diesen Beitrag dauerhaft löschen?",
    reports: (count) => `${count} Meldung${count === 1 ? "" : "en"}`,
  },
  es: {
    title: "Publicaciones del muro reportadas",
    empty: "Sin reportes.",
    unavailable: "La cola de moderación no está disponible ahora.",
    hidden: "oculta",
    dismiss: "Descartar reportes",
    hide: "Ocultar",
    unhide: "Mostrar",
    delete: "Eliminar",
    confirmDelete: "¿Eliminar esta publicación permanentemente?",
    reports: (count) => `${count} reporte${count === 1 ? "" : "s"}`,
  },
  it: {
    title: "Post della bacheca segnalati",
    empty: "Nessuna segnalazione.",
    unavailable: "La coda di moderazione non è al momento disponibile.",
    hidden: "nascosto",
    dismiss: "Ignora segnalazioni",
    hide: "Nascondi",
    unhide: "Mostra",
    delete: "Elimina",
    confirmDelete: "Eliminare definitivamente questo post?",
    reports: (count) => `${count} segnalazion${count === 1 ? "e" : "i"}`,
  },
};

/** Admin-only review queue for reported wall posts; every action runs through the verified /api/moderation route. */
export function ModerationPanel() {
  const { lang } = usePortfolio();
  const c = COPY[lang];
  const [items, setItems] = useState<Item[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const call = useCallback(async (init?: RequestInit) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Sign in required");
    const response = await fetch("/api/moderation", {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) throw new Error(body?.error ?? "Request failed");
    return body as { items?: Item[] };
  }, []);

  const load = useCallback(() => {
    setLoadFailed(false);
    call()
      .then((r) => setItems(r.items ?? []))
      .catch(() => {
        setLoadFailed(true);
        setItems([]);
      });
  }, [call]);
  useEffect(load, [load]);

  const act = async (postId: string, action: Action) => {
    if (action === "delete" && !window.confirm(c.confirmDelete)) return;
    try {
      await call({ method: "POST", body: JSON.stringify({ action, postId }) });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    }
  };

  const btn = "press rounded-full bg-secondary px-3 py-1 text-xs font-semibold";
  return (
    <Card className="space-y-3 p-4 sm:p-5">
      <h2 className="font-display text-base font-semibold">{c.title}</h2>
      {loadFailed ? (
        <p className="text-xs text-muted-foreground">{c.unavailable}</p>
      ) : items === null ? (
        <p className="text-sm text-muted-foreground">…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{c.empty}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={it.id} className="space-y-2 rounded-2xl border border-border p-3 text-sm">
              <p className="text-xs text-muted-foreground">
                {it.author ?? "—"} · {new Date(it.created_at).toLocaleString()} ·{" "}
                <b>{c.reports(it.reports)}</b>
                {it.hidden_at ? ` · ${c.hidden}` : ""}
              </p>
              <p className="whitespace-pre-wrap break-words">{it.body}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btn} onClick={() => void act(it.id, "dismiss")}>
                  {c.dismiss}
                </button>
                <button
                  type="button"
                  className={btn}
                  onClick={() => void act(it.id, it.hidden_at ? "unhide" : "hide")}
                >
                  {it.hidden_at ? c.unhide : c.hide}
                </button>
                <button
                  type="button"
                  className={`${btn} text-destructive`}
                  onClick={() => void act(it.id, "delete")}
                >
                  {c.delete}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
