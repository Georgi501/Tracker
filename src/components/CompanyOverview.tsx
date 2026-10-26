import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, ExternalLink, Newspaper } from "lucide-react";
import { marketOverview } from "@/lib/market.functions";
import { languageLocale, type Lang } from "@/lib/i18n";
import type { MarketAsset } from "@/lib/market-search";

const L = {
  en: {
    open: "Open source",
    overview: "Company overview",
    sector: "Sector",
    industry: "Industry",
    hq: "Headquarters",
    staff: "Employees",
    web: "Website",
    more: "Show more",
    less: "Show less",
    news: "Latest news",
    noNews: "No recent news available.",
    none: "Company profile is not available for this asset.",
  },
  bg: {
    open: "Отвори източника",
    overview: "Обзор на компанията",
    sector: "Сектор",
    industry: "Индустрия",
    hq: "Седалище",
    staff: "Служители",
    web: "Уебсайт",
    more: "Покажи още",
    less: "Скрий",
    news: "Актуални новини",
    noNews: "Няма скорошни новини.",
    none: "Няма наличен профил за този актив.",
  },
  de: {
    open: "Quelle öffnen",
    overview: "Unternehmensüberblick",
    sector: "Sektor",
    industry: "Branche",
    hq: "Hauptsitz",
    staff: "Mitarbeiter",
    web: "Website",
    more: "Mehr anzeigen",
    less: "Weniger",
    news: "Aktuelle Nachrichten",
    noNews: "Keine aktuellen Nachrichten.",
    none: "Kein Unternehmensprofil verfügbar.",
  },
  es: {
    open: "Abrir fuente",
    overview: "Resumen de la empresa",
    sector: "Sector",
    industry: "Industria",
    hq: "Sede",
    staff: "Empleados",
    web: "Sitio web",
    more: "Ver más",
    less: "Ver menos",
    news: "Últimas noticias",
    noNews: "No hay noticias recientes.",
    none: "Perfil no disponible.",
  },
  it: {
    open: "Apri fonte",
    overview: "Panoramica azienda",
    sector: "Settore",
    industry: "Industria",
    hq: "Sede",
    staff: "Dipendenti",
    web: "Sito web",
    more: "Mostra di più",
    less: "Mostra meno",
    news: "Ultime notizie",
    noNews: "Nessuna notizia recente.",
    none: "Profilo non disponibile.",
  },
} as const;

export function CompanyOverview({ asset, lang }: { asset: MarketAsset; lang: Lang }) {
  const c = L[lang];
  const fetchOverview = useServerFn(marketOverview);
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["overview", asset.symbol, asset.type],
    queryFn: () => fetchOverview({ data: { symbol: asset.symbol, type: asset.type } }),
    staleTime: 30 * 60_000,
  });
  const loc = languageLocale(lang);
  const facts = data
    ? [
        [c.sector, data.sector],
        [c.industry, data.industry],
        [c.hq, [data.city, data.country].filter(Boolean).join(", ") || null],
        [
          c.staff,
          data.employees != null ? new Intl.NumberFormat(loc).format(data.employees) : null,
        ],
      ].filter((f): f is [string, string] => !!f[1])
    : [];
  return (
    <div className="mt-5 space-y-5">
      {asset.type !== "crypto" && (
        <section>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Building2 size={16} className="text-primary" />
            {c.overview}
          </h4>
          {isLoading ? (
            <div className="h-24 animate-pulse rounded-lg bg-secondary" />
          ) : !data?.description && !facts.length ? (
            <p className="text-sm text-muted-foreground">{c.none}</p>
          ) : (
            <>
              {facts.length > 0 && (
                <dl className="mb-3 grid grid-cols-2 gap-2">
                  {facts.map(([k, v]) => (
                    <div key={k} className="rounded-lg bg-secondary/60 p-2">
                      <dt className="text-xs text-muted-foreground">{k}</dt>
                      <dd className="break-words text-sm font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {data?.description && (
                <>
                  <p
                    className={`text-sm leading-relaxed text-muted-foreground ${open ? "" : "line-clamp-4"}`}
                  >
                    {data.description}
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    className="mt-1 text-sm font-semibold text-primary"
                  >
                    {open ? c.less : c.more}
                  </button>
                </>
              )}
              {data?.website && (
                <a
                  href={data.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-1 text-sm text-primary"
                >
                  <ExternalLink size={14} />
                  {data.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </>
          )}
        </section>
      )}
      <section>
        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Newspaper size={16} className="text-primary" />
          {c.news}
        </h4>
        {isLoading ? (
          <div className="h-20 animate-pulse rounded-lg bg-secondary" />
        ) : !data?.news.length ? (
          <p className="text-sm text-muted-foreground">{c.noNews}</p>
        ) : (
          <ul className="grid gap-2.5">
            {data.news.map((n) => (
              <li key={n.id}>
                <a
                  href={n.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex gap-3 rounded-xl border border-border bg-card p-2.5 transition hover:border-primary/50 hover:shadow-md"
                >
                  <NewsThumb src={n.image} symbol={asset.symbol} />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-3 text-sm font-semibold leading-snug group-hover:text-primary">
                      {n.title}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                      {n.publisher && (
                        <span className="rounded bg-secondary px-1.5 py-0.5 font-semibold text-foreground">
                          {n.publisher}
                        </span>
                      )}
                      {n.at && (
                        <span>
                          {new Date(n.at).toLocaleString(loc, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      )}
                    </span>
                    <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-primary">
                      {c.open}
                      <ExternalLink size={12} />
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function NewsThumb({ src, symbol }: { src: string | null; symbol: string }) {
  const [bad, setBad] = useState(false);
  if (src && !bad)
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBad(true)}
        className="h-20 w-24 shrink-0 rounded-lg bg-secondary object-cover"
      />
    );
  return (
    <span className="flex h-20 w-24 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-secondary to-accent text-xs font-bold text-primary">
      <Newspaper size={14} className="mr-1" />
      {(symbol.split(".")[0] ?? symbol).slice(0, 5)}
    </span>
  );
}
