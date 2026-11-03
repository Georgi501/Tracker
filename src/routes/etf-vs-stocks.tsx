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
    title: "ETFs vs individual stocks: what should investors know?",
    intro:
      "ETFs and individual stocks are different ways to invest. The right choice depends on the exposure, risk and effort you are comfortable with—not on a guaranteed outcome.",
    sections: [
      [
        "What is an ETF?",
        "An exchange-traded fund holds a collection of investments and trades on an exchange like a stock. Its holdings can be broad or concentrated, so check the fund's index, assets and factsheet instead of assuming every ETF is diversified.",
      ],
      [
        "Diversification and company risk",
        "A broad-market ETF can spread exposure across many companies, while owning one stock ties more of your result to that company. An ETF can still fall in value, and a narrow sector or single-country fund may remain concentrated.",
      ],
      [
        "Costs and tracking",
        "Compare the fund's ongoing charge, trading costs and tracking difference with the cost of managing individual positions. Past performance and a low fee do not guarantee future returns.",
      ],
      [
        "Time, control and taxes",
        "Individual stocks offer direct control but require research and monitoring. Funds simplify holding a basket, but their holdings and tax treatment depend on the product and your country. Check local rules or consult a qualified tax professional.",
      ],
      [
        "Track the whole portfolio",
        "If you hold both funds and stocks, reviewing their combined weights can reveal overlap and concentration that are easy to miss when looking at each position separately.",
      ],
    ],
    cta: "See a sample portfolio",
    note: "General information, not investment or tax advice. Investing involves risk, including loss of principal.",
  },
  bg: {
    title: "ETF или отделни акции: какво е важно да знаеш?",
    intro:
      "ETF-ите и отделните акции са различни начини за инвестиране. Изборът зависи от желаната експозиция, риска и времето, с което разполагаш — не от гарантиран резултат.",
    sections: [
      [
        "Какво е ETF?",
        "Борсово търгуваният фонд държи набор от инвестиции и се търгува на борсата като акция. Портфейлът му може да е широк или концентриран, затова провери индекса, активите и документите на фонда, вместо да приемаш, че всеки ETF е диверсифициран.",
      ],
      [
        "Диверсификация и риск от отделна компания",
        "Широк пазарен ETF може да разпредели експозицията между много компании, докато при една акция резултатът ти зависи повече от конкретната компания. ETF също може да поевтинее, а секторен или еднодържавен фонд може да остане концентриран.",
      ],
      [
        "Разходи и проследяване",
        "Сравни текущите разходи на фонда, разходите за търговия и разликата спрямо индекса с цената на управлението на отделни позиции. Миналата доходност и ниската такса не гарантират бъдещ резултат.",
      ],
      [
        "Време, контрол и данъци",
        "Отделните акции дават пряк контрол, но изискват проучване и наблюдение. Фондът улеснява държането на набор от активи, но съставът и данъчното третиране зависят от продукта и държавата. Провери местните правила или се консултирай с данъчен специалист.",
      ],
      [
        "Проследявай цялото портфолио",
        "Ако държиш и фондове, и акции, прегледът на общите им тегла може да покаже припокриване и концентрация, които се пропускат при разглеждане на всяка позиция поотделно.",
      ],
    ],
    cta: "Виж примерното портфолио",
    note: "Обща информация, не е инвестиционен или данъчен съвет. Инвестирането носи риск, включително загуба на вложените средства.",
  },
};

const TITLE = "ETFs vs individual stocks: key differences — Capispot";
const DESCRIPTION =
  "Compare ETFs and individual stocks by diversification, risk, costs, effort and tax considerations.";

export const Route = createFileRoute("/etf-vs-stocks")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    scripts: [articleJsonLd(TITLE, DESCRIPTION, "/etf-vs-stocks")],
  }),
  component: EtfVsStocks,
});

function EtfVsStocks() {
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
          to="/demo"
          className="press rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          {g.cta}
        </Link>
        <p className="text-xs text-muted-foreground">{g.note}</p>
      </div>
      <RelatedGuides current="/etf-vs-stocks" />
    </div>
  );
}
