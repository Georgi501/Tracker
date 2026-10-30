import { legalCopy, SUPPORT_EMAIL } from "@/lib/legal";
import { advisorCopy } from "@/lib/advisor-i18n";
import { paymentsCopy } from "@/lib/payments-i18n";
import { isCreemTestMode } from "@/lib/creem";
import { toolsCopy } from "@/lib/tools-i18n";
import { europeCopy } from "@/lib/europe-i18n";
import { isLang, languages, type Lang } from "@/lib/i18n";
import { marketCopy } from "@/lib/market-i18n";
import { feedbackCopy } from "@/lib/feedback-i18n";
import { FeedbackDialog } from "./FeedbackDialog";
import { HeaderSearch } from "./HeaderSearch";
import { CommandMenu } from "./CommandMenu";
import { AuthForm } from "./AuthForm";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  Crown,
  Globe,
  Landmark,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Moon,
  PieChart,
  Plus,
  Search,
  ShieldCheck,
  Settings2,
  Sun,
  UserRound,
  Wallet,
} from "lucide-react";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePortfolio } from "@/lib/store";
import { useOwnAvatar } from "@/lib/own-avatar";
import type { Currency } from "@/lib/portfolio";
import { AddTransactionDialog } from "./AddTransactionDialog";
import { AnalyticsConsent } from "./AnalyticsConsent";

const SHELL_COPY: Record<
  Lang,
  {
    watchlist: string;
    timeline: string;
    community: string;
    demo: string;
    more: string;
    profile: string;
    account: string;
    owner: string;
    portfolioGroup: string;
    planningGroup: string;
    exploreGroup: string;
    quickNavigation: string;
  }
> = {
  en: {
    watchlist: "Watchlist",
    timeline: "Timeline",
    community: "Community",
    demo: "Sample portfolio",
    more: "More",
    profile: "Profile",
    account: "Account & billing",
    owner: "Owner console",
    portfolioGroup: "Portfolio",
    planningGroup: "Planning",
    exploreGroup: "Explore",
    quickNavigation: "Quick navigation",
  },
  bg: {
    watchlist: "Списък за наблюдение",
    timeline: "Хронология",
    community: "Общност",
    demo: "Примерно портфолио",
    more: "Още",
    profile: "Профил",
    account: "Профил и плащания",
    owner: "Панел на собственика",
    portfolioGroup: "Портфолио",
    planningGroup: "Планиране",
    exploreGroup: "Разглеждане",
    quickNavigation: "Бърза навигация",
  },
  de: {
    watchlist: "Beobachtungsliste",
    timeline: "Zeitleiste",
    community: "Community",
    demo: "Beispielportfolio",
    more: "Mehr",
    profile: "Profil",
    account: "Konto & Abrechnung",
    owner: "Eigentümerkonsole",
    portfolioGroup: "Portfolio",
    planningGroup: "Planung",
    exploreGroup: "Entdecken",
    quickNavigation: "Schnellnavigation",
  },
  es: {
    watchlist: "Lista de seguimiento",
    timeline: "Cronología",
    community: "Comunidad",
    demo: "Cartera de ejemplo",
    more: "Más",
    profile: "Perfil",
    account: "Cuenta y facturación",
    owner: "Panel del propietario",
    portfolioGroup: "Cartera",
    planningGroup: "Planificación",
    exploreGroup: "Explorar",
    quickNavigation: "Navegación rápida",
  },
  it: {
    watchlist: "Lista di controllo",
    timeline: "Cronologia",
    community: "Community",
    demo: "Portafoglio di esempio",
    more: "Altro",
    profile: "Profilo",
    account: "Account e fatturazione",
    owner: "Console proprietario",
    portfolioGroup: "Portafoglio",
    planningGroup: "Pianificazione",
    exploreGroup: "Esplora",
    quickNavigation: "Navigazione rapida",
  },
};

export function AppShell({ children }: { children: ReactNode }) {
  const p = usePortfolio();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const shellCopy = SHELL_COPY[p.lang];
  const [open, setOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const ownAvatar = useOwnAvatar(p.user?.id);
  useEffect(() => {
    document.documentElement.lang = p.lang;
  }, [p.lang]);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) > 8) setNavHidden(y > last && y > 120);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const openTransactionDialog = () => setOpen(true);
    window.addEventListener("folio-open-add-transaction", openTransactionDialog);
    return () => window.removeEventListener("folio-open-add-transaction", openTransactionDialog);
  }, []);
  const nav = [
    { to: "/", label: p.t("dashboard") },
    { to: "/holdings", label: p.t("holdings") },
    { to: "/markets", label: marketCopy[p.lang].markets },
    { to: "/watchlist", label: shellCopy.watchlist },
    { to: "/analytics", label: p.t("analytics") },
    { to: "/compare", label: legalCopy(p.lang).footer.compare },
    { to: "/timeline", label: shellCopy.timeline },
    { to: "/dividends", label: p.t("dividends") },
    { to: "/tools", label: toolsCopy[p.lang].tools },
    { to: "/advisor", label: advisorCopy[p.lang].advisor },
    { to: "/brokers", label: p.t("brokers") },
    { to: "/community", label: shellCopy.community },
    { to: "/demo", label: shellCopy.demo },
    { to: "/pricing", label: p.t("pricing") },
  ];
  const moreGroups = [
    {
      label: shellCopy.portfolioGroup,
      links: nav.filter((item) =>
        ["/compare", "/timeline", "/dividends", "/brokers"].includes(item.to),
      ),
    },
    {
      label: shellCopy.planningGroup,
      links: nav.filter((item) => ["/tools", "/advisor"].includes(item.to)),
    },
    {
      label: shellCopy.exploreGroup,
      links: nav.filter((item) => ["/community", "/demo", "/pricing"].includes(item.to)),
    },
  ];
  const mobileMoreGroups = [
    {
      label: shellCopy.portfolioGroup,
      links: nav.filter((item) =>
        ["/watchlist", "/analytics", "/compare", "/timeline", "/dividends", "/brokers"].includes(
          item.to,
        ),
      ),
    },
    {
      label: shellCopy.planningGroup,
      links: nav.filter((item) => ["/tools", "/advisor"].includes(item.to)),
    },
    {
      label: shellCopy.exploreGroup,
      links: [
        ...nav.filter((item) => ["/community", "/demo", "/pricing"].includes(item.to)),
        { to: "/profile", label: shellCopy.profile },
        { to: "/account", label: shellCopy.account },
      ],
    },
  ];
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(error.message);
        return;
      }
      await qc.cancelQueries();
      qc.clear();
      await navigate({ to: "/auth", replace: true });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : p.lang === "bg"
            ? "Неуспешно излизане от профила."
            : "Unable to sign out.",
      );
    }
  };
  useEffect(() => {
    if (!p.user) return;
    let referralCode: string | null = null;
    try {
      referralCode = sessionStorage.getItem("folio-referral-code");
    } catch (error) {
      console.error("Unable to read referral code", error);
      return;
    }
    if (!referralCode || !/^[a-fA-F0-9]{16}$/.test(referralCode)) return;
    let active = true;
    void (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const token = data.session?.access_token;
      if (!token) return;
      const response = await fetch("/api/referrals/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: referralCode }),
      });
      if (!response.ok) throw new Error(`Referral could not be linked (${response.status})`);
      if (active) sessionStorage.removeItem("folio-referral-code");
    })().catch((error: unknown) => {
      console.error("Unable to link referral", error);
    });
    return () => {
      active = false;
    };
  }, [p.user]);
  return (
    <div className="min-h-screen">
      {isCreemTestMode() && (
        <div className="topband px-4 py-1.5 text-center text-xs">
          {paymentsCopy[p.lang].testBanner}
        </div>
      )}
      <header className="header-as sticky top-0 z-30">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:h-16 lg:gap-4">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <span className="brand-wordmark font-display text-lg font-bold tracking-tight sm:text-xl">
              <span className="b1">Capi</span>
              <span className="b2">Spot</span>
            </span>
          </Link>
          <nav className="ml-2 hidden items-center lg:flex">
            {nav.slice(0, 5).map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: true }}
                className="as-link"
                activeProps={{ className: "as-link-active" }}
              >
                {n.label}
              </Link>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="as-link flex items-center gap-1">
                  {shellCopy.more}
                  <ChevronDown size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {moreGroups.map((group, index) => (
                  <Fragment key={group.label}>
                    {index > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                        {group.label}
                      </DropdownMenuLabel>
                      {group.links.map((n) => (
                        <DropdownMenuItem key={n.to} asChild>
                          <Link to={n.to}>{n.label}</Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </Fragment>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
          <div className="min-w-0 flex-1 lg:max-w-md">
            <HeaderSearch />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <CommandMenu onAddTx={() => setOpen(true)} />
            {p.isPro ? (
              <span className="hidden rounded-md bg-primary px-2.5 py-1.5 text-xs font-bold text-primary-foreground md:inline">
                PRO
              </span>
            ) : (
              <Link
                to="/pricing"
                className="press hidden rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 md:inline"
              >
                {p.lang === "bg" ? "Безплатен план" : "Free plan"}
              </Link>
            )}
            <button
              onClick={() => {
                if (p.user) setOpen(true);
                else navigate({ to: "/auth" });
              }}
              aria-label={p.t("addTx")}
              title={p.t("addTx")}
              className="press hidden size-9 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground md:grid"
            >
              <Plus size={17} />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label={p.t("language")}
                  title={p.t("language")}
                  className="press flex h-9 items-center gap-1 rounded-md px-2 text-sm font-semibold text-foreground hover:bg-secondary"
                >
                  <Globe size={15} className="text-muted-foreground" />
                  {p.lang.toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {p.t("language")}
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={p.lang}
                  onValueChange={(l) => {
                    if (isLang(l)) p.setLang(l);
                  }}
                >
                  {languages.map((l) => (
                    <DropdownMenuRadioItem key={l.code} value={l.code} lang={l.code}>
                      <span className="min-w-7 text-xs text-muted-foreground">
                        {l.code.toUpperCase()}
                      </span>
                      {l.name}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label={europeCopy[p.lang].base}
                  title={europeCopy[p.lang].base}
                  className="press grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <Settings2 size={17} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {europeCopy[p.lang].base}
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={p.currency}
                  onValueChange={(c) => {
                    if (c === "EUR" || c === "USD") p.setCurrency(c as Currency);
                  }}
                >
                  <DropdownMenuRadioItem value="EUR">€ EUR</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="USD">$ USD</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    p.toggleTheme();
                  }}
                >
                  {p.theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
                  {p.t("toggleTheme")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {p.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label={p.displayName || p.user.email || "account"}
                    className="press relative ml-1 grid size-9 place-items-center overflow-hidden rounded-full bg-primary text-sm font-bold text-primary-foreground"
                  >
                    {ownAvatar ? (
                      <img src={ownAvatar} alt="" className="size-9 object-cover" />
                    ) : (
                      (p.displayName || p.user.email || "?").slice(0, 1).toUpperCase()
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <div className="px-2 py-1.5">
                    <p className="truncate text-sm font-semibold">
                      {p.displayName || p.user.email}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {p.isPro ? "Pro" : p.lang === "bg" ? "Безплатен план" : "Free plan"}
                    </p>
                  </div>
                  {!p.isPro && (
                    <DropdownMenuItem asChild>
                      <Link to="/pricing" className="font-semibold text-primary">
                        <Crown size={14} />
                        {p.lang === "bg" ? "Надгради до Pro" : "Upgrade to Pro"}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/account">
                      <Settings2 size={14} />
                      {shellCopy.account}
                    </Link>
                  </DropdownMenuItem>
                  {p.isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin">
                        <ShieldCheck size={14} />
                        {shellCopy.owner}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">
                      <UserRound size={14} />
                      {p.lang === "bg"
                        ? "Профил в общността"
                        : p.lang === "en"
                          ? "Community profile"
                          : shellCopy.profile}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/brokers">
                      <Landmark size={14} />
                      {p.t("brokers")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/analytics">
                      <PieChart size={14} />
                      {p.t("analytics")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFeedbackOpen(true)}>
                    <MessageSquare size={14} />
                    {feedbackCopy[p.lang].title}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void signOut()}>
                    <LogOut size={14} />
                    {p.t("signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                aria-label={p.t("signIn")}
                title={p.t("signIn")}
                className="press ml-1 grid size-9 place-items-center rounded-md text-foreground hover:bg-secondary"
              >
                <UserRound size={18} />
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="page-enter mx-auto max-w-7xl px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6 md:pb-6">
        {children}
      </main>
      <footer className="site-footer mt-10 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-0">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="brand-wordmark font-display text-lg font-bold tracking-tight">
                <span className="b1">Capi</span>
                <span className="b2">Spot</span>
              </span>
            </Link>
            <p className="mt-1 text-xs font-medium tracking-wide opacity-60">capispot.com</p>
            <p className="mt-2 text-sm opacity-75">{legalCopy(p.lang).footer.tagline}</p>
          </div>
          <div>
            <h4 className="footer-h">{legalCopy(p.lang).footer.product}</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to="/pricing">{p.t("pricing")}</Link>
              </li>
              <li>
                <Link to="/compare">{legalCopy(p.lang).footer.compare}</Link>
              </li>
              <li>
                <Link to="/markets">{marketCopy[p.lang].markets}</Link>
              </li>
              <li>
                <Link to="/features">{p.lang === "bg" ? "Функции" : "Features"}</Link>
              </li>
              <li>
                <Link to="/demo">
                  {p.lang === "bg" ? "Примерно портфолио" : "Sample portfolio"}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="footer-h">{legalCopy(p.lang).footer.legal}</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="/policies/terms.html">{legalCopy(p.lang).terms.title}</a>
              </li>
              <li>
                <a href="/policies/privacy.html">{legalCopy(p.lang).privacy.title}</a>
              </li>
              <li>
                <a href="/policies/refund.html">{legalCopy(p.lang).refund.title}</a>
              </li>
              <li>
                <a href="/policies/ai-acceptable-use.html">
                  {p.lang === "bg" ? "Правила за AI" : "AI Acceptable Use"}
                </a>
              </li>
              <li>
                <Link to="/disclaimer">{legalCopy(p.lang).disclaimer.title}</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="footer-h">{legalCopy(p.lang).footer.contact}</h4>
            <p className="mt-3 text-sm opacity-75">
              {SUPPORT_EMAIL ? (
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
              ) : (
                legalCopy(p.lang).footer.emailSoon
              )}
            </p>
            {SUPPORT_EMAIL ? (
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("CapiSpot feedback")}`}
                className="mt-3 inline-flex items-center gap-2 text-sm"
              >
                <MessageSquare size={16} />
                {feedbackCopy[p.lang].title}
              </a>
            ) : (
              <button
                type="button"
                onClick={() => setFeedbackOpen(true)}
                className="mt-3 inline-flex items-center gap-2 text-sm"
              >
                <MessageSquare size={16} />
                {feedbackCopy[p.lang].title}
              </button>
            )}
          </div>
        </div>
        <div className="footer-bottom">
          <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-4 py-4 text-xs opacity-70">
            <span>
              © {new Date().getFullYear()} Capispot. {legalCopy(p.lang).footer.rights}
            </span>
            <span>{legalCopy(p.lang).footer.notAdvice}</span>
          </div>
        </div>
      </footer>
      <nav
        aria-label={shellCopy.quickNavigation}
        data-hidden={navHidden}
        className="glass-bar fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex items-center justify-around rounded-2xl border border-border px-1 py-1.5 md:hidden"
      >
        {(
          [
            { to: "/", label: p.t("dashboard"), Icon: LayoutDashboard },
            { to: "/holdings", label: p.t("holdings"), Icon: Wallet },
          ] as const
        ).map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: true }}
            className="flex min-w-14 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-medium text-muted-foreground"
            activeProps={{ className: "text-primary bg-primary/10" }}
          >
            <Icon size={20} />
            <span className="max-w-16 truncate">{label}</span>
          </Link>
        ))}
        <button
          onClick={() => {
            if (p.user) setOpen(true);
            else navigate({ to: "/auth" });
          }}
          aria-label={p.t("addTx")}
          className="bg-brand-gradient -mt-7 grid size-14 place-items-center rounded-full text-primary-foreground shadow-glow ring-4 ring-background press"
        >
          <Plus size={24} />
        </button>
        <Link
          to="/markets"
          activeOptions={{ exact: true }}
          className="flex min-w-14 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-medium text-muted-foreground"
          activeProps={{ className: "text-primary bg-primary/10" }}
        >
          <Search size={20} />
          <span className="max-w-16 truncate">{marketCopy[p.lang].markets}</span>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label={shellCopy.more}
              aria-current={["/", "/holdings", "/markets"].includes(pathname) ? undefined : "page"}
              className={`flex min-w-14 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-medium ${
                ["/", "/holdings", "/markets"].includes(pathname)
                  ? "text-muted-foreground"
                  : "bg-primary/10 text-primary"
              }`}
            >
              <ChevronDown size={20} />
              <span className="max-w-16 truncate">{shellCopy.more}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            className="mb-2 max-h-[60dvh] w-64 overflow-y-auto"
          >
            {mobileMoreGroups.map((group, index) => (
              <Fragment key={group.label}>
                {index > 0 && <DropdownMenuSeparator />}
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {group.label}
                  </DropdownMenuLabel>
                  {group.links.map((item) => (
                    <DropdownMenuItem key={item.to} asChild>
                      <Link to={item.to}>{item.label}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </Fragment>
            ))}
            {!p.user && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setAuthOpen(true)}>
                  <UserRound size={14} />
                  {p.t("signIn")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
      <AddTransactionDialog open={open} onClose={() => setOpen(false)} />
      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border-border bg-background p-0 sm:max-w-md">
          <DialogTitle className="sr-only">{p.t("signIn")}</DialogTitle>
          <AuthForm onSignedIn={() => setAuthOpen(false)} />
        </DialogContent>
      </Dialog>
      <AnalyticsConsent />
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`card-interactive rounded-2xl border border-border bg-card p-5 ${className}`}>
      {children}
    </div>
  );
}

export function Delta({ value, children }: { value: number; children: ReactNode }) {
  return <span className={value >= 0 ? "text-success" : "text-destructive"}>{children}</span>;
}
