import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/AppShell";

interface Item {
  id: string;
  author: string | null;
  body: string;
  created_at: string;
  hidden_at: string | null;
  reports: number;
}
type Action = "hide" | "unhide" | "delete" | "dismiss";

/** Admin-only review queue for reported wall posts; every action runs through the verified /api/moderation route. */
export function ModerationPanel() {
  const [items, setItems] = useState<Item[] | null>(null);

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
    call()
      .then((r) => setItems(r.items ?? []))
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Request failed"));
  }, [call]);
  useEffect(load, [load]);

  const act = async (postId: string, action: Action) => {
    if (action === "delete" && !window.confirm("Delete this post permanently?")) return;
    try {
      await call({ method: "POST", body: JSON.stringify({ action, postId }) });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    }
  };

  const btn = "press rounded-full bg-secondary px-3 py-1 text-xs font-semibold";
  return (
    <Card className="space-y-4">
      <h2 className="font-display text-lg font-semibold">Reported wall posts</h2>
      {items === null ? (
        <p className="text-sm text-muted-foreground">…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reports.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={it.id} className="space-y-2 rounded-2xl border border-border p-3 text-sm">
              <p className="text-xs text-muted-foreground">
                {it.author ?? "—"} · {new Date(it.created_at).toLocaleString()} ·{" "}
                <b>{it.reports}</b> report{it.reports === 1 ? "" : "s"}
                {it.hidden_at ? " · hidden" : ""}
              </p>
              <p className="whitespace-pre-wrap break-words">{it.body}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btn} onClick={() => void act(it.id, "dismiss")}>
                  Dismiss reports
                </button>
                <button
                  type="button"
                  className={btn}
                  onClick={() => void act(it.id, it.hidden_at ? "unhide" : "hide")}
                >
                  {it.hidden_at ? "Unhide" : "Hide"}
                </button>
                <button
                  type="button"
                  className={`${btn} text-destructive`}
                  onClick={() => void act(it.id, "delete")}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
