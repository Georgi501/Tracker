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
    title: "Import Trading 212 history into a portfolio tracker",
    intro:
      "Export your Trading 212 history as a CSV file and bring it into Capispot to see all holdings, dividends and realized results in one place.",
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
        "4. Use the results",
        "Once imported, the FIFO report groups realized results by tax year, and analytics show the split across brokers. Import other brokers too for a complete picture.",
      ],
      [
        "Direct sync with Pro",
        "Pro accounts can also connect Trading 212 with a read-only API key instead of uploading files. The key needs read permissions only; it cannot place orders.",
      ],
    ],
    cta: "Open Brokers and import",
    note: "General information, not tax or investment advice. Capispot is not affiliated with Trading 212.",
  },
  bg: {
    title: "Как да импортираш историята от Trading 212 в тракер за портфолио",
    intro:
      "Експортирай историята си от Trading 212 като CSV файл и я качи в Capispot, за да виждаш всички позиции, дивиденти и реализирани резултати на едно място.",
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
        "4. Използвай резултатите",
        "След импорта FIFO справката групира реализираните резултати по данъчна година, а анализите показват разпределението по брокери. Импортирай и други брокери за пълна картина.",
      ],
      [
        "Директна връзка с Pro",
        "Pro акаунтите могат да свържат Trading 212 и с API ключ само за четене, вместо да качват файлове. Ключът е с права само за четене и не може да подава поръчки.",
      ],
    ],
    cta: "Отвори „Брокери“ и импортирай",
    note: "Обща информация, не е данъчен или инвестиционен съвет. Capispot не е свързан с Trading 212.",
  },
};

const TITLE = "Import Trading 212 history (CSV) — Capispot";
const DESCRIPTION =
  "Step-by-step: export your Trading 212 CSV, import it into Capispot, check duplicates and see FIFO results.";

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
          className="press rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          {g.cta}
        </Link>
        <p className="text-xs text-muted-foreground">{g.note}</p>
      </div>
    </div>
  );
}
