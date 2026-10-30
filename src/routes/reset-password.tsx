import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/AppShell";
import { usePortfolio } from "@/lib/store";
import { authCopy, authErrorKey } from "@/lib/auth-i18n";
import { Input } from "@/components/ui/input";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Capispot" },
      { name: "description", content: "Choose a new password for your Capispot account." },
      { property: "og:title", content: "Reset password — Capispot" },
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
  const [confirm, setConfirm] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");
  const c = authCopy[p.lang];
  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorText("");
    if (pw !== confirm) {
      setErrorText(c.passwordMismatch);
      return;
    }
    if (!p.user) {
      setErrorText(c.resetSessionExpired);
      return;
    }
    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: pw });
      if (updateError) {
        setErrorText(authErrorKey(updateError.message) === "weak" ? c.weak : updateError.message);
        return;
      }
      toast.success(p.t("passwordUpdated"));
      await navigate({ to: "/" });
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : c.resetSessionExpired);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="mx-auto max-w-md py-8">
      <Card className="p-7">
        <h1 className="font-display mb-4 text-2xl font-bold">{p.t("newPassword")}</h1>
        <p className="mb-5 text-sm text-muted-foreground">{c.resetDescription}</p>
        <form onSubmit={save} className="space-y-3">
          <label htmlFor="new-password" className="grid gap-1.5 text-sm font-medium">
            {p.t("newPassword")}
          </label>
          <Input
            id="new-password"
            type={showPasswords ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            value={pw}
            onChange={(event) => setPw(event.target.value)}
          />
          <label htmlFor="confirm-password" className="grid gap-1.5 pt-1 text-sm font-medium">
            {c.confirmNewPassword}
          </label>
          <Input
            id="confirm-password"
            type={showPasswords ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPasswords((shown) => !shown)}
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
            aria-pressed={showPasswords}
          >
            {showPasswords ? c.hide : c.show}
          </button>
          {errorText && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {errorText}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? c.savingPassword : c.resetPassword}
          </button>
        </form>
        <Link
          to="/auth"
          className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
        >
          {c.back}
        </Link>
      </Card>
    </div>
  );
}
