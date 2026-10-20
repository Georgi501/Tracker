import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { usePortfolio } from "@/lib/store";

const PLACEHOLDER = {
  en: "Search for news, tickers or companies",
  bg: "Търси новини, тикери или компании",
  de: "Nach News, Tickern oder Unternehmen suchen",
  es: "Buscar noticias, tickers o empresas",
  it: "Cerca notizie, ticker o aziende",
} as const;

/** Global search bar: typing opens Asset search with the query, so results appear while typing. */
export function HeaderSearch() {
  const p = usePortfolio();
  const navigate = useNavigate();
  const loc = useRouterState({ select: (s) => s.location });
  const urlQ = loc.pathname === "/markets" ? String((loc.search as { q?: string }).q ?? "") : "";
  const [value, setValue] = useState(urlQ);
  useEffect(() => { if (loc.pathname !== "/markets") setValue(""); }, [loc.pathname]);
  const go = (q: string) => navigate({ to: "/markets", search: { q: q || undefined }, replace: loc.pathname === "/markets" });
  return (
    <form role="search" onSubmit={(e) => { e.preventDefault(); go(value.trim()); }} className="relative order-last w-full md:order-none md:w-auto md:min-w-80 md:flex-1 md:max-w-xl">
      <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input aria-label={PLACEHOLDER[p.lang]} placeholder={PLACEHOLDER[p.lang]} maxLength={60} autoComplete="off" value={value}
        onChange={(e) => { setValue(e.target.value); go(e.target.value); }}
        className="h-11 w-full rounded-full border border-border bg-secondary pl-11 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:bg-background" />
    </form>
  );
}
