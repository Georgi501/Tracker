import { createFileRoute } from "@tanstack/react-router";
import { GuidePage, type GuideCopy } from "@/components/GuidePage";
import { articleJsonLd } from "@/lib/seo";

const COPY: Record<"en" | "bg", GuideCopy> = {
  en: {
    title: "Import Revolut trades into a portfolio tracker",
    intro:
      "Track the stocks and ETFs you bought through Revolut next to your other brokers, using the statement CSV instead of retyping trades. CSV import is free.",
    sections: [
      [
        "1. Export your statement",
        "In the Revolut app open your investing account, choose the statement or report option and export the full history as a CSV file.",
      ],
      [
        "2. Upload it in Capispot",
        "Open the Brokers page and drop in the file. The Revolut layout is recognised automatically, and you see a preview before anything is saved.",
      ],
      [
        "3. Check tickers and currencies",
        "Each trade keeps its original currency, and amounts are converted with dated exchange rates. If a symbol differs from the market symbol you can correct it in the preview.",
      ],
      [
        "Combine it with other brokers",
        "Revolut holdings sit in the same portfolio as Trading 212 or Interactive Brokers, so allocation, dividends and FIFO results cover everything you own.",
      ],
    ],
    cta: "Import a CSV",
    note: "General information, not tax or investment advice.",
  },
  bg: {
    title: "Импорт на сделки от Revolut в портфолио тракер",
    intro:
      "Следи акциите и ETF-ите, купени през Revolut, заедно с другите си брокери, като ползваш CSV извлечение вместо ръчно въвеждане. CSV импортът е безплатен.",
    sections: [
      [
        "1. Изтегли извлечението",
        "В приложението на Revolut отвори инвестиционния си акаунт, избери опцията за извлечение или отчет и експортирай цялата история като CSV файл.",
      ],
      [
        "2. Качи го в Capispot",
        "Отвори страницата „Брокери“ и качи файла. Форматът на Revolut се разпознава автоматично и виждаш преглед, преди да се запише нещо.",
      ],
      [
        "3. Провери тикерите и валутите",
        "Всяка сделка запазва оригиналната си валута, а сумите се превръщат с курсове към съответната дата. Ако символът се различава от пазарния, можеш да го поправиш в прегледа.",
      ],
      [
        "Обедини го с други брокери",
        "Позициите от Revolut стоят в същото портфолио като Trading 212 или Interactive Brokers, така че разпределението, дивидентите и FIFO резултатите обхващат всичко, което притежаваш.",
      ],
    ],
    cta: "Импортирай CSV",
    note: "Обща информация, не е данъчен или инвестиционен съвет.",
  },
};

const TITLE = "Import Revolut trades into a portfolio tracker — Capispot";
const DESCRIPTION =
  "Import your Revolut investing CSV into one portfolio for free: automatic format detection, original currencies, a preview before saving, and all brokers in one place.";

export const Route = createFileRoute("/revolut-import")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    scripts: [articleJsonLd(TITLE, DESCRIPTION, "/revolut-import")],
  }),
  component: () => <GuidePage path="/revolut-import" copy={COPY} to="/brokers" />,
});
