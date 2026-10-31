import type { Lang } from "./i18n";

export type MarketTickerCategory = "index" | "commodity" | "fx";

export interface MarketTickerInstrument {
  slug: string;
  symbol: string;
  category: MarketTickerCategory;
  label: Record<Lang, string>;
  name: Record<Lang, string>;
}

export const MARKET_TICKER_INSTRUMENTS: MarketTickerInstrument[] = [
  {
    slug: "sp500",
    symbol: "^GSPC",
    category: "index",
    label: { en: "S&P 500", bg: "S&P 500", de: "S&P 500", es: "S&P 500", it: "S&P 500" },
    name: {
      en: "S&P 500",
      bg: "S&P 500",
      de: "S&P 500",
      es: "S&P 500",
      it: "S&P 500",
    },
  },
  {
    slug: "nasdaq-100",
    symbol: "^NDX",
    category: "index",
    label: {
      en: "Nasdaq-100",
      bg: "Nasdaq-100",
      de: "Nasdaq-100",
      es: "Nasdaq-100",
      it: "Nasdaq-100",
    },
    name: {
      en: "Nasdaq-100",
      bg: "Nasdaq-100",
      de: "Nasdaq-100",
      es: "Nasdaq-100",
      it: "Nasdaq-100",
    },
  },
  {
    slug: "dow-jones",
    symbol: "^DJI",
    category: "index",
    label: { en: "Dow Jones", bg: "Dow Jones", de: "Dow Jones", es: "Dow Jones", it: "Dow Jones" },
    name: {
      en: "Dow Jones Industrial Average",
      bg: "Dow Jones Industrial Average",
      de: "Dow Jones Industrial Average",
      es: "Dow Jones Industrial Average",
      it: "Dow Jones Industrial Average",
    },
  },
  {
    slug: "gold",
    symbol: "GC=F",
    category: "commodity",
    label: { en: "Gold", bg: "Злато", de: "Gold", es: "Oro", it: "Oro" },
    name: {
      en: "Gold futures",
      bg: "Фючърси върху злато",
      de: "Gold-Futures",
      es: "Futuros del oro",
      it: "Future sull'oro",
    },
  },
  {
    slug: "silver",
    symbol: "SI=F",
    category: "commodity",
    label: { en: "Silver", bg: "Сребро", de: "Silber", es: "Plata", it: "Argento" },
    name: {
      en: "Silver futures",
      bg: "Фючърси върху сребро",
      de: "Silber-Futures",
      es: "Futuros de la plata",
      it: "Future sull'argento",
    },
  },
  {
    slug: "eur-usd",
    symbol: "EURUSD=X",
    category: "fx",
    label: { en: "EUR / USD", bg: "EUR / USD", de: "EUR / USD", es: "EUR / USD", it: "EUR / USD" },
    name: {
      en: "Euro / US dollar",
      bg: "Евро / щатски долар",
      de: "Euro / US-Dollar",
      es: "Euro / dólar estadounidense",
      it: "Euro / dollaro statunitense",
    },
  },
];
