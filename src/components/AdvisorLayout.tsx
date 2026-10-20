import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePortfolio } from "@/lib/store";
import { advisorCopy } from "@/lib/advisor-i18n";
import { Card } from "./AppShell";
import { Button } from "./ui/button";

export function useThreads(enabled: boolean) {
  return useQuery({
    queryKey: ["ai-threads"], enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_threads").select("id,title,updated_at").order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function AdvisorLayout({ activeId, children }: { activeId?: string; children: ReactNode }) {
  const p = usePortfolio(); const c = advisorCopy[p.lang];
  const navigate = useNavigate(); const qc = useQueryClient();
  const allowed = !!p.user && p.isPro;
  const threads = useThreads(allowed);
  const create = async () => {
    if (!p.user) return;
    const { data, error } = await supabase.from("ai_threads").insert({ user_id: p.user.id }).select("id").single();
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["ai-threads"] });
    navigate({ to: "/advisor/$threadId", params: { threadId: data.id } });
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("ai_threads").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["ai-threads"] });
    if (id === activeId) navigate({ to: "/advisor" });
  };
  if (!allowed) return (
    <Card className="mx-auto max-w-lg text-center">
      <h1 className="font-display mb-2 text-2xl font-bold">{c.advisor}</h1>
      <p className="mb-4 text-muted-foreground">{p.user ? c.proOnly : c.signIn}</p>
      <Link to={p.user ? "/pricing" : "/auth"} className="inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">{p.user ? c.upgrade : p.t("signIn")}</Link>
    </Card>
  );
  return (
    <div className="grid gap-5 md:grid-cols-[240px_1fr]">
      <Card className="p-3">
        <Button className="mb-3 w-full" onClick={create}><Plus size={16} />{c.newChat}</Button>
        {!threads.data?.length && <p className="px-2 text-sm text-muted-foreground">{c.empty}</p>}
        <ul className="space-y-1">
          {threads.data?.map((t) => (
            <li key={t.id} className={`flex items-center rounded-lg ${t.id === activeId ? "bg-secondary" : "hover:bg-secondary/60"}`}>
              <Link to="/advisor/$threadId" params={{ threadId: t.id }} className="flex-1 truncate px-2 py-2 text-sm">{t.title}</Link>
              <button type="button" aria-label="Delete" onClick={() => remove(t.id)} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      </Card>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
