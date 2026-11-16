import { advisorCopy } from "@/lib/advisor-i18n";
import type { Lang } from "@/lib/i18n";
import { marketCopy } from "@/lib/market-i18n";
import { isMobileNavRouteActive } from "@/lib/mobile-nav";
import { Link } from "@tanstack/react-router";
import { Bot, LayoutDashboard, PieChart, Search, Wallet } from "lucide-react";

const NAV_COPY: Record<
  Lang,
  {
    dashboard: string;
    holdings: string;
    analytics: string;
    markets: string;
    advisor: string;
  }
> = {
  en: {
    dashboard: "Dashboard",
    holdings: "Holdings",
    analytics: "Analytics",
    markets: marketCopy.en.markets,
    advisor: advisorCopy.en.advisor,
  },
  bg: {
    dashboard: "Табло",
    holdings: "Позиции",
    analytics: "Анализи",
    markets: marketCopy.bg.markets,
    advisor: advisorCopy.bg.advisor,
  },
  de: {
    dashboard: "Übersicht",
    holdings: "Positionen",
    analytics: "Analyse",
    markets: marketCopy.de.markets,
    advisor: advisorCopy.de.advisor,
  },
  es: {
    dashboard: "Resumen",
    holdings: "Posiciones",
    analytics: "Análisis",
    markets: marketCopy.es.markets,
    advisor: advisorCopy.es.advisor,
  },
  it: {
    dashboard: "Riepilogo",
    holdings: "Posizioni",
    analytics: "Analisi",
    markets: marketCopy.it.markets,
    advisor: advisorCopy.it.advisor,
  },
};

export function MobileBottomNavigation({
  lang,
  pathname,
  label,
  hidden = false,
}: {
  lang: Lang;
  pathname: string;
  label: string;
  hidden?: boolean;
}) {
  const c = NAV_COPY[lang];
  const items = [
    { to: "/", label: c.dashboard, Icon: LayoutDashboard },
    { to: "/holdings", label: c.holdings, Icon: Wallet },
    { to: "/analytics", label: c.analytics, Icon: PieChart },
    { to: "/markets", label: c.markets, Icon: Search },
    { to: "/advisor", label: c.advisor, Icon: Bot },
  ] as const;

  return (
    <nav
      aria-label={label}
      data-hidden={hidden}
      className="mobile-bottom-nav glass-bar fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 items-center border-t border-border bg-card/95 px-1 pt-1 pb-[calc(0.35rem+env(safe-area-inset-bottom))] backdrop-blur-md md:hidden"
    >
      {items.map(({ to, label: itemLabel, Icon }) => {
        const active = isMobileNavRouteActive(pathname, to);
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-medium transition-colors ${
              active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={19} aria-hidden="true" />
            <span className="max-w-full truncate">{itemLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}
