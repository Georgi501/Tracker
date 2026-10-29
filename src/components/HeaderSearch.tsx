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
  useEffect(() => {
    setValue(urlQ);
  }, [urlQ]);
  const go = (q: string) =>
    navigate({
      to: "/markets",
      search: { q: q || undefined },
      replace: loc.pathname === "/markets",
      viewTransition: loc.pathname !== "/markets",
    });
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        go(value.trim());
      }}
      className="header-search-frame rotating-border-frame relative h-9 w-full rounded-full border border-border bg-secondary"
    >
      <Search
        size={16}
        className="pointer-events-none absolute left-4 top-1/2 z-20 -translate-y-1/2 text-muted-foreground"
      />
      <input
        aria-label={PLACEHOLDER[p.lang]}
        placeholder={PLACEHOLDER[p.lang]}
        maxLength={60}
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          go(e.target.value);
        }}
        className="header-search-input absolute inset-px z-10 rounded-full bg-secondary pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground"
      />
    </form>
  );
}
