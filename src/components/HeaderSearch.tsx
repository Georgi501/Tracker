import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { usePortfolio } from "@/lib/store";

const PLACEHOLDER = {
  en: "Search for news, tickers or companies",
  bg: "Търси новини, тикери или компании",
  de: "Nach News, Tickern oder Unternehmen suchen",
  es: "Buscar noticias, tickers o empresas",
  it: "Cerca notizie, ticker o aziende",
} as const;

const CLEAR_LABEL = {
  en: "Clear search",
  bg: "Изчисти търсенето",
  de: "Suche löschen",
  es: "Borrar búsqueda",
  it: "Cancella ricerca",
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
  const go = (q: string, withTransition = false) =>
    navigate({
      to: "/markets",
      search: { q: q || undefined },
      replace: loc.pathname === "/markets",
      viewTransition: withTransition && loc.pathname !== "/markets",
    });
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        go(value.trim(), true);
      }}
      className="header-search-frame rotating-border-frame relative h-11 w-full rounded-full border border-border bg-secondary sm:h-9"
    >
      <Search
        size={16}
        className="pointer-events-none absolute left-3.5 top-1/2 z-20 -translate-y-1/2 text-muted-foreground"
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
        className={`header-search-input absolute inset-0 z-10 rounded-full bg-transparent pl-9 text-sm text-foreground outline-none placeholder:text-muted-foreground ${
          value ? "pr-9" : "pr-3.5"
        }`}
      />
      {value ? (
        <button
          type="button"
          aria-label={CLEAR_LABEL[p.lang]}
          onClick={() => {
            setValue("");
            if (loc.pathname === "/markets") go("");
          }}
          className="absolute right-2 top-1/2 z-20 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-background/40 hover:text-foreground"
        >
          <X size={14} aria-hidden="true" />
        </button>
      ) : null}
    </form>
  );
}
