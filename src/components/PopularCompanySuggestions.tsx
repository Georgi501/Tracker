import { Link } from "@tanstack/react-router";
import type { Lang } from "@/lib/i18n";
import { CompanySuggestionLogo } from "@/components/CompanySuggestionLogo";
import type { CompanySuggestion } from "@/lib/company-suggestions";

const copy: Record<Lang, string> = {
  en: "Popular companies · examples",
  bg: "Популярни компании · примери",
  de: "Beliebte Unternehmen · Beispiele",
  es: "Empresas populares · ejemplos",
  it: "Aziende popolari · esempi",
};

export function PopularCompanySuggestions({
  lang,
  companies,
}: {
  lang: Lang;
  companies: readonly CompanySuggestion[];
}) {
  const c = copy[lang];
  return (
    <section
      data-popular-suggestions
      aria-labelledby="company-suggestions-title"
      className="min-w-0 lg:col-span-3"
    >
      <h2 id="company-suggestions-title" className="font-display text-base font-semibold">
        {c}
      </h2>
      <ul className="-mx-1 mt-2 flex flex-nowrap gap-3 overflow-x-auto overscroll-x-contain px-1 pb-2 pt-1">
        {companies.map(({ symbol, name }) => (
          <li key={symbol} className="w-44 min-w-0 shrink-0 xl:w-auto xl:flex-1">
            <Link
              to="/asset/$symbol"
              params={{ symbol }}
              onFocus={(event) =>
                event.currentTarget.scrollIntoView({
                  block: "nearest",
                  inline: "nearest",
                  behavior: "instant",
                })
              }
              className="flex h-full min-h-16 scroll-mt-40 scroll-mb-28 items-center gap-2 rounded-lg px-1 py-2 text-sm transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <CompanySuggestionLogo symbol={symbol} />
              <span className="min-w-0">
                <span className="block break-words text-sm font-semibold leading-snug">{name}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{symbol}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
