import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Newspaper } from "lucide-react";
import { marketAssetNews } from "@/lib/market.functions";
import { languageLocale, type Lang } from "@/lib/i18n";

const LABELS = {
  en: {
    title: "Latest news",
    empty: "No recent news found.",
    unavailable: "News is temporarily unavailable.",
  },
  bg: {
    title: "Последни новини",
    empty: "Няма намерени скорошни новини.",
    unavailable: "Новините временно не са достъпни.",
  },
  de: {
    title: "Aktuelle Nachrichten",
    empty: "Keine aktuellen Nachrichten gefunden.",
    unavailable: "Nachrichten sind vorübergehend nicht verfügbar.",
  },
  es: {
    title: "Últimas noticias",
    empty: "No se encontraron noticias recientes.",
    unavailable: "Las noticias no están disponibles temporalmente.",
  },
  it: {
    title: "Ultime notizie",
    empty: "Nessuna notizia recente trovata.",
    unavailable: "Le notizie non sono temporaneamente disponibili.",
  },
} satisfies Record<Lang, { title: string; empty: string; unavailable: string }>;

export function AssetNews({ symbol, lang }: { symbol: string; lang: Lang }) {
  const copy = LABELS[lang];
  const locale = languageLocale(lang);
  const fetchNews = useServerFn(marketAssetNews);
  const query = useQuery({
    queryKey: ["market-asset-news", symbol],
    queryFn: () => fetchNews({ data: { symbol } }),
    staleTime: 5 * 60_000,
  });
  const news = query.data?.news ?? [];

  return (
    <section className="mt-4 border-t border-border pt-4">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Newspaper size={16} />
        {copy.title}
      </h2>
      {query.isLoading ? (
        <div className="h-16 animate-pulse rounded-md bg-muted" />
      ) : news.length ? (
        <ul className="divide-y divide-border">
          {news.map((item) => (
            <li key={item.id}>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-md px-2 py-2 hover:bg-secondary"
              >
                <span className="block text-sm font-medium leading-snug">{item.title}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {item.publisher}
                  {item.at
                    ? ` · ${new Date(item.at).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}`
                    : ""}
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p
          role={query.data?.unavailable ? "status" : undefined}
          className="text-sm text-muted-foreground"
        >
          {query.data?.unavailable ? copy.unavailable : copy.empty}
        </p>
      )}
    </section>
  );
}
