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
  note: string;
};

const GUIDE: Record<"en" | "bg", Guide> = {
  en: {
    title: "Track dividends across all your brokers",
    intro:
      "Dividends are easy to lose track of when you invest through several brokers. Here is how CapiSpot keeps them in one place.",
    sections: [
      [
        "Received dividends",
        "Import your broker history and the dividends you received appear with their dates and currencies, next to your holdings.",
      ],
      [
        "Upcoming payments",
        "Upcoming dividends come only from confirmed events published by the data provider. CapiSpot does not estimate or invent payments; if an event is not confirmed, nothing is shown.",
      ],
      [
        "Why it matters",
        "Dividends are part of your total return. Looking at price change alone understates the result of income-paying stocks and ETFs.",
      ],
      [
        "Several brokers and currencies",
        "Import every broker so the picture is complete. Original currencies are kept and costs are converted with dated exchange rates.",
      ],
    ],
    cta: "Open the dividends page",
    note: "General information, not tax or investment advice. Dividends are not guaranteed.",
  },
  bg: {
    title: "Следи дивидентите си от всички брокери",
    intro:
      "Лесно е да изпуснеш дивидентите, когато инвестираш през няколко брокера. Ето как CapiSpot ги събира на едно място.",
    sections: [
      [
        "Получени дивиденти",
        "Импортирай историята от брокера и получените дивиденти се появяват с дати и валути до позициите ти.",
      ],
      [
        "Предстоящи плащания",
        "Предстоящите дивиденти идват само от потвърдени събития, публикувани от доставчика на данни. CapiSpot не прави оценки и не измисля плащания; ако събитието не е потвърдено, нищо не се показва.",
      ],
      [
        "Защо е важно",
        "Дивидентите са част от общата ти доходност. Ако гледаш само промяната в цената, подценяваш резултата на акции и ETF, които плащат доход.",
      ],
      [
        "Няколко брокера и валути",
        "Импортирай всички брокери, за да е пълна картината. Оригиналните валути се запазват, а цените се превръщат с датирани валутни курсове.",
      ],
    ],
    cta: "Отвори страницата с дивиденти",
    note: "Обща информация, не е данъчен или инвестиционен съвет. Дивидентите не са гарантирани.",
  },
};

const TITLE = "Track dividends across all your brokers — CapiSpot";
const DESCRIPTION =
  "See received and confirmed upcoming dividends from all your brokers in one place. No estimates, only confirmed events.";

export const Route = createFileRoute("/dividend-tracker")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    scripts: [articleJsonLd(TITLE, DESCRIPTION, "/dividend-tracker")],
  }),
  component: DividendTracker,
});

function DividendTracker() {
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
          to="/dividends"
          className="press rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          {g.cta}
        </Link>
        <p className="text-xs text-muted-foreground">{g.note}</p>
      </div>
      <RelatedGuides current="/dividend-tracker" />
    </div>
  );
}
