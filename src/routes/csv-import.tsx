import { Card } from "@/components/AppShell";
import { RelatedGuides } from "@/components/RelatedGuides";
import { articleJsonLd } from "@/lib/seo";
import { usePortfolio } from "@/lib/store";
import { createFileRoute, Link } from "@tanstack/react-router";

type Guide = {
  title: string;
  intro: string;
  sections: [string, string][];
  cta: string;
  brokers: string;
  note: string;
};

const GUIDE: Record<"en" | "bg", Guide> = {
  en: {
    title: "Import your broker CSV into a portfolio tracker for free",
    intro:
      "Bring your whole transaction history into one portfolio without retyping a single trade. CSV import is free in CapiSpot.",
    sections: [
      [
        "1. Export a CSV from your broker",
        "Most brokers let you download your transaction history as a CSV file from the reports or statements section. Choose the full period so no early purchases are missing.",
      ],
      [
        "2. Upload it in CapiSpot",
        "Open the Brokers page and drop in the file. CapiSpot recognises the layout of supported brokers automatically, so you do not have to map columns by hand.",
      ],
      [
        "3. Review before saving",
        "You see a preview first. Duplicate rows are detected, tickers can be corrected if the broker symbol differs from the market symbol, and rows that cannot be read are listed instead of being silently skipped.",
      ],
      [
        "Currencies and fees",
        "Each transaction keeps its original currency. Fees are included in the cost, and amounts are converted with dated exchange rates rather than a fixed rate.",
      ],
      [
        "Free import, optional sync",
        "CSV import is free. If you want automatic updates, Pro adds read-only sync for Interactive Brokers and Trading 212. CapiSpot never places orders.",
      ],
    ],
    cta: "Import a CSV",
    brokers: "Supported formats: Trading 212, Interactive Brokers, Revolut and a generic template.",
    note: "General information, not tax or investment advice.",
  },
  bg: {
    title: "Импортирай CSV от брокера си в портфолио тракер безплатно",
    intro:
      "Прехвърли цялата история на сделките си в едно портфолио, без да въвеждаш ръчно нито една сделка. CSV импортът в CapiSpot е безплатен.",
    sections: [
      [
        "1. Изтегли CSV от брокера си",
        "Повечето брокери позволяват да свалиш историята на сделките като CSV файл от раздела с отчети или извлечения. Избери целия период, за да не липсват ранни покупки.",
      ],
      [
        "2. Качи го в CapiSpot",
        "Отвори страницата „Брокери“ и качи файла. CapiSpot разпознава автоматично формата на поддържаните брокери, така че не е нужно да нагласяш колоните ръчно.",
      ],
      [
        "3. Прегледай преди запис",
        "Първо виждаш преглед. Дублираните редове се откриват, тикерите могат да се поправят, ако символът на брокера се различава от пазарния, а редовете, които не могат да се прочетат, се показват в списък, а не се прескачат тихо.",
      ],
      [
        "Валути и такси",
        "Всяка сделка запазва оригиналната си валута. Таксите са включени в цената, а сумите се превръщат с курсове към съответната дата, а не с фиксиран курс.",
      ],
      [
        "Безплатен импорт, по избор синхронизация",
        "CSV импортът е безплатен. Ако искаш автоматично обновяване, Pro добавя синхронизация само за четене с Interactive Brokers и Trading 212. CapiSpot никога не подава поръчки.",
      ],
    ],
    cta: "Импортирай CSV",
    brokers: "Поддържани формати: Trading 212, Interactive Brokers, Revolut и общ шаблон.",
    note: "Обща информация, не е данъчен или инвестиционен съвет.",
  },
};

const TITLE = "Import your broker CSV into a portfolio tracker for free — CapiSpot";
const DESCRIPTION =
  "Import a Trading 212, Interactive Brokers or Revolut CSV into one portfolio for free: automatic format detection, duplicate checks, original currencies and a preview before saving.";

export const Route = createFileRoute("/csv-import")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    scripts: [articleJsonLd(TITLE, DESCRIPTION, "/csv-import")],
  }),
  component: CsvImport,
});

function CsvImport() {
  const p = usePortfolio();
  const g = p.lang === "bg" ? GUIDE.bg : GUIDE.en;
  return (
    <div className="page-enter mx-auto max-w-3xl space-y-4">
      <h1 className="font-display text-balance text-3xl font-bold">{g.title}</h1>
      <p className="text-muted-foreground">{g.intro}</p>
      <Card>
        <div className="space-y-5">
          {g.sections.map(([h, body]) => (
            <section key={h}>
              <h2 className="font-display text-lg font-semibold">{h}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </section>
          ))}
        </div>
      </Card>
      <p className="text-sm text-muted-foreground">{g.brokers}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/brokers"
          className="press rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          {g.cta}
        </Link>
        <p className="text-xs text-muted-foreground">{g.note}</p>
      </div>
      <RelatedGuides current="/csv-import" />
    </div>
  );
}
