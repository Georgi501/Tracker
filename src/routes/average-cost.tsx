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
    title: "How to calculate your average buy price",
    intro:
      "If you buy the same stock several times at different prices, your average cost tells you where you break even.",
    sections: [
      [
        "The formula",
        "Add up everything you paid, fees included, and divide by the total number of shares. Buying 10 shares at 100 and 10 at 120 gives 2,200 / 20 = 110 per share.",
      ],
      [
        "Why it matters",
        "Comparing the current price with your average cost shows your real gain or loss, rather than the result of your last purchase only.",
      ],
      [
        "Selling part of a position",
        "Average cost is only one view. For tax reports some countries use FIFO, where the oldest shares are sold first. The two methods can give different results.",
      ],
      [
        "Several brokers",
        "If you hold the same asset in more than one account, combine all purchases. Importing every broker into Capispot does this automatically and keeps original currencies.",
      ],
    ],
    cta: "Open the portfolio",
    note: "General information, not tax or investment advice.",
  },
  bg: {
    title: "Как да изчислиш средната си цена на покупка",
    intro:
      "Ако купуваш една и съща акция няколко пъти на различни цени, средната цена показва къде излизаш на нула.",
    sections: [
      [
        "Формулата",
        "Съберѝ всичко, което си платил, заедно с таксите, и раздели на общия брой акции. 10 акции по 100 и 10 по 120 дават 2 200 / 20 = 110 на акция.",
      ],
      [
        "Защо е важно",
        "Сравнението на текущата цена със средната ти цена показва реалната печалба или загуба, а не само резултата от последната покупка.",
      ],
      [
        "Продажба на част от позицията",
        "Средната цена е само един поглед. За данъчни справки някои държави използват FIFO, при което първо се продават най-старите акции. Двата метода може да дадат различен резултат.",
      ],
      [
        "Няколко брокера",
        "Ако държиш един и същ актив в повече от една сметка, обедини всички покупки. Импортът на всички брокери в Capispot го прави автоматично и запазва оригиналните валути.",
      ],
    ],
    cta: "Отвори портфолиото",
    note: "Обща информация, не е данъчен или инвестиционен съвет.",
  },
};

const TITLE = "How to calculate your average buy price — Capispot";
const DESCRIPTION =
  "Learn how to calculate the average cost of a stock bought several times, and how it differs from FIFO.";

export const Route = createFileRoute("/average-cost")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    scripts: [articleJsonLd(TITLE, DESCRIPTION, "/average-cost")],
  }),
  component: AverageCost,
});

function AverageCost() {
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
          to="/"
          className="press rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          {g.cta}
        </Link>
        <p className="text-xs text-muted-foreground">{g.note}</p>
      </div>
      <RelatedGuides current="/average-cost" />
    </div>
  );
}
