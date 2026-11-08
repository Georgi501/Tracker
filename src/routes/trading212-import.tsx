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
  sampleCta: string;
  note: string;
};

const GUIDE: Record<"en" | "bg", Guide> = {
  en: {
    title: "Import Trading 212 history into a portfolio tracker",
    intro:
      "Export your Trading 212 history as a CSV file and bring it into Capispot to see holdings and dividends from all your brokers in one place.",
    sections: [
      [
        "1. Export from Trading 212",
        "In Trading 212 open the history section and export the full period as CSV. If your history is long, export it in several date ranges so no transactions are missed.",
      ],
      [
        "2. Import into Capispot",
        "Open Brokers, choose Trading 212 and upload the file. The format is detected from the headers and the original transaction currency is kept.",
      ],
      [
        "3. Review before saving",
        "A preview shows possible duplicates and a report by currency, fees and transaction type, so you can check the rows before anything is added.",
      ],
      [
        "4. Review the results",
        "Free includes the import preview and duplicate checks. The annual FIFO report of realized gains and losses is a separate Pro feature; analytics show the split across brokers.",
      ],
      [
        "Direct sync with Pro",
        "Pro accounts can also connect Trading 212 with a read-only API key instead of uploading files. The key needs read permissions only; it cannot place orders.",
      ],
    ],
    cta: "Open Brokers and import",
    sampleCta: "Try a sample CSV",
    note: "General information, not tax or investment advice. Capispot is not affiliated with Trading 212.",
  },
  bg: {
    title: "Как да импортираш историята от Trading 212 в тракер за портфолио",
    intro:
      "Експортирай историята си от Trading 212 като CSV файл и я качи в Capispot, за да виждаш позициите и дивидентите от всичките си брокери на едно място.",
    sections: [
      [
        "1. Експорт от Trading 212",
        "В Trading 212 отвори историята и експортирай целия период като CSV. Ако историята е дълга, експортирай я на няколко периода, за да не пропуснеш сделки.",
      ],
      [
        "2. Импорт в Capispot",
        "Отвори „Брокери“, избери Trading 212 и качи файла. Форматът се разпознава от заглавията, а оригиналната валута на сделките се запазва.",
      ],
      [
        "3. Преглед преди запис",
        "Преди да се добави нещо, виждаш преглед с възможни дубликати и отчет по валути, такси и вид сделки, за да провериш редовете.",
      ],
      [
        "4. Разгледай резултатите",
        "В безплатния план CSV импортът включва преглед и проверка за дублирани сделки. Годишната FIFO справка за реализираните печалби и загуби е отделна Pro функция; анализите показват разпределението по брокери.",
      ],
      [
        "Директна връзка с Pro",
        "Pro акаунтите могат да свържат Trading 212 и с API ключ само за четене, вместо да качват файлове. Ключът е с права само за четене и не може да подава поръчки.",
      ],
    ],
    cta: "Отвори „Брокери“ и импортирай",
    sampleCta: "Пробвай примерен CSV",
    note: "Обща информация, не е данъчен или инвестиционен съвет. Capispot не е свързан с Trading 212.",
  },
};

const TITLE = "Import Trading 212 history (CSV) — Capispot";
const DESCRIPTION =
  "Step-by-step: export your Trading 212 CSV, import it for free, review duplicates and learn which annual FIFO reports are included with Pro.";

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
    scripts: [articleJsonLd(TITLE, DESCRIPTION, "/trading212-import")],
  }),
  component: Trading212Import,
});

function Trading212Import() {
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
          to="/brokers"
          className="press inline-flex min-h-11 items-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          {g.cta}
        </Link>
        <Link
          to="/import-demo"
          search={{ broker: "trading212" }}
          className="press inline-flex min-h-11 items-center rounded-full border border-border px-5 py-2 text-sm font-semibold hover:bg-accent"
        >
          {g.sampleCta}
        </Link>
        <p className="text-xs text-muted-foreground">{g.note}</p>
      </div>
      <RelatedGuides current="/trading212-import" />
    </div>
  );
}
