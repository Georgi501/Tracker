import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/AppShell";
import { usePortfolio } from "@/lib/store";

type Guide = {
  title: string;
  intro: string;
  sections: [string, string][];
  cta: string;
  note: string;
};

const GUIDE: Record<"en" | "bg", Guide> = {
  en: {
    title: "How to track an investment portfolio in EUR",
    intro:
      "A portfolio tracker can show investments in euros even when your broker statements and assets use other currencies. Knowing what the display currency changes—and what it does not—helps make the totals easier to interpret.",
    sections: [
      [
        "Display currency is not transaction currency",
        "Choosing EUR as a reporting currency changes how values are presented; it does not change the currency in which you bought an asset or the original broker record. Keep statements and transaction details for accurate reconciliation.",
      ],
      [
        "Exchange rates affect reported values",
        "A non-EUR holding can move in euro terms because its market price changed, because the exchange rate changed, or both. A useful tracker converts values using dated market exchange-rate data rather than a fixed rate.",
      ],
      [
        "Compare like with like",
        "Use the same reporting currency and date range when comparing holdings or performance. Contributions and withdrawals also matter: a balance increase is not necessarily investment growth if you added money.",
      ],
      [
        "Import complete transaction history",
        "For a more reliable portfolio view, include purchases, sales, fees and cash flows from each broker. Review imported currencies and any missing transactions before relying on summaries.",
      ],
      [
        "EUR reporting does not determine your taxes",
        "Tax rules, conversion dates and accepted exchange rates depend on your jurisdiction and situation. A portfolio display is not a tax calculation; check official guidance or speak with a qualified tax professional.",
      ],
    ],
    cta: "Open the portfolio",
    note: "General information, not tax or investment advice. Exchange rates and market prices can change.",
  },
  bg: {
    title: "Как да следиш инвестиционно портфолио в EUR",
    intro:
      "Тракерът може да показва инвестициите в евро, дори когато извлеченията от брокера и активите са в други валути. Ако знаеш какво променя валутата за показване и какво не, ще тълкуваш по-лесно общите стойности.",
    sections: [
      [
        "Валутата за показване не е валутата на сделката",
        "Изборът на EUR за отчетна валута променя начина на представяне на стойностите, но не променя валутата, в която си купил актива, или оригиналния запис при брокера. Пази извлеченията и данните за сделките за коректна сверка.",
      ],
      [
        "Валутните курсове влияят на отчетените стойности",
        "Позиция извън EUR може да се промени в евро както заради цената на пазара, така и заради валутния курс — или и заради двете. Полезният тракер превалутира с датирани пазарни курсове, а не с фиксиран курс.",
      ],
      [
        "Сравнявай еднакви периоди и валути",
        "Използвай една и съща отчетна валута и период, когато сравняваш позиции или доходност. Вноските и тегленията също имат значение: по-голямото салдо не означава непременно инвестиционен растеж, ако си добавил средства.",
      ],
      [
        "Импортирай пълната история на сделките",
        "За по-надежден изглед включи покупки, продажби, такси и парични потоци от всеки брокер. Провери валутите и липсващите сделки, преди да разчиташ на обобщенията.",
      ],
      [
        "Отчитането в EUR не определя данъците ти",
        "Данъчните правила, датите за превалутиране и признатите курсове зависят от държавата и конкретния случай. Валутата за показване не е данъчно изчисление — провери официалните указания или се консултирай с квалифициран данъчен специалист.",
      ],
    ],
    cta: "Отвори портфолиото",
    note: "Обща информация, не е данъчен или инвестиционен съвет. Валутните курсове и пазарните цени се променят.",
  },
};

const TITLE = "Track an investment portfolio in EUR — Capispot";
const DESCRIPTION =
  "Learn how EUR portfolio reporting works, how exchange rates affect values and why display currency is not tax advice.";

export const Route = createFileRoute("/portfolio-in-eur")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PortfolioInEur,
});

function PortfolioInEur() {
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
    </div>
  );
}
