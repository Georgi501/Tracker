import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePortfolio } from "@/lib/store";

const AUTH_CONTINUATION_KEY = "capispot-auth-continuation";

function safeAuthContinuation(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || url.hash) return null;
    if (url.pathname === "/brokers" || url.pathname === "/holdings") {
      return url.search ? null : url.pathname;
    }
    if (url.pathname !== "/pricing") return null;
    const params = url.searchParams;
    if (params.get("checkout") !== "pro") return null;
    const interval = params.get("interval");
    if (interval !== "month" && interval !== "year") return null;
    const promo = params.get("promo");
    if (promo && (interval !== "year" || !/^[A-Za-z0-9_-]{3,32}$/.test(promo))) return null;
    return `/pricing?checkout=pro&interval=${interval}${promo ? `&promo=${encodeURIComponent(promo)}` : ""}`;
  } catch {
    return null;
  }
}
import { authCopy, authErrorKey } from "@/lib/auth-i18n";
import { trackAnalyticsEvent } from "@/lib/analytics";

const input =
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring";

const GOOGLE_WEB_CLIENT_ID =
  "306300201431-r984q2kfae6tm75kt29htl8npnajbjh0.apps.googleusercontent.com";
const GOOGLE_IDENTITY_SCRIPT = "https://accounts.google.com/gsi/client";

type GoogleCredentialResponse = { credential?: string };
type GoogleButtonOptions = {
  theme: "outline";
  size: "large";
  text: "continue_with";
  shape: "pill";
  logo_alignment: "left";
  width: number;
  locale: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            nonce: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (container: HTMLElement, options: GoogleButtonOptions) => void;
        };
      };
    };
  }
}

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GOOGLE_IDENTITY_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      googleScriptPromise = null;
      reject(new Error("Unable to load Google Identity Services"));
    };
    document.head.append(script);
  });
  return googleScriptPromise;
}

function createGoogleNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashGoogleNonce(nonce: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(nonce));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

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
  const [code, setCode] = useState("");
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoadFailed, setGoogleLoadFailed] = useState(false);
  const [googleAttempt, setGoogleAttempt] = useState(0);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleSignInRef = useRef<(credential: string, nonce: string) => void>(() => {});
  const c = authCopy[p.lang];

  useEffect(() => {
    if (!redirectOnSignIn || !p.user) return;
    let continuation: string | null = null;
    try {
      continuation =
        safeAuthContinuation(new URLSearchParams(window.location.search).get("next")) ??
        safeAuthContinuation(sessionStorage.getItem(AUTH_CONTINUATION_KEY));
      sessionStorage.removeItem(AUTH_CONTINUATION_KEY);
    } catch (error) {
      console.error("Unable to restore the requested sign-in action", error);
    }
    if (continuation) window.location.assign(continuation);
    else navigate({ to: "/" });
  }, [p.user, navigate, redirectOnSignIn]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const continuation = safeAuthContinuation(params.get("next"));
    if (continuation) {
      try {
        sessionStorage.setItem(AUTH_CONTINUATION_KEY, continuation);
      } catch (error) {
        console.error("Unable to retain the requested sign-in action", error);
      }
    }
    if (params.get("mode") === "signup") setMode("up");
    const referralCode = params.get("ref")?.trim();
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
        if (data.session) trackAnalyticsEvent("signup_confirmed", undefined, "/auth");
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
  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sentTo) return;
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.auth.verifyOtp({
      email: sentTo,
      token: code.trim(),
      type: "signup",
    });
    setBusy(false);
    if (error) {
      setError(c.invalidCode);
      return;
    }
    if (data.session) trackAnalyticsEvent("signup_confirmed", undefined, "/auth");
    setCode("");
    setSentTo(null);
    onSignedIn?.();
  };
  const google = async (credential: string, nonce: string) => {
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: credential,
        nonce,
      });
      if (error) throw error;
      onSignedIn?.();
    } catch (err) {
      setError(err instanceof Error ? `${c.googleFailed} ${err.message}` : c.googleFailed);
    } finally {
      setBusy(false);
    }
  };
  googleSignInRef.current = (credential, nonce) => void google(credential, nonce);

  useEffect(() => {
    let active = true;
    let resizeObserver: ResizeObserver | undefined;
    const container = googleButtonRef.current;
    if (!container) return;
    setGoogleReady(false);
    setGoogleLoadFailed(false);

    void loadGoogleIdentityScript()
      .then(() => {
        if (!active) return;
        const googleIdentity = window.google?.accounts.id;
        if (!googleIdentity) throw new Error("Google Identity Services did not initialize");
        const nonce = createGoogleNonce();
        return hashGoogleNonce(nonce).then((hashedNonce) => {
          if (!active) return;
          googleIdentity.initialize({
            client_id: GOOGLE_WEB_CLIENT_ID,
            nonce: hashedNonce,
            callback: (response) => {
              if (response.credential) googleSignInRef.current(response.credential, nonce);
              else setError(c.googleFailed);
            },
          });
          const renderButton = () => {
            if (!active) return;
            const width = Math.min(400, Math.max(200, Math.floor(container.clientWidth)));
            googleIdentity.renderButton(container, {
              theme: "outline",
              size: "large",
              text: "continue_with",
              shape: "pill",
              logo_alignment: "left",
              width,
              locale: p.lang,
            });
          };
          renderButton();
          setGoogleReady(true);
          setGoogleLoadFailed(false);
          resizeObserver = new ResizeObserver(renderButton);
          resizeObserver.observe(container);
        });
      })
      .catch(() => {
        if (active) {
          setGoogleReady(false);
          setGoogleLoadFailed(true);
          setError(c.googleLoadError);
        }
      });

    return () => {
      active = false;
      resizeObserver?.disconnect();
      container.replaceChildren();
    };
  }, [c.googleFailed, c.googleLoadError, p.lang, googleAttempt]);
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
        <form onSubmit={verifyCode} className="mt-5 space-y-3">
          <input
            className={`${input} text-center text-lg tracking-widest`}
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            aria-label={c.codeLabel}
            placeholder={c.codeLabel}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <button
            disabled={busy || code.length < 6}
            className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {c.verify}
          </button>
        </form>
        <button
          onClick={() => {
            setSentTo(null);
            setCode("");
            setError(null);
            switchMode("in");
          }}
          className="mt-3 w-full text-sm text-muted-foreground"
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
      <div
        ref={googleButtonRef}
        className={`flex min-h-10 justify-center ${busy ? "pointer-events-none opacity-60" : ""}`}
        aria-label={p.lang === "bg" ? "Продължи с Google" : "Continue with Google"}
      />
      {!googleReady && !error && (
        <p role="status" className="mt-1 text-center text-xs text-muted-foreground">
          {c.googleLoading}
        </p>
      )}
      {!googleReady && googleLoadFailed && (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setGoogleLoadFailed(false);
            setGoogleAttempt((attempt) => attempt + 1);
          }}
          className="mt-1 w-full text-center text-xs font-semibold text-primary hover:underline"
        >
          {c.googleRetry}
        </button>
      )}
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
