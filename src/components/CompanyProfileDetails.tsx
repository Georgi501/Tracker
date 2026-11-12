import { Card } from "@/components/AppShell";
import { CompanyOverview } from "@/components/CompanyOverview";
import { DcfCalculator } from "@/components/DcfCalculator";
import { KeyStats } from "@/components/KeyStats";
import { ProCompanyResearch } from "@/components/ProCompanyResearch";
import { BarsSilhouette } from "@/components/ProFeatures";
import { ProFinancials } from "@/components/ProFinancials";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { dcfCopy } from "@/lib/dcf-copy";
import type { Lang } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

const COPY: Record<
  Lang,
  {
    title: string;
    limit: string;
    used: (used: number) => string;
    remaining: (remaining: number) => string;
    signup: string;
    signedOut: string;
    locked: string;
    upgrade: string;
    loading: string;
    failed: string;
    retry: string;
    proUnlimited: string;
    dcfIncluded: string;
  }
> = {
  en: {
    title: "Full company profile",
    limit: "Explore up to 2 companies each calendar week with a free account.",
    used: (used) => `${used} of 2 free company profiles used this week`,
    remaining: (remaining) => `${remaining} free ${remaining === 1 ? "view" : "views"} left`,
    signup: "Create a free account",
    signedOut: "Sign in or create a free account to explore this company's full profile.",
    locked: "You've used this week's free company profiles. Upgrade to Pro for unlimited access.",
    upgrade: "Explore Pro",
    loading: "Checking your weekly company views…",
    failed:
      "We couldn't check your weekly company views. Company data stays locked until this is resolved.",
    retry: "Try again",
    proUnlimited: "Pro includes unlimited company profiles.",
    dcfIncluded:
      "The DCF calculator is included in this company's weekly profile view and does not use another company view. Estimates appear only when usable provider data is available.",
  },
  bg: {
    title: "Пълен профил на компанията",
    limit: "Разглеждай до 2 компании за всяка календарна седмица с безплатен профил.",
    used: (used) => `Използвани профили тази седмица: ${used} от 2`,
    remaining: (remaining) =>
      `Остават ${remaining} безплатни ${remaining === 1 ? "преглед" : "прегледа"}`,
    signup: "Създай безплатен профил",
    signedOut:
      "Влез или създай безплатен профил, за да разгледаш пълната информация за компанията.",
    locked: "Използва безплатните прегледи за тази седмица. Премини към Pro за неограничен достъп.",
    upgrade: "Виж Pro",
    loading: "Проверяваме седмичните прегледи на компании…",
    failed:
      "Не успяхме да проверим седмичните прегледи. Данните остават заключени, докато проблемът не бъде разрешен.",
    retry: "Опитай отново",
    proUnlimited: "Pro включва неограничени профили на компании.",
    dcfIncluded:
      "DCF калкулаторът е включен в седмичния преглед на тази компания и не заема отделен преглед. Оценка се показва само при налични подходящи данни от доставчика.",
  },
  de: {
    title: "Vollständiges Unternehmensprofil",
    limit: "Mit einem kostenlosen Konto kannst du bis zu 2 Unternehmen pro Kalenderwoche ansehen.",
    used: (used) => `${used} von 2 kostenlosen Unternehmensprofilen diese Woche genutzt`,
    remaining: (remaining) =>
      `Noch ${remaining} kostenlose ${remaining === 1 ? "Ansicht" : "Ansichten"} übrig`,
    signup: "Kostenloses Konto erstellen",
    signedOut:
      "Melde dich an oder erstelle ein kostenloses Konto, um das vollständige Profil zu sehen.",
    locked:
      "Du hast die kostenlosen Unternehmensprofile dieser Woche genutzt. Mit Pro erhältst du unbegrenzten Zugriff.",
    upgrade: "Pro entdecken",
    loading: "Wöchentliche Unternehmensansichten werden geprüft…",
    failed:
      "Deine wöchentlichen Ansichten konnten nicht geprüft werden. Unternehmensdaten bleiben bis zur Klärung gesperrt.",
    retry: "Erneut versuchen",
    proUnlimited: "Pro bietet unbegrenzte Unternehmensprofile.",
    dcfIncluded:
      "Der DCF-Rechner ist in der wöchentlichen Profilansicht dieses Unternehmens enthalten und verbraucht keinen zusätzlichen Unternehmensaufruf. Eine Bewertung erscheint nur, wenn geeignete Anbieterdaten verfügbar sind.",
  },
  es: {
    title: "Perfil completo de la empresa",
    limit: "Con una cuenta gratuita puedes explorar hasta 2 empresas por semana natural.",
    used: (used) => `${used} de 2 perfiles gratuitos utilizados esta semana`,
    remaining: (remaining) =>
      `Quedan ${remaining} ${remaining === 1 ? "vista gratuita" : "vistas gratuitas"}`,
    signup: "Crear una cuenta gratuita",
    signedOut:
      "Inicia sesión o crea una cuenta gratuita para explorar el perfil completo de esta empresa.",
    locked:
      "Has utilizado los perfiles gratuitos de esta semana. Pásate a Pro para obtener acceso ilimitado.",
    upgrade: "Descubrir Pro",
    loading: "Comprobando las vistas semanales de empresas…",
    failed:
      "No se pudieron comprobar tus vistas semanales. Los datos seguirán bloqueados hasta resolverlo.",
    retry: "Reintentar",
    proUnlimited: "Pro incluye perfiles de empresa ilimitados.",
    dcfIncluded:
      "La calculadora DCF está incluida en la vista semanal del perfil de esta empresa y no consume otra vista. La valoración solo aparece si hay datos adecuados del proveedor.",
  },
  it: {
    title: "Profilo aziendale completo",
    limit: "Con un account gratuito puoi esplorare fino a 2 aziende per settimana di calendario.",
    used: (used) => `${used} di 2 profili aziendali gratuiti utilizzati questa settimana`,
    remaining: (remaining) =>
      `Restano ${remaining} ${remaining === 1 ? "visita gratuita" : "visite gratuite"}`,
    signup: "Crea un account gratuito",
    signedOut:
      "Accedi o crea un account gratuito per esplorare il profilo completo di questa azienda.",
    locked:
      "Hai utilizzato i profili aziendali gratuiti di questa settimana. Passa a Pro per l'accesso illimitato.",
    upgrade: "Scopri Pro",
    loading: "Verifica delle visite aziendali settimanali…",
    failed:
      "Impossibile verificare le visite settimanali. I dati aziendali restano bloccati fino alla risoluzione.",
    retry: "Riprova",
    proUnlimited: "Pro include profili aziendali illimitati.",
    dcfIncluded:
      "Il calcolatore DCF è incluso nella visualizzazione settimanale del profilo aziendale e non consuma un'altra visita. La valutazione appare solo se sono disponibili dati adeguati del fornitore.",
  },
};

function currentUtcWeekStart() {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

export function CompanyProfileDetails({
  symbol,
  name,
  lang,
  userId,
  isPro,
}: {
  symbol: string;
  name: string;
  lang: Lang;
  userId: string | null;
  isPro: boolean;
}) {
  const c = COPY[lang];
  const weekStart = currentUtcWeekStart();
  const query = useQuery({
    queryKey: ["company-profile-access", userId, weekStart, symbol],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("claim_company_profile_view", {
        _symbol: symbol,
      });
      if (error) throw error;
      const result = data?.[0];
      if (!result) throw new Error("Company profile access check returned no result.");
      return result;
    },
    enabled: !!userId && !isPro,
    staleTime: 60_000,
  });
  const used = query.data?.used ?? 0;
  const unlocked = isPro || query.data?.allowed === true;

  if (!isPro && !userId) {
    return (
      <LockedProfile
        title={c.title}
        description={c.signedOut}
        limit={c.limit}
        action={c.signup}
        href="/auth"
      />
    );
  }

  if (!isPro && query.isPending) {
    return (
      <ProfileSectionAnchors>
        <Card aria-live="polite">
          <p className="text-sm text-muted-foreground">{c.loading}</p>
        </Card>
      </ProfileSectionAnchors>
    );
  }

  if (!isPro && query.isError) {
    return (
      <ProfileSectionAnchors>
        <Card>
          <p role="alert" className="text-sm text-destructive">
            {c.failed}
          </p>
          <Button className="mt-3" variant="outline" onClick={() => void query.refetch()}>
            {c.retry}
          </Button>
        </Card>
      </ProfileSectionAnchors>
    );
  }

  if (!unlocked) {
    return (
      <LockedProfile
        title={c.title}
        description={c.locked}
        limit={c.used(used)}
        action={c.upgrade}
        href="/pricing"
      />
    );
  }

  return (
    <div className="space-y-5">
      {!isPro && query.data && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/[0.045] px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{c.used(used)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {c.remaining(Math.max(0, 2 - used))}
            </p>
          </div>
          <Link to="/pricing" hash="plan-comparison" className="text-xs font-semibold text-primary">
            {c.proUnlimited}
          </Link>
        </div>
      )}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <KeyStats symbol={symbol} lang={lang} />
      </div>
      <div id="financials" className="scroll-mt-36">
        <ProFinancials symbol={symbol} lang={lang} />
      </div>
      <div id="valuation" className="scroll-mt-24">
        <Card>
          <h2 className="mb-4 font-display text-lg font-semibold">
            {dcfCopy[lang].intrinsic} (DCF)
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">{c.dcfIncluded}</p>
          <DcfCalculator key={symbol} fixedSymbol={symbol} />
        </Card>
      </div>
      <div id="research" className="scroll-mt-24">
        <ProCompanyResearch symbol={symbol} lang={lang} unlocked />
      </div>
      <div id="news" className="scroll-mt-24">
        <CompanyOverview asset={{ symbol, name, type: "stock" }} lang={lang} />
      </div>
    </div>
  );
}

function LockedProfile({
  title,
  description,
  limit,
  action,
  href,
}: {
  title: string;
  description: string;
  limit: string;
  action: string;
  href: "/auth" | "/pricing";
}) {
  return (
    <ProfileSectionAnchors>
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="font-display font-semibold">{title}</h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            <Sparkles size={10} />
            Pro
          </span>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-border/70 bg-background/50">
          <div aria-hidden className="pointer-events-none select-none blur-[3px] opacity-40">
            <BarsSilhouette />
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70 p-4 text-center">
            <Lock size={19} className="text-primary" />
            <p className="max-w-md text-sm font-medium">{description}</p>
            <p className="text-xs text-muted-foreground">{limit}</p>
            <Link
              to={href}
              {...(href === "/pricing" ? { hash: "plan-comparison" } : {})}
              className="press mt-1 inline-flex min-h-9 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              {action}
            </Link>
          </div>
        </div>
      </Card>
    </ProfileSectionAnchors>
  );
}

function ProfileSectionAnchors({ children }: { children: ReactNode }) {
  return (
    <div id="financials" className="scroll-mt-36">
      <div id="research" className="scroll-mt-24">
        <div id="news" className="scroll-mt-24">
          <div id="valuation" className="scroll-mt-24">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
