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
    title: "Import Interactive Brokers (IBKR) history into a portfolio tracker",
    intro:
      "Bring your Interactive Brokers trades into Capispot to see all your holdings, dividends and realized results next to your other brokers.",
    sections: [
      [
        "CSV import",
        "Export your activity from IBKR as a CSV file, open Brokers in Capispot, choose Interactive Brokers and upload it. The format is detected from the headers and the original currency is kept.",
      ],
      [
        "Check before saving",
        "A preview shows possible duplicates and a report by currency, fees and transaction type, so you can verify the rows before anything is added.",
      ],
      [
        "Direct sync with Pro",
        "Pro accounts can connect IBKR with a Flex Query token and query ID instead of uploading files. The connection is read-only and cannot place orders.",
      ],
      [
        "Combine with other brokers",
        "Import Trading 212, Revolut or other brokers too. Analytics shows the split across brokers and the FIFO report groups realized results by tax year.",
      ],
    ],
    cta: "Open Brokers and import",
    note: "General information, not tax or investment advice. Capispot is not affiliated with Interactive Brokers.",
  },
  bg: {
    title: "Как да импортираш историята от Interactive Brokers (IBKR) в тракер за портфолио",
    intro:
      "Добави сделките си от Interactive Brokers в Capispot, за да виждаш всички позиции, дивиденти и реализирани резултати до тези от другите си брокери.",
    sections: [
      [
        "CSV импорт",
        "Експортирай активността си от IBKR като CSV, отвори „Брокери“ в Capispot, избери Interactive Brokers и качи файла. Форматът се разпознава от заглавията, а оригиналната валута се запазва.",
      ],
      [
        "Проверка преди запис",
        "Преглед показва възможни дубликати и отчет по валути, такси и вид сделки, за да провериш редовете, преди да се добави нещо.",
      ],
      [
        "Директна връзка с Pro",
        "Pro акаунтите могат да свържат IBKR с Flex Query токен и ID на заявката вместо да качват файлове. Връзката е само за четене и не може да подава поръчки.",
      ],
      [
        "Комбинирай с други брокери",
        "Импортирай и Trading 212, Revolut или други брокери. Анализите показват разпределението по брокери, а FIFO справката групира реализираните резултати по данъчна година.",
      ],
    ],
    cta: "Отвори „Брокери“ и импортирай",
    note: "Обща информация, не е данъчен или инвестиционен съвет. Capispot не е свързан с Interactive Brokers.",
  },
};

const TITLE = "Import Interactive Brokers (IBKR) history — Capispot";
const DESCRIPTION =
  "Import your IBKR activity as CSV or connect read-only with Pro, check duplicates and see all brokers in one portfolio.";

export const Route = createFileRoute("/ibkr-import")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    scripts: [articleJsonLd(TITLE, DESCRIPTION, "/ibkr-import")],
  }),
  component: IbkrImport,
});

function IbkrImport() {
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
      <RelatedGuides current="/ibkr-import" />
    </div>
  );
}
