import { useEffect, useState } from "react";
import { Card } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

type Count = number | null;
type VisitorStats = {
  unique_visitors: number;
  sessions: number;
  returning_visitors: number;
  avg_session_seconds: number | null;
  visitors_pricing: number;
  visitors_signup: number;
};
type Insights = {
  generatedAt: string;
  growth: {
    signups7: Count;
    signups30: Count;
    usersWithTransactions: Count;
    usersWithTransactionsCapped: boolean;
  };
  visits: {
    visits1: VisitorStats | null;
    visits7: VisitorStats | null;
    visits30: VisitorStats | null;
  };
  events30: Record<string, Count>;
  features: Record<
    "advisor7" | "advisor30" | "companies7" | "companies30" | "journal" | "goals",
    Count
  >;
  revenue: Record<
    "activeSubs" | "trialing" | "canceling" | "expiring" | "canceled30" | "newSubs30",
    Count
  >;
  referrals: { pending: Count; rewarded: Count };
  feedback: { category: string; message: string; created_at: string }[];
};

const COPY = {
  en: {
    title: "Insights",
    note: "Aggregate counts only. No private portfolios or messages are shown.",
    growth: "Growth",
    visits: "Visitors",
    visits1: "Unique visitors, 24 hours",
    visits7: "Unique visitors, 7 days",
    visits30: "Unique visitors, 30 days",
    sessions30: "Visits (sessions), 30 days",
    returning30: "Returning visitors, 30 days",
    avgTime30: "Average time per visit, 30 days",
    pricing30: "Visitors who viewed pricing, 30 days",
    signup30v: "Visitors who signed up, 30 days",
    visitsNote:
      "Counts only visitors who allowed analytics (random ID, no personal data), so real traffic is higher.",
    signups7: "Sign-ups, 7 days",
    signups30: "Sign-ups, 30 days",
    activated: "Accounts with a transaction",
    activatedRate: "Share of all accounts with a transaction",
    capped: "Scan is capped, so this is a lower bound.",
    funnel: "Funnel, last 30 days (events)",
    events: {
      pricing_view: "Pricing viewed",
      signup_completed: "Sign-ups completed",
      first_holding_added: "First holding added",
      csv_import_started: "CSV import started",
      csv_import_completed: "CSV import completed",
      checkout_started: "Checkout started",
      checkout_completed: "Checkout completed",
      referral_link_copied: "Invite link copied",
    },
    features: "Feature use",
    advisor7: "AI questions, 7 days",
    advisor30: "AI questions, 30 days",
    companies7: "Company analyses, 7 days",
    companies30: "Company analyses, 30 days",
    journal: "Journal notes",
    goals: "Goals",
    shareNote: "Share-as-image use is not tracked.",
    revenue: "Subscriptions",
    activeSubs: "Active",
    trialing: "Trialing",
    newSubs30: "New, 30 days",
    canceled30: "Ended, 30 days",
    canceling: "Set to cancel at period end",
    expiring: "Renewing or ending in 14 days",
    referrals: "Invitations",
    pending: "Joined, waiting for first payment",
    rewarded: "Rewarded",
    feedback: "Latest feedback",
    noFeedback: "No feedback yet.",
    unavailable: "n/a",
    loadError: "Insights are unavailable right now.",
    updated: "Updated",
  },
  bg: {
    title: "Показатели",
    note: "Само обобщени числа. Не се показват лични портфейли или съобщения.",
    growth: "Растеж",
    visits: "Посетители",
    visits1: "Уникални посетители, 24 часа",
    visits7: "Уникални посетители, 7 дни",
    visits30: "Уникални посетители, 30 дни",
    sessions30: "Посещения (сесии), 30 дни",
    returning30: "Върнали се посетители, 30 дни",
    avgTime30: "Средно време на посещение, 30 дни",
    pricing30: "Посетители, разгледали цените, 30 дни",
    signup30v: "Посетители, регистрирали се, 30 дни",
    visitsNote:
      "Отчитат се само посетители, разрешили анализите (случаен ID, без лични данни), затова реалният трафик е по-голям.",
    signups7: "Регистрации, 7 дни",
    signups30: "Регистрации, 30 дни",
    activated: "Профили с поне една сделка",
    activatedRate: "Дял от всички профили със сделка",
    capped: "Прегледът е ограничен, затова числото е минимум.",
    funnel: "Фуния, последните 30 дни (събития)",
    events: {
      pricing_view: "Разгледани цени",
      signup_completed: "Завършени регистрации",
      first_holding_added: "Добавена първа позиция",
      csv_import_started: "Започнат CSV импорт",
      csv_import_completed: "Завършен CSV импорт",
      checkout_started: "Започнато плащане",
      checkout_completed: "Завършено плащане",
      referral_link_copied: "Копиран линк за покана",
    },
    features: "Ползване на функции",
    advisor7: "Въпроси към AI, 7 дни",
    advisor30: "Въпроси към AI, 30 дни",
    companies7: "Анализи на компании, 7 дни",
    companies30: "Анализи на компании, 30 дни",
    journal: "Бележки в дневника",
    goals: "Цели",
    shareNote: "Споделянето като картинка не се проследява.",
    revenue: "Абонаменти",
    activeSubs: "Активни",
    trialing: "В пробен период",
    newSubs30: "Нови, 30 дни",
    canceled30: "Приключили, 30 дни",
    canceling: "Със спиране в края на периода",
    expiring: "Подновяване или край до 14 дни",
    referrals: "Покани",
    pending: "Регистрирани, чакат първо плащане",
    rewarded: "Възнаградени",
    feedback: "Последна обратна връзка",
    noFeedback: "Още няма обратна връзка.",
    unavailable: "н/д",
    loadError: "Показателите не са налични в момента.",
    updated: "Обновено",
  },
};

export function AdminInsights({ bg, total }: { bg: boolean; total: number | null }) {
  const c = bg ? COPY.bg : COPY.en;
  const [data, setData] = useState<Insights | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        if (!token) throw new Error("no session");
        const response = await fetch("/api/admin-insights", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("failed");
        const body = (await response.json()) as Insights;
        if (active) setData(body);
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const num = (value: Count) => (value === null ? c.unavailable : value.toLocaleString());
  const v30 = data?.visits.visits30 ?? null;
  const v = (value: number | undefined) => (value === undefined ? c.unavailable : num(value));
  const duration = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined) return c.unavailable;
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  };
  const withShare = (count: number | undefined) => {
    if (count === undefined || !v30) return c.unavailable;
    const share = v30.unique_visitors
      ? ` (${Math.round((count / v30.unique_visitors) * 100)}%)`
      : "";
    return `${count.toLocaleString()}${share}`;
  };

  if (failed)
    return (
      <Card>
        <p className="text-sm text-muted-foreground">{c.loadError}</p>
      </Card>
    );
  if (!data) return null;

  const activated = data.growth.usersWithTransactions;
  const rate =
    activated !== null && total ? `${Math.round((activated / total) * 100)}%` : c.unavailable;

  const Block = ({ title, rows }: { title: string; rows: [string, string][] }) => (
    <Card className="space-y-3">
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <dl className="space-y-1.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );

  return (
    <section className="grid gap-3">
      <div>
        <h2 className="font-display text-xl font-semibold">{c.title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {c.note} {c.visitsNote} {c.updated}: {new Date(data.generatedAt).toLocaleString()}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Block
          title={c.visits}
          rows={[
            [c.visits1, v(data.visits.visits1?.unique_visitors)],
            [c.visits7, v(data.visits.visits7?.unique_visitors)],
            [c.visits30, v(v30?.unique_visitors)],
            [c.sessions30, v(v30?.sessions)],
            [c.returning30, v(v30?.returning_visitors)],
            [c.avgTime30, duration(v30?.avg_session_seconds)],
            [c.pricing30, withShare(v30?.visitors_pricing)],
            [c.signup30v, withShare(v30?.visitors_signup)],
          ]}
        />
        <Block
          title={c.growth}
          rows={[
            [c.signups7, num(data.growth.signups7)],
            [c.signups30, num(data.growth.signups30)],
            [c.activated, num(activated)],
            [c.activatedRate, rate],
          ]}
        />
        <Block
          title={c.features}
          rows={[
            [c.advisor7, num(data.features.advisor7)],
            [c.advisor30, num(data.features.advisor30)],
            [c.companies7, num(data.features.companies7)],
            [c.companies30, num(data.features.companies30)],
            [c.journal, num(data.features.journal)],
            [c.goals, num(data.features.goals)],
          ]}
        />
        <Block
          title={c.funnel}
          rows={Object.entries(c.events).map(([key, label]) => [
            label,
            num(data.events30[key] ?? null),
          ])}
        />
        <Block
          title={c.revenue}
          rows={[
            [c.activeSubs, num(data.revenue.activeSubs)],
            [c.trialing, num(data.revenue.trialing)],
            [c.newSubs30, num(data.revenue.newSubs30)],
            [c.canceled30, num(data.revenue.canceled30)],
            [c.canceling, num(data.revenue.canceling)],
            [c.expiring, num(data.revenue.expiring)],
          ]}
        />
        <Block
          title={c.referrals}
          rows={[
            [c.pending, num(data.referrals.pending)],
            [c.rewarded, num(data.referrals.rewarded)],
          ]}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {c.shareNote} {data.growth.usersWithTransactionsCapped ? c.capped : ""}
      </p>
      <Card className="space-y-3">
        <h3 className="font-display text-base font-semibold">{c.feedback}</h3>
        {data.feedback.length ? (
          <ul className="divide-y divide-border/70">
            {data.feedback.map((item) => (
              <li key={`${item.created_at}-${item.message.slice(0, 20)}`} className="py-2 text-sm">
                <p className="text-xs text-muted-foreground">
                  {item.category} · {new Date(item.created_at).toLocaleDateString()}
                </p>
                <p className="mt-0.5 whitespace-pre-line break-words">{item.message}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{c.noFeedback}</p>
        )}
      </Card>
    </section>
  );
}
