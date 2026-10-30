import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePortfolio } from "@/lib/store";
import { authCopy, authErrorKey } from "@/lib/auth-i18n";
import { trackAnalyticsEvent } from "@/lib/analytics";

const input =
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring";

export function AuthForm({
  onSignedIn,
  redirectOnSignIn = false,
}: {
  onSignedIn?: () => void;
  redirectOnSignIn?: boolean;
}) {
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

  useEffect(() => {
    if (redirectOnSignIn && p.user) navigate({ to: "/" });
  }, [p.user, navigate, redirectOnSignIn]);
  useEffect(() => {
    const referralCode = new URLSearchParams(window.location.search).get("ref")?.trim();
    if (referralCode && /^[a-fA-F0-9]{16}$/.test(referralCode)) {
      setMode("up");
      try {
        sessionStorage.setItem("folio-referral-code", referralCode);
      } catch (error) {
        console.error("Unable to retain referral code for sign-in", error);
      }
    }
  }, []);

  const switchMode = (m: "in" | "up") => {
    setMode(m);
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "up") {
        const referralCode = new URLSearchParams(window.location.search).get("ref")?.trim();
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              display_name: name.trim().slice(0, 60),
              ...(referralCode && /^[a-fA-F0-9]{16}$/.test(referralCode)
                ? { referral_code: referralCode }
                : {}),
            },
          },
        });
        if (error) throw error;
        if (data.user && (data.user.identities?.length ?? 0) === 0) {
          setError(c.exists);
          setMode("in");
          return;
        }
        if (data.user) trackAnalyticsEvent("signup_completed");
        if (!data.session) setSentTo(email.trim());
        else onSignedIn?.();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        onSignedIn?.();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      const key = authErrorKey(msg);
      setError(key ? c[key] : msg);
    } finally {
      setBusy(false);
    }
  };
  const google = async () => {
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  };
  const forgot = async () => {
    const target = email.trim();
    if (!target) {
      toast.error(c.resetNeedEmail);
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success(c.resetSentTo(target), { duration: 8000 });
  };
  if (sentTo)
    return (
      <div className="rounded-2xl border border-border bg-card p-7 text-center shadow-lg">
        <h1 className="font-display text-2xl font-bold">{p.t("checkEmail")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{c.sent(sentTo)}</p>
        <button
          onClick={() => {
            setSentTo(null);
            switchMode("in");
          }}
          className="mt-5 w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
        >
          {c.back}
        </button>
      </div>
    );

  return (
    <div className="rounded-2xl border border-border bg-card p-7 shadow-lg">
      <h1 className="font-display text-2xl font-bold">
        {mode === "in" ? p.t("signIn") : p.t("signUp")}
      </h1>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">{p.t("tagline")}</p>
      <form onSubmit={submit} className="space-y-3">
        {mode === "up" && (
          <input
            className={input}
            required
            minLength={2}
            maxLength={60}
            autoComplete="nickname"
            placeholder={p.lang === "bg" ? "Име или никнейм" : "Name or nickname"}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <input
          className={input}
          type="email"
          required
          autoComplete="email"
          placeholder={p.t("email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="relative">
          <input
            className={`${input} pr-20`}
            type={show ? "text" : "password"}
            required
            minLength={mode === "up" ? 8 : 1}
            autoComplete={mode === "up" ? "new-password" : "current-password"}
            placeholder={p.t("password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground"
          >
            {show ? c.hide : c.show}
          </button>
        </div>
        {mode === "up" && <p className="text-xs text-muted-foreground">{c.passwordHint}</p>}
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <button
          disabled={busy}
          className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {mode === "in" ? p.t("signIn") : p.t("signUp")}
        </button>
      </form>
      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {p.lang === "bg" ? "или" : "or"}
        <span className="h-px flex-1 bg-border" />
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={google}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background py-2.5 text-sm font-semibold disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.100 0-5.700-2.100-6.600-4.900H1.400v3.100A12 12 0 0 0 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.400 14.400a7.200 7.200 0 0 1 0-4.800V6.500H1.400a12 12 0 0 0 0 10.900l4-3z"
          />
          <path
            fill="#EA4335"
            d="M12 4.800c1.800 0 3.300.6 4.600 1.800l3.400-3.400A12 12 0 0 0 1.400 6.500l4 3.100C6.300 6.900 8.900 4.800 12 4.800z"
          />
        </svg>
        {p.lang === "bg" ? "Продължи с Google" : "Continue with Google"}
      </button>
      <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm">
        <button
          onClick={() => switchMode(mode === "in" ? "up" : "in")}
          className="font-semibold text-primary"
        >
          {mode === "in" ? c.noAccount : c.haveAccount}
        </button>
        {mode === "in" && (
          <button onClick={forgot} className="text-muted-foreground">
            {p.t("forgot")}
          </button>
        )}
      </div>
    </div>
  );
}
