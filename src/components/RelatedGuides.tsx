import { Link } from "@tanstack/react-router";
import type { Lang } from "@/lib/i18n";
import { usePortfolio } from "@/lib/store";

const GUIDES: readonly {
  to: string;
  label: Record<Lang, string>;
}[] = [
  {
    to: "/fifo-guide",
    label: {
      en: "FIFO method",
      bg: "FIFO методът",
      de: "FIFO-Methode",
      es: "Método FIFO",
      it: "Metodo FIFO",
    },
  },
  {
    to: "/average-cost",
    label: {
      en: "Average buy price",
      bg: "Средна цена на покупка",
      de: "Durchschnittlicher Kaufpreis",
      es: "Precio medio de compra",
      it: "Prezzo medio di acquisto",
    },
  },
  {
    to: "/dividend-tracker",
    label: {
      en: "Dividend tracking",
      bg: "Следене на дивиденти",
      de: "Dividenden-Tracker",
      es: "Seguimiento de dividendos",
      it: "Monitoraggio dividendi",
    },
  },
  {
    to: "/etf-vs-stocks",
    label: {
      en: "ETFs vs stocks",
      bg: "ETF срещу акции",
      de: "ETFs vs. Einzelaktien",
      es: "ETFs frente a acciones",
      it: "ETF vs azioni",
    },
  },
  {
    to: "/etf-overlap",
    label: {
      en: "ETF overlap calculator",
      bg: "Калкулатор за ETF припокриване",
      de: "ETF-Überschneidungsrechner",
      es: "Calculadora de solapamiento ETF",
      it: "Calcolatore sovrapposizione ETF",
    },
  },
  {
    to: "/portfolio-in-eur",
    label: {
      en: "Portfolio in EUR",
      bg: "Портфолио в EUR",
      de: "Portfolio in EUR",
      es: "Cartera en EUR",
      it: "Portafoglio in EUR",
    },
  },
  {
    to: "/csv-import",
    label: {
      en: "Free CSV import",
      bg: "Безплатен CSV импорт",
      de: "Kostenloser CSV-Import",
      es: "Importación CSV gratis",
      it: "Importazione CSV gratuita",
    },
  },
  {
    to: "/revolut-import",
    label: {
      en: "Import Revolut",
      bg: "Импорт от Revolut",
      de: "Revolut importieren",
      es: "Importar Revolut",
      it: "Importa Revolut",
    },
  },
  {
    to: "/capital-gains-tax",
    label: {
      en: "Capital gains and FIFO",
      bg: "Капиталови печалби и FIFO",
      de: "Kapitalerträge und FIFO",
      es: "Ganancias de capital y FIFO",
      it: "Plusvalenze e FIFO",
    },
  },
  {
    to: "/trading212-import",
    label: {
      en: "Trading 212 CSV guide",
      bg: "CSV от Trading 212",
      de: "Trading 212 CSV-Anleitung",
      es: "Guía CSV de Trading 212",
      it: "Guida CSV Trading 212",
    },
  },
  {
    to: "/ibkr-import",
    label: {
      en: "Interactive Brokers CSV guide",
      bg: "CSV от Interactive Brokers",
      de: "Interactive Brokers CSV-Anleitung",
      es: "Guía CSV de Interactive Brokers",
      it: "Guida CSV Interactive Brokers",
    },
  },
] as const;

const COPY: Record<Lang, { more: string; sample: string }> = {
  en: { more: "More guides", sample: "View sample portfolio" },
  bg: { more: "Още наръчници", sample: "Виж примерно портфолио" },
  de: { more: "Weitere Anleitungen", sample: "Beispielportfolio ansehen" },
  es: { more: "Más guías", sample: "Ver cartera de ejemplo" },
  it: { more: "Altre guide", sample: "Vedi portafoglio di esempio" },
};

export function RelatedGuides({ current }: { current: string }) {
  const { lang } = usePortfolio();
  const c = COPY[lang];
  return (
    <nav aria-label={c.more} className="space-y-2 pt-2">
      <h2 className="font-display text-sm font-semibold">{c.more}</h2>
      <ul className="flex flex-wrap gap-2">
        {GUIDES.filter((guide) => guide.to !== current).map((guide) => (
          <li key={guide.to}>
            <Link
              to={guide.to}
              className="inline-flex min-h-9 items-center rounded-full border border-border px-3 text-xs text-muted-foreground hover:text-foreground"
            >
              {guide.label[lang]}
            </Link>
          </li>
        ))}
        <li>
          <Link
            to="/demo"
            className="inline-flex min-h-9 items-center rounded-full border border-primary/40 px-3 text-xs font-semibold text-primary"
          >
            {c.sample}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
