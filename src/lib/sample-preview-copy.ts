import type { Lang } from "./i18n";
type Copy = {
  badge: string;
  note: string;
  value: string;
  periodReturn: string;
  unrealized: string;
  yield: string;
  mwrr: string;
  mwrrHint: string;
  yieldHint: string;
  allocation: string;
  imports: string;
  range: string;
  holdings: string;
  classes: Record<string, string>;
};
export const samplePreviewCopy: Record<Lang, Copy> = {
  en: {
    badge: "Interactive sample portfolio",
    note: "Illustrative data · not live quotes or investment advice",
    value: "Sample portfolio value",
    periodReturn: "Selected-period change",
    unrealized: "Unrealized P&L",
    yield: "Dividend yield · TTM",
    mwrr: "MWRR · annualized",
    mwrrHint:
      "Calculated from the dated sample investment, dividend cash flows and final value since May 2025.",
    yieldHint:
      "Illustrative dividends paid during the last 12 months divided by the sample portfolio value; not a forecast.",
    allocation: "Sample allocation",
    imports: "Free CSV imports",
    range: "Sample chart period",
    holdings: "Sample positions",
    classes: { ETF: "ETFs", Stock: "Stocks", Crypto: "Crypto", Bonds: "Bonds" },
  },
  bg: {
    badge: "Интерактивно примерно портфолио",
    note: "Примерни данни · не са котировки на живо или инвестиционен съвет",
    value: "Стойност на примерното портфолио",
    periodReturn: "Промяна за избрания период",
    unrealized: "Нереализирана печалба",
    yield: "Дивидентна доходност · 12м",
    mwrr: "MWRR · годишно",
    mwrrHint:
      "Изчислена от датираната примерна инвестиция, дивидентните потоци и крайната стойност от май 2025 г.",
    yieldHint:
      "Примерните изплатени дивиденти за последните 12 месеца спрямо стойността на портфолиото; не е прогноза.",
    allocation: "Примерно разпределение",
    imports: "Безплатен CSV импорт",
    range: "Период на примерната графика",
    holdings: "Примерни позиции",
    classes: { ETF: "ETF-и", Stock: "Акции", Crypto: "Крипто", Bonds: "Облигации" },
  },
  de: {
    badge: "Interaktives Beispielportfolio",
    note: "Illustrative Daten · keine Live-Kurse oder Anlageberatung",
    value: "Beispiel-Portfoliowert",
    periodReturn: "Änderung im gewählten Zeitraum",
    unrealized: "Unrealisierter Gewinn/Verlust",
    yield: "Dividendenrendite · 12M",
    mwrr: "MWRR · jährlich",
    mwrrHint:
      "Aus datierter Beispielanlage, Dividendenzahlungen und Endwert seit Mai 2025 berechnet.",
    yieldHint:
      "Illustrative Dividenden der letzten 12 Monate geteilt durch den Portfoliowert; keine Prognose.",
    allocation: "Beispielaufteilung",
    imports: "Kostenloser CSV-Import",
    range: "Zeitraum der Beispielgrafik",
    holdings: "Beispielpositionen",
    classes: { ETF: "ETFs", Stock: "Aktien", Crypto: "Krypto", Bonds: "Anleihen" },
  },
  es: {
    badge: "Cartera de ejemplo interactiva",
    note: "Datos ilustrativos · no son cotizaciones en vivo ni asesoramiento",
    value: "Valor de la cartera de ejemplo",
    periodReturn: "Cambio del período seleccionado",
    unrealized: "Ganancia no realizada",
    yield: "Rentabilidad por dividendos · 12m",
    mwrr: "MWRR · anualizada",
    mwrrHint:
      "Calculada con la inversión de ejemplo fechada, los dividendos y el valor final desde mayo de 2025.",
    yieldHint:
      "Dividendos ilustrativos pagados en los últimos 12 meses divididos por el valor de la cartera; no es una previsión.",
    allocation: "Distribución de ejemplo",
    imports: "Importación CSV gratuita",
    range: "Período del gráfico de ejemplo",
    holdings: "Posiciones de ejemplo",
    classes: { ETF: "ETFs", Stock: "Acciones", Crypto: "Cripto", Bonds: "Bonos" },
  },
  it: {
    badge: "Portafoglio di esempio interattivo",
    note: "Dati illustrativi · non sono quotazioni reali o consulenza",
    value: "Valore del portafoglio di esempio",
    periodReturn: "Variazione nel periodo selezionato",
    unrealized: "Guadagno non realizzato",
    yield: "Rendimento dividendi · 12m",
    mwrr: "MWRR · annualizzato",
    mwrrHint:
      "Calcolato con investimento di esempio datato, dividendi e valore finale da maggio 2025.",
    yieldHint:
      "Dividendi illustrativi pagati negli ultimi 12 mesi divisi per il valore del portafoglio; non è una previsione.",
    allocation: "Allocazione di esempio",
    imports: "Importazione CSV gratuita",
    range: "Periodo del grafico di esempio",
    holdings: "Posizioni di esempio",
    classes: { ETF: "ETF", Stock: "Azioni", Crypto: "Cripto", Bonds: "Obbligazioni" },
  },
};
