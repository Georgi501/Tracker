import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/AppShell";
import { usePortfolio } from "@/lib/store";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — folio." },
      { name: "description", content: "Choose a new password for your folio. account." },
      { property: "og:title", content: "Reset password — folio." },
      { property: "og:description", content: "Choose a new password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const p = usePortfolio();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { toast.error(error.message); return; }
    toast.success(p.t("passwordUpdated"));
    navigate({ to: "/" });
  };
  return (
    <div className="mx-auto max-w-md py-8">
      <Card className="p-7">
        <h1 className="font-display mb-4 text-2xl font-bold">{p.t("newPassword")}</h1>
        <form onSubmit={save} className="space-y-3">
          <input type="password" required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
          <button className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground">{p.t("save")}</button>
        </form>
      </Card>
    </div>
  );
}
