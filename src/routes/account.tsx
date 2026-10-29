import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { usePortfolio } from "@/lib/store";
import { languageLocale, type Lang } from "@/lib/i18n";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account & billing — Capispot" },
      {
        name: "description",
        content: "Manage your subscription, export your portfolio data, or delete your account.",
      },
      { property: "og:title", content: "Account & billing — Capispot" },
      { property: "og:description", content: "Manage your Capispot account and subscription." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AccountPage,
});

type Copy = {
  title: string;
  signedOut: string;
  signIn: string;
  subscription: string;
  status: string;
  nextRenewal: string;
  canceledAt: string;
  manage: string;
  billingUnavailable: string;
  exportTitle: string;
  exportBody: string;
  export: string;
  exportSuccess: string;
  deleteTitle: string;
  deleteBody: string;
  deleteBilling: string;
  deleteData: string;
  confirmLabel: string;
  delete: string;
  deleting: string;
  deleteSuccess: string;
  deleteDeferred: string;
  deleteDeferredNoDate: string;
  deleteFailed: string;
  confirmFailed: string;
  noSubscriptions: string;
  free: string;
};
const COPY: Record<Lang, Copy> = {
  en: {
    title: "Account & billing",
    signedOut: "Sign in to manage your account.",
    signIn: "Sign in",
    subscription: "Subscription",
    status: "Status",
    nextRenewal: "Paid through",
    canceledAt: "Renewal canceled · access until",
    manage: "Manage billing in Creem",
    billingUnavailable: "Billing portal unavailable. Contact support.",
    exportTitle: "Export your data",
    exportBody:
      "Download a copy of your profile, portfolio, transactions, goals, notes, conversations and subscription details.",
    export: "Download my data",
    exportSuccess: "Your data export is ready.",
    deleteTitle: "Delete account",
    deleteBody:
      "If you have active Pro access, your renewal will be canceled first and your account and data will stay available until the paid period ends. You can return here after that to permanently delete your account. No refund is issued for the current paid period.",
    deleteBilling: "If Creem cannot cancel the renewal, your account will remain unchanged.",
    deleteData: "This permanently removes your portfolio and cannot be undone.",
    confirmLabel: "Type your account email to confirm",
    delete: "Delete my account",
    deleting: "Checking subscription and account…",
    deleteSuccess: "Account deleted.",
    deleteDeferred:
      "Renewal canceled. Your account and Pro access remain available until {date}; return after then if you still want to delete your account.",
    deleteDeferredNoDate:
      "Renewal canceled. Your account remains available because the subscription has no recorded end date. Contact support if you need help.",
    deleteFailed: "Could not delete the account.",
    confirmFailed: "The confirmation email did not match.",
    noSubscriptions: "No active subscription",
    free: "Free",
  },
  bg: {
    title: "Профил и плащания",
    signedOut: "Влез, за да управляваш профила си.",
    signIn: "Вход",
    subscription: "Абонамент",
    status: "Статус",
    nextRenewal: "Платено до",
    canceledAt: "Подновяването е спряно · достъп до",
    manage: "Управление на плащанията в Creem",
    billingUnavailable: "Платежният портал не е достъпен. Свържи се с поддръжката.",
    exportTitle: "Изтегли данните си",
    exportBody:
      "Изтегли копие на профила, портфолиото, сделките, целите, бележките, разговорите и данните за абонамента.",
    export: "Изтегли моите данни",
    exportSuccess: "Файлът с данните ти е готов.",
    deleteTitle: "Изтриване на профила",
    deleteBody:
      "Ако имаш активен Pro достъп, първо ще спрем подновяването, а профилът и данните ти ще останат достъпни до края на платения период. След това можеш да се върнеш тук и да изтриеш профила окончателно. Текущият платен период не се възстановява.",
    deleteBilling: "Ако Creem не може да спре подновяването, профилът ти остава непроменен.",
    deleteData: "Портфолиото ще бъде изтрито необратимо.",
    confirmLabel: "Въведи имейла на профила, за да потвърдиш",
    delete: "Изтрий профила ми",
    deleting: "Проверка на абонамента и профила…",
    deleteSuccess: "Профилът е изтрит.",
    deleteDeferred:
      "Подновяването е спряно. Профилът и Pro достъпът ти остават активни до {date}; върни се след тази дата, ако все още искаш да изтриеш профила.",
    deleteDeferredNoDate:
      "Подновяването е спряно. Профилът ти остава активен, защото няма записана крайна дата на абонамента. Свържи се с поддръжката, ако имаш нужда от помощ.",
    deleteFailed: "Профилът не можа да бъде изтрит.",
    confirmFailed: "Имейлът за потвърждение не съвпада.",
    noSubscriptions: "Няма активен абонамент",
    free: "Free",
  },
  de: {
    title: "Konto & Abrechnung",
    signedOut: "Melde dich an, um dein Konto zu verwalten.",
    signIn: "Anmelden",
    subscription: "Abonnement",
    status: "Status",
    nextRenewal: "Bezahlt bis",
    canceledAt: "Verlängerung beendet · Zugriff bis",
    manage: "Abrechnung bei Creem verwalten",
    billingUnavailable: "Abrechnungsportal nicht verfügbar. Bitte kontaktiere den Support.",
    exportTitle: "Daten exportieren",
    exportBody:
      "Lade eine Kopie deines Profils, Portfolios, deiner Transaktionen, Ziele, Notizen, Gespräche und Abonnementdaten herunter.",
    export: "Meine Daten herunterladen",
    exportSuccess: "Dein Datenexport ist bereit.",
    deleteTitle: "Konto löschen",
    deleteBody:
      "Wenn du aktiven Pro-Zugriff hast, wird zuerst die Verlängerung beendet; dein Konto und deine Daten bleiben bis zum Ende des bezahlten Zeitraums verfügbar. Danach kannst du zurückkehren und dein Konto endgültig löschen. Für den aktuellen Zeitraum gibt es keine Rückerstattung.",
    deleteBilling: "Kann Creem die Verlängerung nicht beenden, bleibt dein Konto unverändert.",
    deleteData: "Dein Portfolio wird unwiderruflich gelöscht.",
    confirmLabel: "Gib zur Bestätigung deine Konto-E-Mail ein",
    delete: "Konto löschen",
    deleting: "Abonnement und Konto werden geprüft…",
    deleteSuccess: "Konto gelöscht.",
    deleteDeferred:
      "Die Verlängerung wurde beendet. Konto und Pro-Zugriff bleiben bis {date} verfügbar. Kehre danach zurück, wenn du dein Konto weiterhin löschen möchtest.",
    deleteDeferredNoDate:
      "Die Verlängerung wurde beendet. Dein Konto bleibt verfügbar, da kein Enddatum für das Abonnement gespeichert ist. Kontaktiere den Support, wenn du Hilfe benötigst.",
    deleteFailed: "Konto konnte nicht gelöscht werden.",
    confirmFailed: "Die E-Mail stimmt nicht überein.",
    noSubscriptions: "Kein aktives Abonnement",
    free: "Free",
  },
  es: {
    title: "Cuenta y facturación",
    signedOut: "Inicia sesión para administrar tu cuenta.",
    signIn: "Iniciar sesión",
    subscription: "Suscripción",
    status: "Estado",
    nextRenewal: "Pagado hasta",
    canceledAt: "Renovación cancelada · acceso hasta",
    manage: "Administrar pagos en Creem",
    billingUnavailable: "Portal de pagos no disponible. Contacta con soporte.",
    exportTitle: "Exportar tus datos",
    exportBody:
      "Descarga una copia de tu perfil, cartera, transacciones, objetivos, notas, conversaciones y suscripción.",
    export: "Descargar mis datos",
    exportSuccess: "La exportación está lista.",
    deleteTitle: "Eliminar cuenta",
    deleteBody:
      "Si tienes acceso Pro activo, primero se cancelará la renovación y tu cuenta y tus datos seguirán disponibles hasta que termine el periodo pagado. Después puedes volver aquí para eliminar la cuenta permanentemente. No se reembolsa el periodo pagado actual.",
    deleteBilling: "Si Creem no puede cancelar la renovación, tu cuenta no cambiará.",
    deleteData: "Tu cartera se eliminará permanentemente.",
    confirmLabel: "Escribe el correo de tu cuenta para confirmar",
    delete: "Eliminar mi cuenta",
    deleting: "Comprobando suscripción y cuenta…",
    deleteSuccess: "Cuenta eliminada.",
    deleteDeferred:
      "Renovación cancelada. Tu cuenta y acceso Pro seguirán disponibles hasta el {date}; vuelve después si aún quieres eliminar la cuenta.",
    deleteDeferredNoDate:
      "Renovación cancelada. Tu cuenta seguirá disponible porque la suscripción no tiene una fecha de finalización registrada. Contacta con soporte si necesitas ayuda.",
    deleteFailed: "No se pudo eliminar la cuenta.",
    confirmFailed: "El correo de confirmación no coincide.",
    noSubscriptions: "No hay suscripción activa",
    free: "Free",
  },
  it: {
    title: "Account e pagamenti",
    signedOut: "Accedi per gestire il tuo account.",
    signIn: "Accedi",
    subscription: "Abbonamento",
    status: "Stato",
    nextRenewal: "Pagato fino al",
    canceledAt: "Rinnovo annullato · accesso fino al",
    manage: "Gestisci pagamenti su Creem",
    billingUnavailable: "Portale pagamenti non disponibile. Contatta l'assistenza.",
    exportTitle: "Esporta i tuoi dati",
    exportBody:
      "Scarica una copia del profilo, portafoglio, transazioni, obiettivi, note, conversazioni e abbonamento.",
    export: "Scarica i miei dati",
    exportSuccess: "Esportazione pronta.",
    deleteTitle: "Elimina account",
    deleteBody:
      "Se hai accesso Pro attivo, prima verrà annullato il rinnovo e il tuo account e i tuoi dati resteranno disponibili fino alla fine del periodo pagato. Dopo potrai tornare qui per eliminare definitivamente l'account. Il periodo pagato corrente non viene rimborsato.",
    deleteBilling: "Se Creem non riesce ad annullare il rinnovo, il tuo account resterà invariato.",
    deleteData: "Il portafoglio verrà eliminato in modo permanente.",
    confirmLabel: "Inserisci l'email dell'account per confermare",
    delete: "Elimina il mio account",
    deleting: "Verifica dell'abbonamento e dell'account…",
    deleteSuccess: "Account eliminato.",
    deleteDeferred:
      "Rinnovo annullato. Account e accesso Pro restano disponibili fino al {date}; torna dopo se desideri ancora eliminare l'account.",
    deleteDeferredNoDate:
      "Rinnovo annullato. Il tuo account resta disponibile perché l'abbonamento non ha una data di fine registrata. Contatta l'assistenza se hai bisogno di aiuto.",
    deleteFailed: "Impossibile eliminare l'account.",
    confirmFailed: "L'email di conferma non corrisponde.",
    noSubscriptions: "Nessun abbonamento attivo",
    free: "Free",
  },
};

type Subscription = {
  plan: string;
  interval: string | null;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
};

function AccountPage() {
  const p = usePortfolio();
  const navigate = useNavigate();
  const c = COPY[p.lang];
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [emailConfirmation, setEmailConfirmation] = useState("");
  const [deletionDeferredMessage, setDeletionDeferredMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = p.user;
    if (!user) return;
    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("subscriptions")
          .select(
            "plan,interval,status,current_period_end,cancel_at_period_end,provider_customer_id,provider_subscription_id",
          )
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!active) return;
        if (error) toast.error(error.message);
        else setSubscription(data);
      } catch (error) {
        if (active) {
          toast.error(error instanceof Error ? error.message : "Unable to load subscription");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [p.user]);

  const accessToken = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session?.access_token) throw new Error("Sign-in session expired");
    return data.session.access_token;
  };

  const manageBilling = async () => {
    setBusy(true);
    try {
      const token = await accessToken();
      const response = await fetch("/api/account/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: "{}",
      });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || c.billingUnavailable);
      window.location.assign(result.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : c.billingUnavailable);
    } finally {
      setBusy(false);
    }
  };

  const exportData = async () => {
    if (!p.user) return;
    setBusy(true);
    try {
      const tables = [
        [
          "subscriptions",
          supabase
            .from("subscriptions")
            .select(
              "plan,interval,status,current_period_start,current_period_end,cancel_at_period_end,environment,created_at,updated_at",
            ),
        ],
        ["profile", supabase.from("profiles").select("*").eq("id", p.user.id).maybeSingle()],
        ["brokers", supabase.from("brokers").select("*")],
        ["assets", supabase.from("assets").select("*")],
        ["transactions", supabase.from("transactions").select("*")],
        ["goals", supabase.from("goals").select("*")],
        ["journalNotes", supabase.from("journal_notes").select("*")],
        ["aiThreads", supabase.from("ai_threads").select("*")],
        ["aiMessages", supabase.from("ai_messages").select("*")],
        [
          "messages",
          supabase
            .from("direct_messages")
            .select("*")
            .or(`sender_id.eq.${p.user.id},recipient_id.eq.${p.user.id}`),
        ],
        ["feedback", supabase.from("feedback").select("*")],
      ] as const;
      const results = await Promise.all(
        tables.map(async ([name, query]) => {
          const { data, error } = await query;
          if (error) throw new Error(`${name}: ${error.message}`);
          return [name, data] as const;
        }),
      );
      const body = JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          accountEmail: p.user.email,
          data: Object.fromEntries(results),
        },
        null,
        2,
      );
      const url = URL.createObjectURL(new Blob([body], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `folio-account-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(c.exportSuccess);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to export account data");
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    if (!p.user?.email || emailConfirmation.trim().toLowerCase() !== p.user.email.toLowerCase()) {
      toast.error(c.confirmFailed);
      return;
    }
    setBusy(true);
    try {
      const token = await accessToken();
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ confirmEmail: emailConfirmation }),
      });
      const result = (await response.json()) as {
        error?: string;
        deleted?: boolean;
        accessUntil?: string | null;
      };
      if (!response.ok) throw new Error(result.error || c.deleteFailed);
      if (result.deleted !== true) {
        const formattedDate =
          result.accessUntil && Number.isFinite(Date.parse(result.accessUntil))
            ? new Intl.DateTimeFormat(languageLocale(p.lang), { dateStyle: "long" }).format(
                new Date(result.accessUntil),
              )
            : null;
        const message = formattedDate
          ? c.deleteDeferred.replace("{date}", formattedDate)
          : c.deleteDeferredNoDate;
        setDeletionDeferredMessage(message);
        setSubscription((current) =>
          current ? { ...current, cancel_at_period_end: true } : current,
        );
        toast.success(message);
        return;
      }
      await supabase.auth.signOut({ scope: "local" });
      toast.success(c.deleteSuccess);
      await navigate({ to: "/", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : c.deleteFailed);
    } finally {
      setBusy(false);
    }
  };

  if (!p.user)
    return (
      <Card className="mx-auto max-w-xl text-center">
        <h1 className="font-display text-2xl font-bold">{c.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{c.signedOut}</p>
        <Link
          to="/auth"
          className="mt-5 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          {c.signIn}
        </Link>
      </Card>
    );

  const date = subscription?.current_period_end
    ? new Intl.DateTimeFormat(languageLocale(p.lang), { dateStyle: "long" }).format(
        new Date(subscription.current_period_end),
      )
    : null;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="font-display text-3xl font-bold">{c.title}</h1>
      <Card className="space-y-3">
        <h2 className="font-display text-lg font-semibold">{c.subscription}</h2>
        <p className="text-sm">
          {c.status}: <strong>{p.isPro ? "Pro" : (subscription?.plan ?? c.free)}</strong>
          {subscription ? ` · ${subscription.status}` : ""}
        </p>
        {date && (
          <p className="text-sm text-muted-foreground">
            {subscription?.cancel_at_period_end ? c.canceledAt : c.nextRenewal} {date}
          </p>
        )}
        {loading && <p className="text-sm text-muted-foreground">…</p>}
        {subscription?.provider_customer_id && (
          <button
            disabled={busy}
            onClick={() => void manageBilling()}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? "…" : c.manage}
          </button>
        )}
      </Card>
      <Card className="space-y-3">
        <h2 className="font-display text-lg font-semibold">{c.exportTitle}</h2>
        <p className="text-sm text-muted-foreground">{c.exportBody}</p>
        <button
          disabled={busy}
          onClick={() => void exportData()}
          className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          {c.export}
        </button>
      </Card>
      <Card className="space-y-3 border-destructive/50">
        <h2 className="font-display text-lg font-semibold text-destructive">{c.deleteTitle}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{c.deleteBody}</p>
        <p className="text-sm font-medium text-destructive">
          {c.deleteBilling} {c.deleteData}
        </p>
        {deletionDeferredMessage ? (
          <p role="status" className="rounded-xl bg-primary/10 p-3 text-sm font-medium">
            {deletionDeferredMessage}
          </p>
        ) : (
          <>
            <label className="block text-sm">
              {c.confirmLabel}
              <input
                type="email"
                autoComplete="email"
                value={emailConfirmation}
                onChange={(event) => setEmailConfirmation(event.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <button
              disabled={
                busy || emailConfirmation.trim().toLowerCase() !== p.user.email?.toLowerCase()
              }
              onClick={() => void deleteAccount()}
              className="rounded-full bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
            >
              {busy ? c.deleting : c.delete}
            </button>
          </>
        )}
      </Card>
    </div>
  );
}
