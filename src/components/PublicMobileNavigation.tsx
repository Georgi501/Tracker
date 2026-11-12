import { experienceCopy } from "@/lib/experience-i18n";
import type { Lang } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";
export function PublicMobileNavigation({
  lang,
  pathname,
  label,
  pricingLabel,
}: {
  lang: Lang;
  pathname: string;
  label: string;
  pricingLabel: string;
}) {
  if (["/auth", "/reset-password"].includes(pathname)) return null;
  const c = experienceCopy[lang];
  return (
    <nav
      aria-label={label}
      className="public-mobile-nav fixed inset-x-2 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-2 rounded-2xl border border-border bg-card/95 p-2 shadow-xl backdrop-blur-md md:hidden"
    >
      <Link
        to={pathname === "/demo" ? "/pricing" : "/demo"}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-2 py-2 text-center text-xs font-semibold"
      >
        {pathname === "/demo" ? pricingLabel : c.sample}
      </Link>
      <Link
        to="/auth"
        search={{ mode: "signup" }}
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-2 py-2 text-center text-xs font-semibold text-primary-foreground"
      >
        {c.signup}
      </Link>
    </nav>
  );
}
