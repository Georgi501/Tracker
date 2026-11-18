import { AdminInsights } from "@/components/AdminInsights";
import { Card } from "@/components/AppShell";
import { ModerationPanel } from "@/components/ModerationPanel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { usePortfolio } from "@/lib/store";
import type { AdminAuditEntry, AdminUserSummary } from "@/routes/api/admin";
import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  Clock,
  LayoutDashboard,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

type AdminStats = {
  total_users: number;
  active_subscriptions: number;
  pro_accounts: number;
  free_accounts?: number;
  manual_grants?: number;
  expiring_grants?: number;
};

type AdminUserPage = { page: number; lastPage: number; total: number };
type PlanFilter = "all" | "free" | "pro" | "granted";
type AdminTab = "overview" | "users" | "pro" | "insights";

type AdminResponse = {
  stats: AdminStats | null;
  account: AdminUserSummary | null;
  users: AdminUserSummary[];
  recentAuditLogs?: AdminAuditEntry[];
  pagination: AdminUserPage;
};

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Owner console — CapiSpot" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPage,
});

function AdminPage() {
  const p = usePortfolio();
  const bg = p.lang === "bg";

  const [tab, setTab] = useState<AdminTab>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [account, setAccount] = useState<AdminUserSummary | null>(null);
  const [accounts, setAccounts] = useState<AdminUserSummary[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditEntry[]>([]);
  const [accountPage, setAccountPage] = useState<AdminUserPage>({
    page: 1,
    lastPage: 1,
    total: 0,
  });
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all");
  const [queryInput, setQueryInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const [searched, setSearched] = useState(false);

  // Grant / revoke controls
  const [grantMode, setGrantMode] = useState<"permanent" | "7d" | "30d" | "custom">("permanent");
  const [customExpiry, setCustomExpiry] = useState("");
  const [pendingAction, setPendingAction] = useState<{
    action: "grant" | "revoke";
    target: AdminUserSummary;
    expiresAt: string | null;
  } | null>(null);

  const copy = {
    title: bg ? "Административен панел" : "Owner console",
    description: bg
      ? "Управление на потребители, Pro достъп и агрегирани показатели. Лични портфейли и съобщения не са достъпни тук."
      : "User management, Pro access control, and aggregate insights. Private portfolios and messages are never exposed here.",
    tabs: {
      overview: bg ? "Преглед" : "Overview",
      users: bg ? "Потребители" : "Users",
      pro: bg ? "Pro достъп" : "Pro Access",
      insights: bg ? "Показатели" : "Insights",
    },
    users: bg ? "Общо профили" : "Total users",
    freeUsers: bg ? "Безплатни" : "Free users",
    pro: bg ? "Pro профили" : "Pro accounts",
    subscriptions: bg ? "Активни абонаменти" : "Active subscriptions",
    manualGrants: bg ? "Ръчни Pro права" : "Manual Pro grants",
    expiringGrants: bg ? "Изтичащи (14 дни)" : "Expiring (14d)",
    refresh: bg ? "Обнови" : "Refresh",
    lookup: bg ? "Търси" : "Search",
    search: bg
      ? "Търси по имейл (цял или част) или User ID (UUID)"
      : "Search by email (full or partial) or User ID (UUID)",
    noAccount: bg ? "Не е намерен профил за това търсене." : "No account found for this query.",
    status: bg ? "Ефективен Pro статус" : "Effective Pro status",
    active: bg ? "Активен" : "Active",
    inactive: bg ? "Неактивен" : "Inactive",
    grant: bg ? "Предостави Pro достъп" : "Grant Pro access",
    revoke: bg ? "Отнеми ръчния Pro достъп" : "Revoke manual Pro grant",
    granted: bg ? "Pro достъпът е предоставен." : "Pro access granted.",
    revoked: bg ? "Ръчният Pro достъп е отнет." : "Manual Pro grant revoked.",
    created: bg ? "Регистриран на" : "Joined",
    lastSignIn: bg ? "Последен вход" : "Last sign-in",
    never: bg ? "Няма данни" : "Never",
    visibility: bg ? "Профил" : "Profile",
    publicProfile: bg ? "Публичен" : "Public",
    privateProfile: bg ? "Частен" : "Private",
    subscription: bg ? "Абонамент" : "Subscription",
    paidThrough: bg ? "Платен до" : "Paid through",
    grantSource: bg ? "Източник на Pro" : "Pro source",
    sources: {
      subscription: bg ? "Платен абонамент" : "Paid subscription",
      manual_grant: bg ? "Ръчен админ grant" : "Manual admin grant",
      none: bg ? "Безплатен" : "Free",
    },
    expiresAt: bg ? "Изтича на" : "Expires at",
    permanent: bg ? "Постоянен" : "Permanent",
    grantedBy: bg ? "Предоставен от" : "Granted by",
    grantedAt: bg ? "Предоставен на" : "Granted at",
    grantDuration: bg ? "Срок на Pro достъпа" : "Grant duration",
    duration7d: bg ? "7 дни" : "7 days",
    duration30d: bg ? "30 дни" : "30 days",
    durationCustom: bg ? "Конкретна дата" : "Custom date",
    ownerGrant: bg
      ? "Постоянният Pro достъп на администратор не може да бъде отнет от панела."
      : "Site administrator Pro access cannot be revoked from this console.",
    paidSafetyNote: bg
      ? "Отнемането засяга само ръчния grant; платените Creem абонаменти не се променят."
      : "Revoking affects only manual grants; paid Creem subscriptions are never modified.",
    signIn: bg ? "Влез в профила си, за да продължиш." : "Sign in to continue.",
    denied: bg ? "Нямаш администраторски права." : "Administrator access required.",
    confirmTitle: bg ? "Потвърди промяната на Pro достъп" : "Confirm Pro access change",
    confirmDesc: (act: "grant" | "revoke", targetEmail: string) =>
      bg
        ? `Сигурен ли си, че искаш да ${act === "grant" ? "предоставиш Pro достъп на" : "отнемеш ръчния Pro достъп на"} ${targetEmail}?`
        : `Are you sure you want to ${act === "grant" ? "grant Pro access to" : "revoke manual Pro access for"} ${targetEmail}?`,
    confirmBtn: bg ? "Потвърди" : "Confirm",
    cancelBtn: bg ? "Отказ" : "Cancel",
    loadError: bg ? "Неуспешно зареждане на панела." : "Unable to load the console.",
    registeredAccounts: bg ? "Управление на потребители" : "Users management",
    userDetails: bg ? "Детайли за потребителя" : "User details",
    selectHint: bg
      ? "Избери потребител от таблицата или потърси по имейл / UUID."
      : "Select a user from the table or search by email / UUID.",
    email: bg ? "Имейл" : "Email",
    joined: bg ? "Регистриран" : "Joined",
    plan: bg ? "План" : "Plan",
    free: bg ? "Безплатен" : "Free",
    selectAccount: bg ? "Покажи данните на профила" : "View account details",
    noEmail: bg ? "Няма имейл" : "No email",
    noAccounts: bg ? "Няма намерени профили по този филтър." : "No accounts match this filter.",
    previous: bg ? "Предишна" : "Previous",
    next: bg ? "Следваща" : "Next",
    page: (current: number, total: number) =>
      bg ? `Страница ${current} от ${total}` : `Page ${current} of ${total}`,
    accountCount: (count: number) => (bg ? `${count} профила` : `${count} accounts`),
    filters: {
      all: bg ? "Всички" : "All",
      free: bg ? "Безплатни" : "Free",
      pro: bg ? "Pro" : "Pro",
      granted: bg ? "Ръчен Pro" : "Manual Grant",
    },
    auditTitle: bg ? "Последни административни действия" : "Recent admin audit trail",
    noAudit: bg
      ? "Няма записани действия все още (или миграция 0036 не е приложена)."
      : "No audit entries recorded yet (or migration 0036 is not yet applied).",
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
        if (response.status === 401 || url.startsWith("/api/admin?")) setDenied(true);
        throw new Error(result?.error ?? (response.status === 401 ? copy.signIn : copy.denied));
      }
      if (!response.ok) throw new Error(result?.error ?? copy.loadError);
      return result as T;
    },
    [copy.denied, copy.loadError, copy.signIn],
  );

  const loadPage = useCallback(
    async (page: number, plan: PlanFilter = planFilter, extraQuery = "") => {
      setBusy(true);
      setLoadError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          plan,
        });
        if (extraQuery) params.set("q", extraQuery);
        const result = await api<AdminResponse>(`/api/admin?${params.toString()}`);
        setStats(result.stats);
        setAccounts(result.users);
        setAccountPage(result.pagination);
        if (result.recentAuditLogs) setAuditLogs(result.recentAuditLogs);
        if (extraQuery) {
          setAccount(result.account);
          setSearched(true);
        } else {
          setSearched(false);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : copy.loadError;
        setLoadError(msg);
        if (![copy.signIn, copy.denied].includes(msg)) toast.error(msg);
      } finally {
        setBusy(false);
        setLoading(false);
      }
    },
    [api, copy.denied, copy.loadError, copy.signIn, planFilter],
  );

  const didMountRef = useRef(false);

  useEffect(() => {
    void loadPage(1, "all");
    // Initial load once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (tab !== "users" && tab !== "pro") return;
    const trimmed = queryInput.trim();
    const timer = window.setTimeout(() => {
      void loadPage(1, planFilter, trimmed);
    }, 300);
    return () => window.clearTimeout(timer);
    // Debounce search query changes only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryInput]);

  const lookupAccount = async (q: string) => {
    const trimmed = q.trim();
    setQueryInput(trimmed);
    setSearched(false);
    await loadPage(1, planFilter, trimmed);
  };

  const selectUserFromRow = async (user: AdminUserSummary) => {
    setAccount(user);
    setSearched(false);
    try {
      const result = await api<AdminResponse>(
        `/api/admin?page=${accountPage.page}&plan=${planFilter}&userId=${encodeURIComponent(user.user_id)}`,
      );
      if (result.account) setAccount(result.account);
    } catch {
      // Keep row summary if detail refresh fails
    }
  };

  const computeExpiresAt = (): string | null => {
    if (grantMode === "permanent") return null;
    if (grantMode === "7d") return new Date(Date.now() + 7 * 86_400_000).toISOString();
    if (grantMode === "30d") return new Date(Date.now() + 30 * 86_400_000).toISOString();
    if (grantMode === "custom" && customExpiry) {
      return new Date(customExpiry).toISOString();
    }
    return null;
  };

  const requestAction = (action: "grant" | "revoke", target: AdminUserSummary) => {
    const expiresAt = action === "grant" ? computeExpiresAt() : null;
    if (action === "grant" && grantMode === "custom" && !customExpiry) {
      toast.error(bg ? "Избери валидна бъдеща дата." : "Select a valid future expiration date.");
      return;
    }
    setPendingAction({ action, target, expiresAt });
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    const { action, target, expiresAt } = pendingAction;
    setPendingAction(null);
    setBusy(true);
    try {
      const result = await api<{ account: AdminUserSummary | null }>("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          userId: target.user_id,
          ...(action === "grant" ? { expiresAt } : {}),
        }),
      });
      if (result.account) setAccount(result.account);
      toast.success(action === "grant" ? copy.granted : copy.revoked);
      await loadPage(accountPage.page, planFilter);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.loadError);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Card className="mx-auto max-w-5xl p-6">
        <p role="status" className="text-sm text-muted-foreground">
          …
        </p>
      </Card>
    );
  }

  if (denied) {
    return (
      <Card className="mx-auto max-w-xl p-6 text-center">
        <h1 className="font-display text-2xl font-bold">{copy.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{copy.denied}</p>
      </Card>
    );
  }

  const navTabs: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "overview", label: copy.tabs.overview, icon: LayoutDashboard },
    { id: "users", label: copy.tabs.users, icon: Users },
    { id: "pro", label: copy.tabs.pro, icon: ShieldCheck },
    { id: "insights", label: copy.tabs.insights, icon: BarChart3 },
  ];

  return (
    <div className="mx-auto grid w-full max-w-6xl min-w-0 gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{copy.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => void loadPage(accountPage.page, planFilter)}
          className="min-h-10 gap-1.5 rounded-full"
        >
          <RefreshCw className={`size-3.5 ${busy ? "animate-spin" : ""}`} aria-hidden="true" />
          {copy.refresh}
        </Button>
      </div>

      <nav
        aria-label="Admin sections"
        className="flex flex-wrap gap-2 border-b border-border/70 pb-3"
      >
        {navTabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-secondary/40 text-foreground hover:border-primary/40"
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {loadError && (
        <Card className="border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {loadError}
        </Card>
      )}

      {tab === "overview" && (
        <div className="min-w-0 space-y-5">
          {stats && (
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                [copy.users, stats.total_users],
                [copy.freeUsers, stats.free_accounts ?? stats.total_users - stats.pro_accounts],
                [copy.pro, stats.pro_accounts],
                [copy.subscriptions, stats.active_subscriptions],
                [copy.manualGrants, stats.manual_grants ?? 0],
              ].map(([label, value]) => (
                <Card key={String(label)} className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</p>
                </Card>
              ))}
            </div>
          )}

          <Card className="min-w-0 space-y-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display flex items-center gap-2 text-base font-semibold">
                <Clock className="size-4 text-primary" aria-hidden="true" />
                {copy.auditTitle}
              </h2>
              {stats?.expiring_grants ? (
                <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500">
                  {copy.expiringGrants}: {stats.expiring_grants}
                </span>
              ) : null}
            </div>
            {auditLogs.length ? (
              <div className="w-full max-w-full overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-xs sm:text-sm">
                  <thead className="border-b border-border text-xs text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 font-medium">Action</th>
                      <th className="px-2 py-2 font-medium">Target UUID</th>
                      <th className="px-2 py-2 font-medium">Actor UUID</th>
                      <th className="px-2 py-2 font-medium">{copy.expiresAt}</th>
                      <th className="px-2 py-2 text-right font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {auditLogs.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-2 py-2 font-semibold uppercase">{entry.action}</td>
                        <td className="px-2 py-2 font-mono text-xs text-muted-foreground">
                          {entry.target_user_id
                            ? `${entry.target_user_id.slice(0, 8)}…`
                            : bg
                              ? "изтрит"
                              : "deleted"}
                        </td>
                        <td className="px-2 py-2 font-mono text-xs text-muted-foreground">
                          {entry.actor_id
                            ? `${entry.actor_id.slice(0, 8)}…`
                            : bg
                              ? "изтрит"
                              : "deleted"}
                        </td>
                        <td className="px-2 py-2 text-xs text-muted-foreground">
                          {entry.expires_at
                            ? new Date(entry.expires_at).toLocaleDateString()
                            : copy.permanent}
                        </td>
                        <td className="px-2 py-2 text-right text-xs text-muted-foreground tabular-nums">
                          {new Date(entry.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{copy.noAudit}</p>
            )}
          </Card>

          <ModerationPanel />
        </div>
      )}

      {(tab === "users" || tab === "pro") && (
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <Card className="min-w-0 space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">{copy.registeredAccounts}</h2>
              <span className="text-xs text-muted-foreground tabular-nums">
                {copy.accountCount(accountPage.total)}
              </span>
            </div>

            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                void lookupAccount(queryInput);
              }}
              className="flex flex-wrap gap-2"
            >
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="admin-search"
                  type="text"
                  maxLength={254}
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  placeholder={copy.search}
                  className="pl-9"
                />
              </div>
              <Button type="submit" disabled={busy || !queryInput.trim()} className="min-h-10">
                {copy.lookup}
              </Button>
              {queryInput.trim() && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void lookupAccount("")}
                  className="min-h-10"
                >
                  {bg ? "Изчисти" : "Clear"}
                </Button>
              )}
            </form>

            <div className="flex flex-wrap gap-1.5">
              {(["all", "free", "pro", "granted"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setPlanFilter(f);
                    void loadPage(1, f);
                  }}
                  aria-pressed={planFilter === f}
                  className={`min-h-8 rounded-full border px-3 text-xs font-medium transition-colors ${
                    planFilter === f
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {copy.filters[f]}
                </button>
              ))}
            </div>

            {accounts.length ? (
              <>
                <div className="w-full max-w-full overflow-x-auto">
                  <table className="w-full min-w-[540px] text-left text-xs sm:text-sm">
                    <thead className="border-b border-border text-xs text-muted-foreground">
                      <tr>
                        <th className="px-2.5 py-2 font-medium">{copy.email}</th>
                        <th className="px-2.5 py-2 font-medium">{copy.joined}</th>
                        <th className="px-2.5 py-2 font-medium">{copy.visibility}</th>
                        <th className="px-2.5 py-2 text-right font-medium">{copy.plan}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {accounts.map((user) => {
                        const selected = account?.user_id === user.user_id;
                        return (
                          <tr
                            key={user.user_id}
                            className={`transition-colors hover:bg-secondary/40 ${selected ? "bg-primary/5" : ""}`}
                          >
                            <td className="max-w-[220px] px-2.5 py-2.5">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void selectUserFromRow(user)}
                                aria-label={`${copy.selectAccount}: ${user.email ?? user.user_id}`}
                                className="block max-w-full truncate text-left font-medium text-primary underline-offset-4 hover:underline"
                              >
                                {user.email ?? copy.noEmail}
                              </button>
                              <span className="block truncate font-mono text-[10px] text-muted-foreground">
                                {user.user_id}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-2.5 py-2.5 text-muted-foreground tabular-nums">
                              {new Date(user.created_at).toLocaleDateString()}
                            </td>
                            <td className="whitespace-nowrap px-2.5 py-2.5">
                              <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                                {user.is_public === null
                                  ? "—"
                                  : user.is_public
                                    ? copy.publicProfile
                                    : copy.privateProfile}
                              </span>
                            </td>
                            <td className="px-2.5 py-2.5 text-right">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                  user.pro
                                    ? "bg-success/10 text-success"
                                    : "bg-secondary text-muted-foreground"
                                }`}
                              >
                                {user.has_admin_grant ? "Manual Pro" : user.pro ? "Pro" : copy.free}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy || accountPage.page <= 1}
                    onClick={() => void loadPage(accountPage.page - 1, planFilter)}
                    className="rounded-full"
                  >
                    {copy.previous}
                  </Button>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {copy.page(accountPage.page, Math.max(accountPage.lastPage, 1))}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy || accountPage.page >= accountPage.lastPage}
                    onClick={() => void loadPage(accountPage.page + 1, planFilter)}
                    className="rounded-full"
                  >
                    {copy.next}
                  </Button>
                </div>
              </>
            ) : (
              <p className="py-4 text-sm text-muted-foreground">{copy.noAccounts}</p>
            )}
          </Card>

          <Card className="min-w-0 space-y-4 p-4 sm:p-5">
            <h2 className="font-display text-lg font-semibold">{copy.userDetails}</h2>
            {searched && !account && accounts.length === 0 && (
              <p role="status" className="text-sm text-muted-foreground">
                {copy.noAccount}
              </p>
            )}
            {!account && (!searched || accounts.length > 0) && (
              <p className="text-sm text-muted-foreground">{copy.selectHint}</p>
            )}
            {account && (
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-secondary/20 p-3.5">
                  <p className="truncate font-semibold">{account.email ?? copy.noEmail}</p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                    {account.user_id}
                  </p>
                </div>

                <dl className="grid gap-2 text-xs sm:text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">{copy.created}</dt>
                    <dd className="font-medium tabular-nums">
                      {new Date(account.created_at).toLocaleDateString()}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">{copy.lastSignIn}</dt>
                    <dd className="font-medium tabular-nums">
                      {account.last_sign_in_at
                        ? new Date(account.last_sign_in_at).toLocaleDateString()
                        : copy.never}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">{copy.visibility}</dt>
                    <dd className="font-medium">
                      {account.is_public === null
                        ? "—"
                        : account.is_public
                          ? copy.publicProfile
                          : copy.privateProfile}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">{copy.status}</dt>
                    <dd className="font-semibold">
                      {account.pro ? copy.active : copy.inactive} (
                      {copy.sources[account.grant_source]})
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">{copy.subscription}</dt>
                    <dd className="font-medium">
                      {account.subscription_status ?? (bg ? "няма" : "none")}
                    </dd>
                  </div>
                  {account.current_period_end && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">{copy.paidThrough}</dt>
                      <dd className="font-medium tabular-nums">
                        {new Date(account.current_period_end).toLocaleDateString()}
                      </dd>
                    </div>
                  )}
                  {account.has_admin_grant && (
                    <>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">{copy.expiresAt}</dt>
                        <dd className="font-medium tabular-nums">
                          {account.grant_expires_at
                            ? new Date(account.grant_expires_at).toLocaleDateString()
                            : copy.permanent}
                        </dd>
                      </div>
                      {account.granted_at && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">{copy.grantedAt}</dt>
                          <dd className="font-medium tabular-nums">
                            {new Date(account.granted_at).toLocaleDateString()}
                          </dd>
                        </div>
                      )}
                    </>
                  )}
                </dl>

                <div className="space-y-3 border-t border-border pt-3">
                  {!account.has_admin_grant ? (
                    <>
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">
                          {copy.grantDuration}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {(
                            [
                              ["permanent", copy.permanent],
                              ["7d", copy.duration7d],
                              ["30d", copy.duration30d],
                              ["custom", copy.durationCustom],
                            ] as const
                          ).map(([mode, label]) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setGrantMode(mode)}
                              className={`min-h-8 rounded-full border px-3 text-xs font-medium ${
                                grantMode === mode
                                  ? "border-primary bg-primary/15 text-primary"
                                  : "border-border text-muted-foreground"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        {grantMode === "custom" && (
                          <Input
                            type="date"
                            value={customExpiry}
                            min={new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)}
                            onChange={(e) => setCustomExpiry(e.target.value)}
                            className="mt-2"
                          />
                        )}
                      </div>
                      <Button
                        type="button"
                        disabled={busy}
                        onClick={() => requestAction("grant", account)}
                        className="min-h-10 w-full rounded-full"
                      >
                        {copy.grant}
                      </Button>
                    </>
                  ) : account.is_site_admin || account.user_id === p.user?.id ? (
                    <p className="text-xs text-muted-foreground">{copy.ownerGrant}</p>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">{copy.paidSafetyNote}</p>
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={busy}
                        onClick={() => requestAction("revoke", account)}
                        className="min-h-10 w-full rounded-full"
                      >
                        {copy.revoke}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "insights" && <AdminInsights bg={bg} total={stats?.total_users ?? null} />}

      <Dialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => !open && setPendingAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.confirmTitle}</DialogTitle>
            <DialogDescription>
              {pendingAction &&
                copy.confirmDesc(
                  pendingAction.action,
                  pendingAction.target.email ?? pendingAction.target.user_id,
                )}
            </DialogDescription>
          </DialogHeader>
          {pendingAction?.action === "grant" && (
            <p className="text-xs text-muted-foreground">
              {copy.expiresAt}:{" "}
              <span className="font-semibold text-foreground">
                {pendingAction.expiresAt
                  ? new Date(pendingAction.expiresAt).toLocaleDateString()
                  : copy.permanent}
              </span>
            </p>
          )}
          {pendingAction?.action === "revoke" && (
            <p className="text-xs text-muted-foreground">{copy.paidSafetyNote}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingAction(null)}>
              {copy.cancelBtn}
            </Button>
            <Button
              type="button"
              variant={pendingAction?.action === "revoke" ? "destructive" : "default"}
              onClick={() => void confirmAction()}
            >
              {copy.confirmBtn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
