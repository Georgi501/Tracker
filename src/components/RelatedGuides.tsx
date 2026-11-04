import { Link } from "@tanstack/react-router";
import { usePortfolio } from "@/lib/store";

const GUIDES = [
  { to: "/fifo-guide", en: "FIFO method", bg: "FIFO методът" },
  { to: "/average-cost", en: "Average buy price", bg: "Средна цена на покупка" },
  { to: "/dividend-tracker", en: "Dividend tracking", bg: "Следене на дивиденти" },
  { to: "/etf-vs-stocks", en: "ETFs vs stocks", bg: "ETF срещу акции" },
  { to: "/portfolio-in-eur", en: "Portfolio in EUR", bg: "Портфолио в EUR" },
  { to: "/csv-import", en: "Free CSV import", bg: "Безплатен CSV импорт" },
  { to: "/revolut-import", en: "Import Revolut", bg: "Импорт от Revolut" },
  { to: "/capital-gains-tax", en: "Capital gains and FIFO", bg: "Капиталови печалби и FIFO" },
  { to: "/trading212-import", en: "Import Trading 212", bg: "Импорт от Trading 212" },
  { to: "/ibkr-import", en: "Import Interactive Brokers", bg: "Импорт от Interactive Brokers" },
] as const;

export function RelatedGuides({ current }: { current: string }) {
  const { lang } = usePortfolio();
  const bg = lang === "bg";
  return (
    <nav aria-label={bg ? "Още наръчници" : "More guides"} className="space-y-2 pt-2">
      <h2 className="font-display text-sm font-semibold">{bg ? "Още наръчници" : "More guides"}</h2>
      <ul className="flex flex-wrap gap-2">
        {GUIDES.filter((guide) => guide.to !== current).map((guide) => (
          <li key={guide.to}>
            <Link
              to={guide.to}
              className="inline-flex min-h-9 items-center rounded-full border border-border px-3 text-xs text-muted-foreground hover:text-foreground"
            >
              {bg ? guide.bg : guide.en}
            </Link>
          </li>
        ))}
        <li>
          <Link
            to="/demo"
            className="inline-flex min-h-9 items-center rounded-full border border-primary/40 px-3 text-xs font-semibold text-primary"
          >
            {bg ? "Виж примерно портфолио" : "View sample portfolio"}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
