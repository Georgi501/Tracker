import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/AppShell";
import { QuoteHero } from "@/components/QuoteHero";
import { usePortfolio } from "@/lib/store";
import { MARKET_TICKER_INSTRUMENTS } from "@/lib/market-ticker";
import type { Lang } from "@/lib/i18n";

export const Route = createFileRoute("/market/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} market data — Capispot` },
      {
        name: "description",
        content: `Market quote and price history for ${params.slug}.`,
      },
    ],
  }),
  component: MarketInstrumentPage,
});

const COPY: Record<
  Lang,
  { back: string; notFound: string; category: Record<"index" | "commodity" | "fx", string> }
> = {
  en: {
    back: "Dashboard",
    notFound: "This market instrument is not available.",
    category: { index: "Index", commodity: "Commodity", fx: "Currency pair" },
  },
  bg: {
    back: "Табло",
    notFound: "Този пазарен инструмент не е наличен.",
    category: { index: "Индекс", commodity: "Суровина", fx: "Валутна двойка" },
  },
  de: {
    back: "Dashboard",
    notFound: "Dieses Marktinstrument ist nicht verfügbar.",
    category: { index: "Index", commodity: "Rohstoff", fx: "Währungspaar" },
  },
  es: {
    back: "Panel",
    notFound: "Este instrumento de mercado no está disponible.",
    category: { index: "Índice", commodity: "Materia prima", fx: "Par de divisas" },
  },
  it: {
    back: "Dashboard",
    notFound: "Questo strumento di mercato non è disponibile.",
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
        />
      ) : (
        <Card>
          <p role="status" className="text-sm text-muted-foreground">
            {copy.notFound}
          </p>
        </Card>
      )}
    </div>
  );
}
