import { Card } from "@/components/AppShell";
import { QuoteHero } from "@/components/QuoteHero";
import type { Lang } from "@/lib/i18n";
import { MARKET_TICKER_INSTRUMENTS } from "@/lib/market-ticker";
import { usePortfolio } from "@/lib/store";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/market/$slug")({
  head: ({ params }) => {
    const instrument = MARKET_TICKER_INSTRUMENTS.find((item) => item.slug === params.slug);
    const name = instrument?.name.en ?? params.slug;
    return {
      meta: [
        { title: `${name} live quote and price chart — CapiSpot` },
        {
          name: "description",
          content: instrument
            ? `Follow the ${name} quote, daily change and price history from Yahoo Finance, and compare it with your own portfolio on CapiSpot.`
            : `Market quote and price history for ${name}.`,
        },
        ...(instrument ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  component: MarketInstrumentPage,
});

const COPY: Record<
  Lang,
  {
    back: string;
    notFound: string;
    browse: string;
    category: Record<"index" | "commodity" | "fx", string>;
  }
> = {
  en: {
    back: "Dashboard",
    notFound: "This market instrument is not available.",
    browse: "Browse available markets",
    category: { index: "Index", commodity: "Commodity", fx: "Currency pair" },
  },
  bg: {
    back: "Табло",
    notFound: "Този пазарен инструмент не е наличен.",
    browse: "Разгледай наличните пазари",
    category: { index: "Индекс", commodity: "Суровина", fx: "Валутна двойка" },
  },
  de: {
    back: "Dashboard",
    notFound: "Dieses Marktinstrument ist nicht verfügbar.",
    browse: "Verfügbare Märkte ansehen",
    category: { index: "Index", commodity: "Rohstoff", fx: "Währungspaar" },
  },
  es: {
    back: "Panel",
    notFound: "Este instrumento de mercado no está disponible.",
    browse: "Ver mercados disponibles",
    category: { index: "Índice", commodity: "Materia prima", fx: "Par de divisas" },
  },
  it: {
    back: "Dashboard",
    notFound: "Questo strumento di mercato non è disponibile.",
    browse: "Vedi i mercati disponibili",
    category: { index: "Indice", commodity: "Materia prima", fx: "Coppia valutaria" },
  },
};

function MarketInstrumentPage() {
  const { slug } = Route.useParams();
  const { lang } = usePortfolio();
  const copy = COPY[lang];
  const instrument = MARKET_TICKER_INSTRUMENTS.find((item) => item.slug === slug);
  return (
    <div className="page-enter space-y-5">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden />
        {copy.back}
      </Link>
      {instrument ? (
        <QuoteHero
          symbol={instrument.symbol}
          name={instrument.name[lang]}
          type="stock"
          lang={lang}
          kindLabel={copy.category[instrument.category]}
          showStats={instrument.category === "index"}
          statsVariant={instrument.category === "index" ? "index" : "company"}
        />
      ) : (
        <Card className="space-y-4">
          <h1 className="font-display text-xl font-bold">{copy.notFound}</h1>
          <p className="text-sm text-muted-foreground">{copy.browse}</p>
          <ul className="flex flex-wrap gap-2">
            {MARKET_TICKER_INSTRUMENTS.map((item) => (
              <li key={item.slug}>
                <Link
                  to="/market/$slug"
                  params={{ slug: item.slug }}
                  className="inline-flex min-h-9 items-center rounded-full border border-border px-3 text-sm font-semibold hover:bg-secondary"
                >
                  {item.label[lang]}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
