import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { usePortfolio } from "@/lib/store";
import { toast } from "sonner";

type AdminStats = {
  total_users: number;
  active_subscriptions: number;
  pro_accounts: number;
};
type AdminAccount = {
  user_id: string;
  email: string;
  created_at: string;
  pro: boolean;
  subscription_status: string | null;
  current_period_end: string | null;
  has_admin_grant: boolean;
};

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Owner console — Capispot" }] }),
  component: AdminPage,
});

function AdminPage() {
  const p = usePortfolio();
  const bg = p.lang === "bg";
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [account, setAccount] = useState<AdminAccount | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const [searched, setSearched] = useState(false);

  const copy = {
    title: bg ? "Административен панел" : "Owner console",
    description: bg
      ? "Обобщена информация и управление на Pro достъп. Лични портфейли и съобщения не са достъпни тук."
      : "Account summaries and Pro access management. Private portfolios and messages are not available here.",
    users: bg ? "Профили" : "Accounts",
    subscriptions: bg ? "Активни абонаменти" : "Active subscriptions",
    pro: bg ? "Pro профили" : "Pro accounts",
    lookup: bg ? "Провери профил" : "Look up account",
    search: bg ? "Търси по имейл" : "Look up by email",
    noAccount: bg ? "Не е намерен профил с този имейл." : "No account found for this email.",
    status: bg ? "Pro статус" : "Pro status",
    active: bg ? "Активен" : "Active",
    inactive: bg ? "Неактивен" : "Inactive",
    grant: bg ? "Предостави постоянен Pro" : "Grant permanent Pro",
    revoke: bg ? "Отнеми администраторския Pro достъп" : "Revoke admin Pro grant",
    granted: bg ? "Pro достъпът е предоставен." : "Pro access granted.",
    revoked: bg ? "Администраторският Pro достъп е отнет." : "Admin Pro grant revoked.",
    created: bg ? "Регистриран на" : "Joined",
    subscription: bg ? "Абонамент" : "Subscription",
    paidThrough: bg ? "Достъп до" : "Access through",
    accessGrant: bg ? "Постоянен администраторски Pro достъп" : "Permanent admin Pro grant",
    ownerGrant: bg
      ? "Постоянният Pro достъп на собственика не може да бъде отнет от панела."
      : "The owner's permanent Pro access cannot be revoked from this console.",
    signIn: bg ? "Влез в профила си, за да продължиш." : "Sign in to continue.",
    denied: bg ? "Нямаш администраторски права." : "Administrator access required.",
    confirmation: bg
      ? "Потвърди промяната на Pro достъпа за този профил."
      : "Confirm changing this account's Pro access.",
    loadError: bg ? "Неуспешно зареждане на панела." : "Unable to load the console.",
  };

  const api = useCallback(
    async function api<T>(url: string, init?: RequestInit): Promise<T> {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const token = data.session?.access_token;
      if (!token) {
        setDenied(true);
        throw new Error(copy.signIn);
      }
      const response = await fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(init?.headers ?? {}),
        },
      });
      const result = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
      if (response.status === 401 || response.status === 403) {
        setDenied(true);
        throw new Error(response.status === 401 ? copy.signIn : copy.denied);
      }
      if (!response.ok) throw new Error(result?.error ?? copy.loadError);
      return result as T;
    },
    [copy.denied, copy.loadError, copy.signIn],
  );

  useEffect(() => {
    let active = true;
    void api<{ stats: AdminStats | null; account: AdminAccount | null }>("/api/admin")
      .then((result) => {
        if (active) setStats(result.stats);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof Error && [copy.signIn, copy.denied].includes(error.message)) return;
        toast.error(error instanceof Error ? error.message : copy.loadError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, copy.denied, copy.loadError, copy.signIn]);

  const lookup = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setSearched(false);
    try {
      const result = await api<{ stats: AdminStats | null; account: AdminAccount | null }>(
        `/api/admin?email=${encodeURIComponent(email.trim())}`,
      );
      setStats(result.stats);
      setAccount(result.account);
      setSearched(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.loadError);
    } finally {
      setBusy(false);
    }
  };

  const changeAccess = async (action: "grant" | "revoke") => {
    if (!account || !window.confirm(copy.confirmation)) return;
    setBusy(true);
    try {
      const result = await api<{ account: AdminAccount | null }>("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, email: account.email }),
      });
      setAccount(result.account);
      toast.success(action === "grant" ? copy.granted : copy.revoked);
      const summary = await api<{ stats: AdminStats | null; account: AdminAccount | null }>(
        "/api/admin",
      );
      setStats(summary.stats);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.loadError);
    } finally {
      setBusy(false);
    }
  };

  if (loading)
    return (
      <Card className="mx-auto max-w-3xl">
        <p role="status">…</p>
      </Card>
    );
  if (denied)
    return (
      <Card className="mx-auto max-w-xl text-center">
        <h1 className="font-display text-2xl font-bold">{copy.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{copy.denied}</p>
      </Card>
    );

  return (
    <div className="mx-auto grid max-w-4xl gap-5">
      <div>
        <h1 className="font-display text-3xl font-bold">{copy.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{copy.description}</p>
      </div>
      {stats && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            [copy.users, stats.total_users],
            [copy.subscriptions, stats.active_subscriptions],
            [copy.pro, stats.pro_accounts],
          ].map(([label, value]) => (
            <Card key={String(label)}>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
            </Card>
          ))}
        </div>
      )}
      <Card className="space-y-4">
        <h2 className="font-display text-lg font-semibold">{copy.lookup}</h2>
        <form onSubmit={(event) => void lookup(event)} className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="admin-email">
            {copy.search}
          </label>
          <input
            id="admin-email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={copy.search}
            className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "…" : copy.lookup}
          </button>
        </form>
        {searched && !account && (
          <p role="status" className="text-sm text-muted-foreground">
            {copy.noAccount}
          </p>
        )}
        {account && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border p-4">
            <div className="min-w-0">
              <p className="truncate font-semibold">{account.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {copy.created}: {new Date(account.created_at).toLocaleDateString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {copy.subscription}: {account.subscription_status ?? (bg ? "няма" : "none")}
              </p>
              {account.current_period_end && (
                <p className="text-xs text-muted-foreground">
                  {copy.paidThrough}: {new Date(account.current_period_end).toLocaleDateString()}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {copy.status}: {account.pro ? copy.active : copy.inactive}
                {account.has_admin_grant ? ` · ${copy.accessGrant}` : ""}
              </p>
            </div>
            {account.has_admin_grant ? (
              account.user_id === p.user?.id ? (
                <p className="text-sm text-muted-foreground">{copy.ownerGrant}</p>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void changeAccess("revoke")}
                  className="rounded-full border border-destructive/50 px-4 py-2 text-sm font-semibold text-destructive disabled:opacity-50"
                >
                  {copy.revoke}
                </button>
              )
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void changeAccess("grant")}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {copy.grant}
              </button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
