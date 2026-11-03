import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/AppShell";
import { usePortfolio } from "@/lib/store";
import { articleJsonLd } from "@/lib/seo";
import { RelatedGuides } from "@/components/RelatedGuides";

type Guide = {
  title: string;
  intro: string;
  sections: [string, string][];
  cta: string;
  note: string;
};

const GUIDE: Record<"en" | "bg", Guide> = {
  en: {
    title: "Taxes on stock and ETF gains in Bulgaria: what to prepare",
    intro:
      "Bulgarian residents who invest through foreign brokers usually need to look at their yearly results. This page explains what data to prepare, not what you owe.",
    sections: [
      [
        "Rules depend on the instrument",
        "Whether a gain is taxed can depend on the instrument and on where it is traded. Check the current rules with the National Revenue Agency (NRA) or an accountant before filing.",
      ],
      [
        "Filing period",
        "Annual personal income tax returns are normally filed in the first months of the following year. Confirm the current deadline with the NRA.",
      ],
      [
        "What data you need",
        "A full list of purchases and sales with dates, quantities, prices, fees and currencies, plus dividends received. Missing purchases change the cost basis and the result.",
      ],
      [
        "Cost basis with FIFO",
        "FIFO treats the oldest shares you hold as sold first. Capispot calculates realized results this way and groups them by the tax year you choose.",
      ],
      [
        "Several brokers and currencies",
        "Import every broker's CSV so the history is complete. Capispot keeps the original currency and converts costs with dated exchange rates.",
      ],
    ],
    cta: "Try the FIFO report free",
    note: "General information, not tax or investment advice. Rules change; verify with the NRA or a tax professional.",
  },
  bg: {
    title: "Данък върху печалба от акции и ETF в България: какво да подготвиш",
    intro:
      "Българските данъчно задължени лица, които инвестират през чужди брокери, обикновено трябва да прегледат годишните си резултати. Тази страница обяснява какви данни да подготвиш, а не колко дължиш.",
    sections: [
      [
        "Правилата зависят от инструмента",
        "Дали една печалба се облага може да зависи от вида инструмент и от мястото, където се търгува. Провери актуалните правила в НАП или при счетоводител преди подаване.",
      ],
      [
        "Срок за подаване",
        "Годишната данъчна декларация обикновено се подава в първите месеци на следващата година. Потвърди актуалния срок в НАП.",
      ],
      [
        "Какви данни ти трябват",
        "Пълен списък на покупките и продажбите с дати, количества, цени, такси и валути, както и получените дивиденти. Липсващи покупки променят цената на придобиване и резултата.",
      ],
      [
        "Цена на придобиване по FIFO",
        "При FIFO първо се считат продадени най-старите акции, които още притежаваш. Capispot изчислява реализираните резултати по този начин и ги групира по избрана от теб данъчна година.",
      ],
      [
        "Няколко брокера и валути",
        "Импортирай CSV от всеки брокер, за да е пълна историята. Capispot запазва оригиналната валута и превръща цените с датирани валутни курсове.",
      ],
    ],
    cta: "Пробвай FIFO справката безплатно",
    note: "Обща информация, не е данъчен или инвестиционен съвет. Правилата се променят; провери в НАП или при специалист.",
  },
};

const TITLE = "Stock and ETF gains tax in Bulgaria: what to prepare — Capispot";
const DESCRIPTION =
  "What data to prepare for yearly stock and ETF results in Bulgaria: purchases, sales, fees, currencies and FIFO cost basis.";

export const Route = createFileRoute("/stock-tax-bg")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    scripts: [articleJsonLd(TITLE, DESCRIPTION, "/stock-tax-bg")],
  }),
  component: StockTaxBg,
});

function StockTaxBg() {
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
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/tools"
          className="press rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          {g.cta}
        </Link>
        <p className="text-xs text-muted-foreground">{g.note}</p>
      </div>
      <RelatedGuides current="/stock-tax-bg" />
    </div>
  );
}
