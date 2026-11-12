import { GuidePage, type GuideCopy } from "@/components/GuidePage";
import { articleJsonLd } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";

const COPY: Record<"en" | "bg", GuideCopy> = {
  en: {
    title: "Capital gains on stocks and ETFs: FIFO and what to prepare",
    intro:
      "Wherever you live, reporting investment results starts with the same data: every purchase and sale, with dates, prices, fees and currencies. This guide explains what to gather and how FIFO turns it into realized gains.",
    sections: [
      [
        "Rules depend on your country",
        "Whether a gain is taxed, at what rate and with which allowances depends on your tax residency, the instrument and where it trades. Check the current rules with your tax authority or an accountant. CapiSpot prepares the numbers; it does not tell you what you owe.",
      ],
      [
        "What data you need",
        "A full list of purchases and sales with dates, quantities, prices, fees and currencies, plus dividends received. A missing early purchase changes the cost basis and therefore the result.",
      ],
      [
        "Cost basis with FIFO",
        "FIFO (first in, first out) treats the oldest shares you hold as sold first. Each sale is matched to the earliest remaining purchase lots, and the difference between sale proceeds and the matched cost is the realized gain or loss.",
      ],
      [
        "A short example",
        "You buy 10 shares at 100, then 10 at 120, then sell 12 at 130. FIFO matches the 10 older shares first and 2 of the newer ones. Cost is 10 × 100 + 2 × 120 = 1,240, proceeds are 12 × 130 = 1,560, so the realized gain is 320 before any fees.",
      ],
      [
        "Fees and currencies",
        "Fees are part of the cost basis on purchases and reduce proceeds on sales. If your broker trades in another currency, amounts are usually converted at the rate of each transaction date, so CapiSpot keeps the original currency and uses dated exchange rates.",
      ],
      [
        "Several brokers",
        "Import every broker's CSV so the history is complete. Lots are matched per holding across all your imported transactions, and results are grouped by the tax year you choose.",
      ],
      [
        "CapiSpot access",
        "The annual FIFO report of realized gains and losses is a Pro feature. Free includes CSV import, file preview and duplicate checks.",
      ],
      [
        "Different tax years",
        "Many countries use the calendar year, others use a different fiscal year. Pick the year that matches your rules and compare the realized results with your own records before filing.",
      ],
    ],
    cta: "See the Pro FIFO report",
    note: "General information, not tax or investment advice. Rules change and differ by country; verify with your tax authority or a professional.",
  },
  bg: {
    title: "Капиталови печалби от акции и ETF: FIFO и какво да подготвиш",
    intro:
      "Където и да живееш, отчитането на инвестиционните резултати започва със същите данни: всяка покупка и продажба с дати, цени, такси и валути. Тук е обяснено какво да събереш и как FIFO ги превръща в реализирани печалби.",
    sections: [
      [
        "Правилата зависят от държавата ти",
        "Дали една печалба се облага, с каква ставка и с какви облекчения, зависи от данъчното ти пребиваване, инструмента и мястото на търгуване. Провери актуалните правила в данъчната си администрация или при счетоводител. CapiSpot подготвя числата, но не казва колко дължиш.",
      ],
      [
        "Какви данни ти трябват",
        "Пълен списък с покупки и продажби с дати, количества, цени, такси и валути, както и получените дивиденти. Липсваща ранна покупка променя цената на придобиване и така резултата.",
      ],
      [
        "Цена на придобиване по FIFO",
        "FIFO (първи влезли, първи излезли) приема, че първо се продават най-старите акции, които държиш. Всяка продажба се съпоставя с най-ранните оставащи покупки, а разликата между приходите от продажбата и съпоставената цена е реализираната печалба или загуба.",
      ],
      [
        "Кратък пример",
        "Купуваш 10 акции по 100, после 10 по 120 и продаваш 12 по 130. FIFO съпоставя първо 10-те по-стари акции и 2 от по-новите. Цената е 10 × 100 + 2 × 120 = 1 240, приходът е 12 × 130 = 1 560, така че реализираната печалба е 320 преди такси.",
      ],
      [
        "Такси и валути",
        "Таксите са част от цената на придобиване при покупка и намаляват прихода при продажба. Ако брокерът търгува в друга валута, сумите обикновено се превръщат по курса към датата на всяка сделка, затова CapiSpot пази оригиналната валута и ползва курсове към съответната дата.",
      ],
      [
        "Няколко брокера",
        "Импортирай CSV от всеки брокер, за да е пълна историята. Покупките се съпоставят за всяка позиция през всички импортирани сделки, а резултатите се групират по избраната от теб година.",
      ],
      [
        "Достъп в CapiSpot",
        "Годишната FIFO справка за реализираните печалби и загуби е Pro функция. В безплатния план са включени CSV импортът, прегледът на файла и проверката за дубликати.",
      ],
      [
        "Различни данъчни години",
        "Много държави ползват календарната година, други имат различна фискална година. Избери годината според твоите правила и сравни реализираните резултати със собствените си записи, преди да подаваш.",
      ],
    ],
    cta: "Виж FIFO справката в Pro",
    note: "Обща информация, не е данъчен или инвестиционен съвет. Правилата се променят и са различни по държави; провери в данъчната администрация или при специалист.",
  },
};

const TITLE = "Capital gains on stocks and ETFs: FIFO and what to prepare — CapiSpot";
const DESCRIPTION =
  "What data to prepare for yearly stock and ETF results anywhere: purchases, sales, fees, currencies and FIFO cost basis, with a worked example. General guide, not tax advice.";

export const Route = createFileRoute("/capital-gains-tax")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    scripts: [articleJsonLd(TITLE, DESCRIPTION, "/capital-gains-tax")],
  }),
  component: () => <GuidePage path="/capital-gains-tax" copy={COPY} to="/pricing" />,
});
