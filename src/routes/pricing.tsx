import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { isCreemTestMode } from "@/lib/creem";
import { paymentsCopy } from "@/lib/payments-i18n";
import { Check, Bot, Flame, LayoutGrid, CalendarRange, Layers } from "lucide-react";
import { proCopy } from "@/lib/pro-i18n";
import {
  BarsSilhouette,
  CurveSilhouette,
  HeatmapSilhouette,
  ProBadge,
} from "@/components/ProFeatures";
import { Card } from "@/components/AppShell";
import { usePortfolio } from "@/lib/store";
import { planCopy } from "@/lib/plan-i18n";
import { supabase } from "@/integrations/supabase/client";
import { trackAnalyticsEvent } from "@/lib/analytics";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Capispot Free & Pro plans" },
      {
        name: "description",
        content:
          "Free plan with 1 broker, Pro for €4.99/month or €49.99/year including VAT, with up to 5 brokers.",
      },
      { property: "og:title", content: "Pricing — Capispot" },
      {
        property: "og:description",
        content: "Pro: €4.99/month or €49.99/year including VAT, up to 5 broker connections.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  const p = usePortfolio();
  const [yearly, setYearly] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activating, setActivating] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCounts, setReferralCounts] = useState({ pending: 0, rewarded: 0 });
  const c = paymentsCopy[p.lang];
  const pc = proCopy[p.lang];
  const { isPro, reload } = p;
  useEffect(() => {
    trackAnalyticsEvent("pricing_view");
    if (new URLSearchParams(window.location.search).get("checkout") === "success") {
      trackAnalyticsEvent("checkout_completed");
      if (isCreemTestMode()) toast.success(c.testSuccess);
      else setActivating(true);
    }
  }, [c.testSuccess]);
  useEffect(() => {
    if (!p.user) {
      setReferralCode(null);
      setReferralCounts({ pending: 0, rewarded: 0 });
      return;
    }
    let active = true;
    void Promise.all([
      supabase.from("profiles").select("referral_code").eq("id", p.user.id).maybeSingle(),
      supabase.from("referrals").select("status").eq("referrer_id", p.user.id),
    ])
      .then(([profile, referrals]) => {
        if (!active) return;
        if (profile.error) {
          toast.error(profile.error.message);
          return;
        }
        if (referrals.error) {
          toast.error(referrals.error.message);
          return;
        }
        setReferralCode(profile.data?.referral_code ?? null);
        setReferralCounts({
          pending: referrals.data.filter((referral) => referral.status === "pending").length,
          rewarded: referrals.data.filter((referral) => referral.status === "rewarded").length,
        });
      })
      .catch((error: unknown) => {
        if (active)
          toast.error(error instanceof Error ? error.message : "Unable to load referral details");
      });
    return () => {
      active = false;
    };
  }, [p.user]);
  // Pro is granted only by the verified payment notification; poll until it lands.
  useEffect(() => {
    if (!activating) return;
    if (isPro) {
      setActivating(false);
      toast.success(c.success);
      return;
    }
    const t = setInterval(() => {
      void reload();
    }, 3000);
    return () => clearInterval(t);
  }, [activating, isPro, reload, c.success]);
  const buy = async () => {
    if (!p.user) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session?.access_token) throw new Error("Sign-in session expired");
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ interval: yearly ? "year" : "month" }),
      });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || c.failed);
      const checkoutUrl = new URL(result.url);
      if (
        checkoutUrl.protocol !== "https:" ||
        (checkoutUrl.hostname !== "creem.io" && !checkoutUrl.hostname.endsWith(".creem.io"))
      )
        throw new Error(c.failed);
      window.location.assign(checkoutUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : c.failed);
    } finally {
      setBusy(false);
    }
  };
  const copyReferralLink = async () => {
    if (!referralCode) return;
    const link = `${window.location.origin}/auth?ref=${encodeURIComponent(referralCode)}`;
    try {
      await navigator.clipboard.writeText(link);
      trackAnalyticsEvent("referral_link_copied");
      toast.success(planCopy[p.lang].referralCopied);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to copy referral link");
    }
  };
  const Feature = ({ children }: { children: string }) => (
    <li className="flex gap-2 text-sm">
      <Check size={16} className="mt-0.5 text-primary" />
      {children}
    </li>
  );
  return (
    <div className="mx-auto max-w-4xl py-4">
      <h1 className="font-display text-center text-3xl font-bold">{p.t("pricing")}</h1>
      <div className="mx-auto mt-5 flex w-fit rounded-full bg-secondary p-1 text-sm">
        {[false, true].map((y) => (
          <button
            key={String(y)}
            onClick={() => setYearly(y)}
            className={`rounded-full px-4 py-1.5 font-semibold capitalize ${yearly === y ? "bg-card shadow-sm" : "text-muted-foreground"}`}
          >
            {y ? p.t("perYear").replace("/ ", "") : p.t("perMonth").replace("/ ", "")}
          </button>
        ))}
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <Card className="hover-lift-card p-7">
          <h2 className="font-display text-xl font-semibold">{p.t("free")}</h2>
          <p className="font-display my-3 text-4xl font-bold">€0</p>
          <ul className="space-y-2">
            <Feature>{p.t("freeF1")}</Feature>
            <Feature>{p.t("freeF2")}</Feature>
            <Feature>{p.t("freeF3")}</Feature>
          </ul>
          <div className="mt-6">
            {p.user ? (
              <span className="text-sm text-muted-foreground">
                {!p.isPro && p.t("currentPlan")}
              </span>
            ) : (
              <Link
                to="/auth"
                className="inline-block rounded-full border border-border px-5 py-2 text-sm font-semibold"
              >
                {p.t("signUp")}
              </Link>
            )}
          </div>
        </Card>
        <Card className="hover-lift-card border-primary p-7">
          <h2 className="font-display text-xl font-semibold">{p.t("pro")}</h2>
          <p className="font-display my-3 text-4xl font-bold">
            {yearly ? "€49.99" : "€4.99"}
            <span className="text-base font-medium text-muted-foreground">
              {" "}
              {yearly ? p.t("perYear") : p.t("perMonth")}
            </span>
          </p>
          <ul className="space-y-2">
            <Feature>{p.t("proF1")}</Feature>
            <Feature>{p.t("proF2")}</Feature>
            <Feature>{p.t("proF3")}</Feature>
            <Feature>{pc.heatmap}</Feature>
            <Feature>{pc.income}</Feature>
            <Feature>{pc.fire}</Feature>
            <Feature>{pc.advisor}</Feature>
            <Feature>{planCopy[p.lang].watchlist}</Feature>
          </ul>
          <div className="mt-6">
            {p.isPro ? (
              <span className="text-sm font-semibold text-primary">{p.t("currentPlan")}</span>
            ) : activating ? (
              <span className="text-sm text-muted-foreground">{c.processing}</span>
            ) : p.user ? (
              <button
                onClick={buy}
                disabled={busy}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {c.upgrade}
              </button>
            ) : (
              <Link
                to="/auth"
                className="inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
              >
                {c.upgrade}
              </Link>
            )}
          </div>
        </Card>
      </div>
      <p className="mt-3 text-center text-xs font-semibold text-primary">
        {planCopy[p.lang].yearlySave}
      </p>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        {yearly ? planCopy[p.lang].yearlyDetails : planCopy[p.lang].monthlyDetails}
      </p>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        {planCopy[p.lang].taxIncluded}
      </p>
      <section className="mt-8" aria-labelledby="trial-faq-title">
        <h2 id="trial-faq-title" className="font-display text-center text-xl font-bold">
          {planCopy[p.lang].trialFaqTitle}
        </h2>
        <div className="mx-auto mt-4 max-w-2xl divide-y divide-border rounded-2xl border border-border px-4">
          {planCopy[p.lang].trialFaq.map(([question, answer]) => (
            <details key={question} className="group py-4">
              <summary className="cursor-pointer font-semibold marker:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
                {question}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{answer}</p>
            </details>
          ))}
        </div>
      </section>
      {p.user && referralCode && (
        <Card className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display font-semibold">{planCopy[p.lang].referralTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{planCopy[p.lang].referralBody}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {planCopy[p.lang].referralStatus(referralCounts.pending, referralCounts.rewarded)}
            </p>
          </div>
          <button
            onClick={() => void copyReferralLink()}
            className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            {planCopy[p.lang].referralCopy}
          </button>
        </Card>
      )}
      <section className="mt-12">
        <h2 className="font-display text-center text-2xl font-bold">
          {planCopy[p.lang].compareTitle}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">
          {planCopy[p.lang].compareSub}
        </p>
        <Card className="mt-6 overflow-hidden p-0">
          <div className="grid grid-cols-[1fr_1fr_1.3fr] gap-2 border-b border-border bg-secondary/50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <span />
            <span>{planCopy[p.lang].freeTag}</span>
            <span className="text-primary">{planCopy[p.lang].proTag}</span>
          </div>
          {planCopy[p.lang].groups.map((g) => (
            <div
              key={g.title}
              className="grid grid-cols-[1fr_1fr_1.3fr] gap-2 border-b border-border px-4 py-3 text-sm last:border-0"
            >
              <span className="font-semibold">{g.title}</span>
              <span className="text-muted-foreground">{g.free}</span>
              <span className="flex gap-1.5">
                <Check size={14} className="mt-0.5 shrink-0 text-primary" />
                {g.pro}
              </span>
            </div>
          ))}
        </Card>
      </section>
      <section className="mt-14">
        <div className="text-center">
          <ProBadge />
          <h2 className="font-display mt-2 text-2xl font-bold">{pc.showcaseTitle}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{pc.showcaseSub}</p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            [LayoutGrid, pc.heatmap, pc.heatmapDesc, <HeatmapSilhouette key="h" />],
            [CalendarRange, pc.income, pc.incomeDesc, <BarsSilhouette key="b" />],
            [Flame, pc.fire, pc.fireDesc, <CurveSilhouette key="c" />],
          ].map(([Icon, t, d, v], i) => {
            const I = Icon as typeof Flame;
            return (
              <Card key={i} className="p-5">
                <div className="mb-4 rounded-xl bg-secondary/60 p-3">{v as React.ReactNode}</div>
                <h3 className="font-display flex items-center gap-2 font-semibold">
                  <I size={18} className="text-primary" />
                  {t as string}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{d as string}</p>
              </Card>
            );
          })}
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Card className="flex gap-3 p-5">
            <Bot className="shrink-0 text-primary" />
            <div>
              <h3 className="font-display font-semibold">{pc.advisor}</h3>
              <p className="text-sm text-muted-foreground">{pc.advisorDesc}</p>
            </div>
          </Card>
          <Card className="flex gap-3 p-5">
            <Layers className="shrink-0 text-primary" />
            <div>
              <h3 className="font-display font-semibold">{pc.brokers}</h3>
              <p className="text-sm text-muted-foreground">{pc.brokersDesc}</p>
            </div>
          </Card>
        </div>
        {!p.isPro && (
          <div className="mt-8 text-center">
            {p.user ? (
              <button
                onClick={buy}
                disabled={busy}
                className="rounded-full bg-primary px-6 py-2.5 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {c.upgrade}
              </button>
            ) : (
              <Link
                to="/auth"
                className="inline-block rounded-full bg-primary px-6 py-2.5 font-semibold text-primary-foreground"
              >
                {c.upgrade}
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
