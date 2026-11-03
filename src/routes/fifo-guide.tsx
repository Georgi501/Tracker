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
    title: "FIFO method for stocks and ETFs: a simple guide",
    intro:
      "FIFO means first in, first out: when you sell, the oldest shares you still hold are treated as sold first. Many investors use it to work out realized gains for a yearly tax report.",
    sections: [
      [
        "A simple example",
        "You buy 10 shares at 100, then 10 more at 120. You sell 12 shares at 150. FIFO sells the first 10 (cost 100) and 2 of the second lot (cost 120). Realized gain: 10 × 50 + 2 × 30 = 560. The remaining 8 shares keep a cost of 120.",
      ],
      [
        "Why the tax year matters",
        "Realized results are grouped by the tax year your country uses. In Capispot you choose the month the tax year starts, so sales are grouped into the right period.",
      ],
      [
        "Several brokers",
        "If you invest through more than one broker, import every CSV so the purchase history is complete. Missing buys change which lot is sold first and therefore the result.",
      ],
      [
        "Currencies and splits",
        "Costs are converted with dated exchange rates, and confirmed stock splits are applied to historical quantities without changing your original transactions.",
      ],
    ],
    cta: "Try the FIFO report free",
    note: "General information, not tax or investment advice. Rules differ by country; check with a tax professional.",
  },
  bg: {
    title: "FIFO метод за акции и ETF: кратко ръководство",
    intro:
      "FIFO означава „първо купено, първо продадено“: при продажба първо се считат продадени най-старите акции, които още притежаваш. Много инвеститори го ползват за изчисляване на реализираната печалба за годишна справка.",
    sections: [
      [
        "Прост пример",
        "Купуваш 10 акции по 100, после още 10 по 120. Продаваш 12 акции по 150. При FIFO се продават първите 10 (цена 100) и 2 от втората партида (цена 120). Реализирана печалба: 10 × 50 + 2 × 30 = 560. Останалите 8 акции остават с цена 120.",
      ],
      [
        "Защо данъчната година има значение",
        "Реализираните резултати се групират по данъчната година, която ползва твоята държава. В Capispot избираш от кой месец започва данъчната година, за да попаднат продажбите в правилния период.",
      ],
      [
        "Няколко брокера",
        "Ако инвестираш през повече от един брокер, импортирай всички CSV файлове, за да е пълна историята на покупките. Липсващи покупки променят коя партида се продава първа и затова резултата.",
      ],
      [
        "Валути и сплитове",
        "Цените се превръщат с датирани валутни курсове, а потвърдените сплитове се отчитат в историческите количества, без да се променят оригиналните ти сделки.",
      ],
    ],
    cta: "Пробвай FIFO справката безплатно",
    note: "Обща информация, не е данъчен или инвестиционен съвет. Правилата са различни по държави; консултирай се със специалист.",
  },
};

const TITLE = "FIFO method for stocks and ETFs — Capispot";
const DESCRIPTION =
  "How FIFO works for stocks and ETFs, with a worked example, tax-year grouping and multi-broker tips.";

export const Route = createFileRoute("/fifo-guide")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    scripts: [articleJsonLd(TITLE, DESCRIPTION, "/fifo-guide")],
  }),
  component: FifoGuide,
});

function FifoGuide() {
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
      <RelatedGuides current="/fifo-guide" />
    </div>
  );
}
