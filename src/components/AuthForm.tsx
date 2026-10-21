import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { usePortfolio } from "@/lib/store";
import { authCopy, authErrorKey } from "@/lib/auth-i18n";

const input = "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring";

export function AuthForm({ onSignedIn, redirectOnSignIn = false }: { onSignedIn?: () => void; redirectOnSignIn?: boolean }) {
  const p = usePortfolio();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const c = authCopy[p.lang];

  useEffect(() => { if (redirectOnSignIn && p.user) navigate({ to: "/" }); }, [p.user, navigate, redirectOnSignIn]);

  const switchMode = (m: "in" | "up") => { setMode(m); setError(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password, options: { emailRedirectTo: window.location.origin, data: { display_name: name.trim().slice(0, 60) } },
        });
        if (error) throw error;
        if (data.user && (data.user.identities?.length ?? 0) === 0) { setError(c.exists); setMode("in"); return; }
        if (!data.session) setSentTo(email.trim());
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        onSignedIn?.();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      const key = authErrorKey(msg);
      setError(key ? c[key] : msg);
    } finally { setBusy(false); }
  };
  const forgot = async () => {
    if (!email) { toast.error(p.t("email")); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    if (error) toast.error(error.message); else toast.success(p.t("resetSent"));
  };
  const oauth = async (provider: "google" | "apple") => {
    const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (r.error) toast.error(r.error.message);
  };

  if (sentTo) return (
    <div className="rounded-2xl border border-border bg-card p-7 text-center shadow-lg">
      <h1 className="font-display text-2xl font-bold">{p.t("checkEmail")}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{c.sent(sentTo)}</p>
      <button onClick={() => { setSentTo(null); switchMode("in"); }} className="mt-5 w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground">{c.back}</button>
    </div>
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-7 shadow-lg">
      <h1 className="font-display text-2xl font-bold">{mode === "in" ? p.t("signIn") : p.t("signUp")}</h1>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">{p.t("tagline")}</p>
      <form onSubmit={submit} className="space-y-3">
        {mode === "up" && <input className={input} required minLength={2} maxLength={60} autoComplete="nickname" placeholder={p.lang === "bg" ? "Име или никнейм" : "Name or nickname"} value={name} onChange={(e) => setName(e.target.value)} />}
        <input className={input} type="email" required autoComplete="email" placeholder={p.t("email")} value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="relative">
          <input className={`${input} pr-20`} type={show ? "text" : "password"} required minLength={mode === "up" ? 8 : 1} autoComplete={mode === "up" ? "new-password" : "current-password"} placeholder={p.t("password")} value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">{show ? c.hide : c.show}</button>
        </div>
        {mode === "up" && <p className="text-xs text-muted-foreground">{c.passwordHint}</p>}
        {error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <button disabled={busy} className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {mode === "in" ? p.t("signIn") : p.t("signUp")}
        </button>
      </form>
      <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm">
        <button onClick={() => switchMode(mode === "in" ? "up" : "in")} className="font-semibold text-primary">
          {mode === "in" ? c.noAccount : c.haveAccount}
        </button>
        {mode === "in" && <button onClick={forgot} className="text-muted-foreground">{p.t("forgot")}</button>}
      </div>
      <p className="my-5 text-center text-xs text-muted-foreground">{p.t("orWith")}</p>
      <div className="space-y-2">
        <button type="button" onClick={() => oauth("google")} className="w-full rounded-full border border-border py-2.5 text-sm font-semibold hover:bg-secondary">Google</button>
        <button type="button" onClick={() => oauth("apple")} className="w-full rounded-full bg-foreground py-2.5 text-sm font-semibold text-background hover:opacity-90"> Apple</button>
      </div>
    </div>
  );
}
