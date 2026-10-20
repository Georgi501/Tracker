import { advisorCopy } from "@/lib/advisor-i18n";
import { paymentsCopy } from "@/lib/payments-i18n";
import { getPaddleEnvironment } from "@/lib/paddle";
import { toolsCopy } from "@/lib/tools-i18n";
import { europeCopy } from "@/lib/europe-i18n";
import { isLang, languages } from "@/lib/i18n";
import { marketCopy } from "@/lib/market-i18n";
import { feedbackCopy } from "@/lib/feedback-i18n";
import { FeedbackDialog } from "./FeedbackDialog";
import { HeaderSearch } from "./HeaderSearch";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Languages, LogOut, MessageSquare, Moon, Plus, Sun } from "lucide-react";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePortfolio } from "@/lib/store";
import type { Currency } from "@/lib/portfolio";
import { AddTransactionDialog } from "./AddTransactionDialog";

export function AppShell({ children }: { children: ReactNode }) {
  const p = usePortfolio();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const nav = [
    { to: "/", label: p.t("dashboard") },
    { to: "/holdings", label: p.t("holdings") },
    { to: "/markets", label: marketCopy[p.lang].markets },
    { to: "/analytics", label: p.t("analytics") },
    { to: "/dividends", label: p.t("dividends") },
    { to: "/tools", label: toolsCopy[p.lang].tools },
    { to: "/advisor", label: advisorCopy[p.lang].advisor },
    { to: "/brokers", label: p.t("brokers") },
    { to: "/pricing", label: p.t("pricing") },
  ] as const;
  const seg = "rounded-full px-3 py-1 text-xs font-semibold transition-colors";
  const signOut = async () => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  return (
    <div className="min-h-screen">
      {getPaddleEnvironment() === "sandbox" && (
        <div className="border-b border-border bg-secondary px-4 py-1.5 text-center text-xs text-muted-foreground">{paymentsCopy[p.lang].testBanner}</div>
      )}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/" className="font-display text-xl font-bold tracking-tight">
            folio<span className="text-primary">.</span>
          </Link>
          <nav className="order-last -mx-4 flex w-[calc(100%+2rem)] gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:order-none md:mx-0 md:ml-4 md:w-auto md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: true }}
                className="shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground md:py-1.5"
                activeProps={{ className: "bg-secondary text-foreground" }}>
                {n.label}
              </Link>
            ))}
          </nav>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" aria-label={p.t("language")} title={p.t("language")} className="ml-auto shrink-0 md:ml-0">
                <Languages size={16} /><span>{p.lang.toUpperCase()}</span><ChevronDown size={12} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup value={p.lang} onValueChange={(l) => { if (isLang(l)) p.setLang(l); }}>
                {languages.map((l) => <DropdownMenuRadioItem key={l.code} value={l.code} lang={l.code}>
                  <span className="min-w-7 text-xs text-muted-foreground">{l.code.toUpperCase()}</span>{l.name}
                </DropdownMenuRadioItem>)}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <HeaderSearch />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="icon" aria-label={feedbackCopy[p.lang].title} title={feedbackCopy[p.lang].title} onClick={() => setFeedbackOpen(true)}><MessageSquare size={16} /></Button>
            <div className="flex items-center gap-1 rounded-full bg-secondary p-0.5" role="group" aria-label={europeCopy[p.lang].base}>
              <span className="px-2 text-xs text-muted-foreground">{europeCopy[p.lang].base}</span>
              {(["EUR", "USD"] as Currency[]).map((c) => (
                <Button key={c} size="sm" variant={p.currency === c ? "default" : "ghost"} aria-pressed={p.currency === c} onClick={() => p.setCurrency(c)}>
                  {c}
                </Button>
              ))}
            </div>
            <button onClick={p.toggleTheme} aria-label={p.t("toggleTheme")}
              className="rounded-full bg-secondary p-2 text-muted-foreground hover:text-foreground">
              {p.theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={() => { if (p.user) setOpen(true); else navigate({ to: "/auth" }); }}
              className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              <Plus size={16} /> {p.t("addTx")}
            </button>
            {p.user ? (
              <div className="flex items-center gap-2">
                <span className="hidden text-sm text-muted-foreground lg:inline">
                  {p.displayName || p.user.email}
                  {p.isPro && <span className="ml-1.5 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">PRO</span>}
                </span>
                <button onClick={signOut} aria-label={p.t("signOut")} title={p.t("signOut")}
                  className="rounded-full bg-secondary p-2 text-muted-foreground hover:text-foreground"><LogOut size={16} /></button>
              </div>
            ) : (
              <Link to="/auth" className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary">{p.t("signIn")}</Link>
            )}
          </div>
        </div>
      </header>
      {!p.user && (
        <div className="border-b border-border bg-accent/60 text-accent-foreground">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
            <span>{p.t("signIn")}</span>
            <Link to="/auth" className="font-semibold text-primary">{p.t("signUp")} →</Link>
          </div>
        </div>
      )}
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      <footer className="mx-auto flex max-w-7xl justify-end px-4 pb-6"><Button variant="ghost" onClick={() => setFeedbackOpen(true)}><MessageSquare size={16} />{feedbackCopy[p.lang].title}</Button></footer>
      <AddTransactionDialog open={open} onClose={() => setOpen(false)} />
      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-card p-5 ${className}`}>{children}</div>;
}

export function Delta({ value, children }: { value: number; children: ReactNode }) {
  return <span className={value >= 0 ? "text-success" : "text-destructive"}>{children}</span>;
}
