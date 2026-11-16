import { Card } from "@/components/AppShell";
import { RelatedGuides } from "@/components/RelatedGuides";
import { Button } from "@/components/ui/button";
import { articleJsonLd, canonicalLink, faqJsonLd } from "@/lib/seo";
import { usePortfolio } from "@/lib/store";
import { createFileRoute, Link } from "@tanstack/react-router";

type Guide = {
  title: string;
  intro: string;
  sampleCta: string;
  importCta: string;
  sampleNote: string;
  exportTitle: string;
  exportSteps: string[];
  exportNote: string;
  source: string;
  newTab: string;
  reviewTitle: string;
  reviewIntro: string;
  reviewItems: [string, string][];
  plansTitle: string;
  freeTitle: string;
  free: string;
  proTitle: string;
  pro: string;
  pricing: string;
  faqTitle: string;
  questions: [string, string][];
  resultTitle: string;
  result: string;
  demo: string;
  note: string;
};

const GUIDE: Record<"en" | "bg", Guide> = {
  en: {
    title: "Import your Trading 212 CSV into CapiSpot",
    intro:
      "Turn your transaction history into a portfolio you can follow. Try the Trading 212 sample first, then import your own trades and dividends with a preview before saving.",
    sampleCta: "Try a Trading 212 CSV — no account needed",
    importCta: "I already have a CSV",
    sampleNote:
      "The sample stays in your browser. No broker connection or account is needed to try it.",
    exportTitle: "1. Download your Trading 212 transaction history",
    exportSteps: [
      "Open the menu in Trading 212 and go to History.",
      "Use the export control and choose the period and activity types you need, including orders and dividends.",
      "Download the CSV to your device. Keep its original column headers and currencies.",
      "Include the history from your first purchase. If it takes several exports, review the date ranges so earlier trades are not missed.",
    ],
    exportNote:
      "Use the transaction-history CSV, rather than a PDF statement or a pie/holdings export. Those are different file formats.",
    source: "Trading 212’s official export instructions",
    newTab: "opens in a new tab",
    reviewTitle: "2. Review the rows before adding them",
    reviewIntro:
      "In CapiSpot, open Brokers, choose Trading 212, create or select its broker account and choose your CSV. Check the preview before confirming the import.",
    reviewItems: [
      [
        "Trades and dividends",
        "Review the dates, tickers, quantities, prices and fees. Original currencies remain visible in the preview.",
      ],
      [
        "Possible duplicates",
        "Rows already recorded are skipped by default. Review a flagged row before choosing to include it.",
      ],
      [
        "Rows that need attention",
        "Unsupported actions, such as interest on cash, and incomplete rows are listed for review instead of silently becoming trades.",
      ],
    ],
    plansTitle: "CSV import is Free. Direct sync is Pro.",
    freeTitle: "Free · CSV import",
    free: "Upload a compatible CSV, review the transactions and duplicates, then confirm the import. To leave out a new row, correct the CSV and upload it again.",
    proTitle: "Pro · Read-only sync and FIFO reports",
    pro: "Connect a read-only Trading 212 API for trades and dividends. Annual FIFO reports of realized gains and losses are also Pro features.",
    pricing: "Compare Free and Pro",
    faqTitle: "Before your first import",
    questions: [
      [
        "Why does the sample show a duplicate and a row to review?",
        "They are deliberately included so you can see how the preview handles them. They do not mean the sample file failed.",
      ],
      [
        "Do I need a Trading 212 API key?",
        "Not for a CSV import. Download your history from Trading 212 and upload the file. The read-only API connection is a separate Pro option.",
      ],
      [
        "When are my transactions saved?",
        "The sample does not save portfolio data. Your own import requires a CapiSpot account, and transactions are saved when you confirm the preview.",
      ],
    ],
    resultTitle: "3. Open your portfolio after import",
    result:
      "The import summary shows what was added, skipped or needs review. Use View holdings to open your positions, or explore an example portfolio before signing up.",
    demo: "See an example portfolio",
    note: "General information, not tax or investment advice. CapiSpot is not affiliated with Trading 212.",
  },
  bg: {
    title: "Импортирай своя Trading 212 CSV в CapiSpot",
    intro:
      "Превърни историята на сделките си в портфолио, което можеш да следиш. Първо пробвай примера за Trading 212, после импортирай своите сделки и дивиденти с преглед преди запис.",
    sampleCta: "Пробвай Trading 212 CSV — без акаунт",
    importCta: "Вече имам CSV файл",
    sampleNote: "Примерът остава в браузъра. За пробата не са нужни акаунт или връзка с брокера.",
    exportTitle: "1. Изтегли историята си от Trading 212",
    exportSteps: [
      "Отвори менюто в Trading 212 и избери History (История).",
      "Избери експорта, периода и видовете записи, включително поръчките и дивидентите.",
      "Изтегли CSV файла на устройството си. Запази оригиналните заглавия на колоните и валутите.",
      "Включи историята от първата покупка. Ако са нужни няколко файла, провери периодите, за да не пропуснеш ранни сделки.",
    ],
    exportNote:
      "Използвай CSV с историята на сделките, а не PDF извлечение или експорт на пай/позиции. Те са в различен формат.",
    source: "Официалните инструкции за експорт на Trading 212",
    newTab: "отваря се в нов раздел",
    reviewTitle: "2. Прегледай редовете преди запис",
    reviewIntro:
      "В CapiSpot отвори „Брокери“, избери Trading 212, създай или избери брокерската сметка и посочи CSV файла. Провери прегледа, преди да потвърдиш импорта.",
    reviewItems: [
      [
        "Сделки и дивиденти",
        "Провери датите, тикерите, количествата, цените и таксите. Оригиналните валути остават видими в прегледа.",
      ],
      [
        "Възможни дубликати",
        "Вече записаните редове се пропускат по подразбиране. Прегледай отбелязания ред, преди да избереш да го включиш.",
      ],
      [
        "Редове за проверка",
        "Неподдържаните действия, например лихви по свободни средства, и непълните редове се показват за проверка, вместо да се превръщат в сделки.",
      ],
    ],
    plansTitle: "CSV импортът е Free. Директната връзка е Pro.",
    freeTitle: "Free · CSV импорт",
    free: "Качи съвместим CSV, прегледай транзакциите и дубликатите, после потвърди импорта. За да изключиш нов ред, коригирай CSV файла и го качи отново.",
    proTitle: "Pro · Връзка само за четене и FIFO справки",
    pro: "Свържи Trading 212 чрез API само за четене на сделки и дивиденти. Годишните FIFO справки за реализирани печалби и загуби също са Pro функции.",
    pricing: "Сравни Free и Pro",
    faqTitle: "Преди първия импорт",
    questions: [
      [
        "Защо примерът има дубликат и ред за проверка?",
        "Те са добавени умишлено, за да видиш как прегледът ги обработва. Това не означава, че примерният файл е неуспешен.",
      ],
      [
        "Нужен ли е API ключ от Trading 212?",
        "Не и за CSV импорт. Изтегли историята от Trading 212 и качи файла. API връзката само за четене е отделна Pro възможност.",
      ],
      [
        "Кога се записват транзакциите ми?",
        "Примерът не записва данни за портфолио. За собствен импорт е нужен CapiSpot акаунт, а транзакциите се записват при потвърждение на прегледа.",
      ],
    ],
    resultTitle: "3. Отвори портфолиото след импорта",
    result:
      "Обобщението показва добавените и пропуснатите редове и тези за проверка. Отвори позициите си от бутона в обобщението или разгледай примерно портфолио преди регистрация.",
    demo: "Виж примерно портфолио",
    note: "Обща информация, не е данъчен или инвестиционен съвет. CapiSpot не е свързан с Trading 212.",
  },
};

const TITLE = "Trading 212 CSV Import & Portfolio Tracker | CapiSpot";
const DESCRIPTION =
  "Import your Trading 212 CSV for free. Preview trades and dividends, check duplicates, then save to your portfolio. Try a sample without an account.";

export const Route = createFileRoute("/trading212-import")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [canonicalLink("/trading212-import")],
    scripts: [
      articleJsonLd(TITLE, DESCRIPTION, "/trading212-import"),
      faqJsonLd(GUIDE.en.questions),
    ],
  }),
  component: Trading212Import,
});

function Trading212Import() {
  const { lang } = usePortfolio();
  const g = lang === "bg" ? GUIDE.bg : GUIDE.en;
  const sampleButton = (
    <Button
      asChild
      className="h-auto min-h-11 whitespace-normal rounded-full px-5 py-3 text-center leading-snug"
    >
      <Link to="/import-demo" search={{ broker: "trading212" }}>
        {g.sampleCta}
      </Link>
    </Button>
  );

  return (
    <article className="page-enter mx-auto max-w-3xl space-y-6">
      <header className="space-y-4">
        <h1 className="font-display text-balance text-3xl font-bold">{g.title}</h1>
        <p className="text-base leading-relaxed text-muted-foreground">{g.intro}</p>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {sampleButton}
          <Button asChild variant="outline" className="h-auto min-h-11 rounded-full px-5 py-3">
            <Link to="/brokers" search={{ broker: "trading212" }}>
              {g.importCta}
            </Link>
          </Button>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{g.sampleNote}</p>
      </header>

      <Card>
        <section aria-labelledby="trading212-export-heading">
          <h2 id="trading212-export-heading" className="font-display text-xl font-semibold">
            {g.exportTitle}
          </h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed">
            {g.exportSteps.map((step) => (
              <li key={step} className="pl-1">
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{g.exportNote}</p>
          <a
            href="https://helpcentre.trading212.com/hc/en-us/articles/360016898917-Can-I-export-the-trading-data-from-my-account"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span>
              {g.source}
              <span className="sr-only"> ({g.newTab})</span>
            </span>
          </a>
        </section>
      </Card>

      <Card>
        <section aria-labelledby="trading212-review-heading">
          <h2 id="trading212-review-heading" className="font-display text-xl font-semibold">
            {g.reviewTitle}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{g.reviewIntro}</p>
          <dl className="mt-4 space-y-4">
            {g.reviewItems.map(([title, body]) => (
              <div key={title}>
                <dt className="font-semibold">{title}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</dd>
              </div>
            ))}
          </dl>
        </section>
      </Card>

      <section aria-labelledby="trading212-plans-heading" className="space-y-4">
        <h2 id="trading212-plans-heading" className="font-display text-xl font-semibold">
          {g.plansTitle}
        </h2>
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <Card>
            <h3 className="font-semibold">{g.freeTitle}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{g.free}</p>
          </Card>
          <Card>
            <h3 className="font-semibold">{g.proTitle}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{g.pro}</p>
          </Card>
        </div>
        <Button asChild variant="outline" className="h-auto min-h-11 rounded-full px-4 py-3">
          <Link to="/pricing">{g.pricing}</Link>
        </Button>
      </section>

      <section aria-labelledby="trading212-faq-heading" className="space-y-4">
        <h2 id="trading212-faq-heading" className="font-display text-xl font-semibold">
          {g.faqTitle}
        </h2>
        {g.questions.map(([question, answer]) => (
          <div key={question}>
            <h3 className="font-semibold">{question}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{answer}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="trading212-result-heading" className="space-y-4">
        <h2 id="trading212-result-heading" className="font-display text-xl font-semibold">
          {g.resultTitle}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{g.result}</p>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {sampleButton}
          <Button asChild variant="outline" className="h-auto min-h-11 rounded-full px-5 py-3">
            <Link to="/demo">{g.demo}</Link>
          </Button>
        </div>
      </section>
      <p className="text-xs leading-relaxed text-muted-foreground">{g.note}</p>
      <RelatedGuides current="/trading212-import" />
    </article>
  );
}
