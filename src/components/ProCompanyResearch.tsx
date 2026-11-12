import type { ReactNode } from "react";
import { useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, Building2, ChartNoAxesCombined, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuoteFreshness } from "@/components/QuoteFreshness";
import {
  marketCompanyResearch,
  marketDetails,
  marketStats,
  searchMarket,
} from "@/lib/market.functions";
import { languageLocale, type Lang } from "@/lib/i18n";
import { ProGate, BarsSilhouette } from "@/components/ProFeatures";
import type { MarketAsset } from "@/lib/market-search";

const COPY = {
  en: {
    title: "Company research",
    desc: "A deeper view of valuation, company performance, analyst expectations and ownership.",
    statistics: "Key statistics",
    valuation: "Valuation & trading",
    profitability: "Profitability & growth",
    balanceSheet: "Balance sheet",
    shareholderReturns: "Shareholder returns",
    marketCap: "Market capitalization",
    enterpriseValue: "Enterprise value",
    trailingPe: "Trailing P/E",
    forwardPe: "Forward P/E",
    priceToSales: "Price / sales",
    priceToBook: "Price / book",
    pegRatio: "PEG ratio",
    beta: "Beta (5Y monthly)",
    eps: "EPS (TTM)",
    forwardEps: "Forward EPS",
    roe: "Return on equity",
    debtToEquity: "Debt / equity",
    operatingMargin: "Operating margin",
    profitMargin: "Profit margin",
    revenueGrowth: "Revenue growth",
    earningsGrowth: "Earnings growth",
    cash: "Cash & equivalents",
    totalDebt: "Total debt",
    currentRatio: "Current ratio",
    quickRatio: "Quick ratio",
    dividendRate: "Annual dividend",
    dividendYield: "Dividend yield",
    analysts: "Analyst outlook",
    consensus: "Recommendation trend",
    target: "12-month price target",
    historicalPrice: "Share price · past year",
    analystRange: "Analyst target range · next 12 months",
    analystMean: "Average target",
    targetChartLoading: "Loading price history…",
    targetChartUnavailable: "Price history or analyst target range is unavailable.",
    peerTitle: "P/E ratio vs selected peers",
    peerDescription:
      "Choose listed companies yourself. The peer average excludes the company being viewed and peers without a positive P/E.",
    peerSearch: "Search company or ticker",
    peerAdd: "Search",
    peerAddCompany: "Add",
    peerRemove: "Remove",
    peerTtm: "P/E (TTM)",
    peerForward: "Forward P/E",
    peerAverage: "Peer average",
    peerEmpty: "Search for and add companies to compare their reported P/E ratios.",
    peerNoData: "No positive P/E data is available for the selected companies.",
    peerSearchUnavailable: "Company search is temporarily unavailable.",
    currentPrice: "Current price",
    low: "Low",
    average: "Average",
    high: "High",
    upside: "Implied return to average target",
    strongBuy: "Strong buy",
    buy: "Buy",
    hold: "Hold",
    sell: "Sell",
    strongSell: "Strong sell",
    estimates: "Earnings & revenue estimates",
    estimatesNote:
      "Provider consensus averages are estimates, not company guidance or guaranteed results. Analyst counts may differ by metric.",
    revisions: "EPS estimate revisions · last 30 days",
    epsTrend: "Current vs. 30 days ago",
    upRevisions: "Raised",
    downRevisions: "Lowered",
    surprises: "Reported earnings surprises",
    actualEps: "Actual EPS",
    estimatedEps: "Estimated EPS",
    surprisePercent: "Surprise",
    retrieved: "Data retrieved",
    ratioNote:
      "TTM covers the latest 12 reported months. Forward figures are estimates; valuation ratios vary with the share price.",
    targetNote: "Analyst targets are consensus estimates, not guaranteed future prices.",
    metricHelp: {
      trailingPe: "Current share price divided by earnings per share from the latest 12 months.",
      forwardPe:
        "Current share price divided by forecast earnings per share; forecasts can change.",
      pegRatio: "P/E divided by expected earnings growth. Inputs and conventions vary by provider.",
      beta: "Historical sensitivity to broad market moves, not a forecast of future volatility.",
      eps: "Earnings per share over the latest 12 reported months.",
      forwardEps: "Analyst-estimated earnings per share for a future period.",
      debtToEquity: "Reported debt relative to equity; compare within similar industries.",
    },
    period: "Period",
    epsAverage: "EPS average",
    epsRange: "EPS low–high",
    revenueAverage: "Revenue average",
    analystsCount: "Analysts",
    growth: "Growth",
    holders: "Ownership & holders",
    insiderOwnership: "Insider ownership",
    institutionalOwnership: "Institutional ownership",
    institutionsCount: "Institutions reporting",
    institutions: "Largest institutional holders",
    holder: "Holder",
    percentHeld: "% held",
    value: "Reported value",
    reported: "Reported",
    insiderHolders: "Insider positions",
    relation: "Role",
    shares: "Shares",
    unavailable: "No reported data is available for this section.",
    loading: "Loading company research…",
    loadFailed: "Could not load company research.",
    retry: "Try again",
    source: "Source: Yahoo Finance. Data may be delayed or incomplete; not investment advice.",
  },
  bg: {
    title: "Анализ на компанията",
    desc: "По-задълбочен поглед към оценката, резултатите, очакванията и собствеността.",
    statistics: "Ключови показатели",
    valuation: "Оценка и търговия",
    profitability: "Рентабилност и растеж",
    balanceSheet: "Баланс",
    shareholderReturns: "Доходност за акционерите",
    marketCap: "Пазарна капитализация",
    enterpriseValue: "Стойност на предприятието",
    trailingPe: "P/E (последни 12 м.)",
    forwardPe: "Прогнозен P/E",
    priceToSales: "Цена / приходи",
    priceToBook: "Цена / балансова стойност",
    pegRatio: "PEG коефициент",
    beta: "Бета (5 г., месечна)",
    eps: "Печалба на акция (TTM)",
    forwardEps: "Прогнозна печалба на акция",
    roe: "Възвръщаемост на капитала",
    debtToEquity: "Дълг / собствен капитал",
    operatingMargin: "Оперативен марж",
    profitMargin: "Нетен марж",
    revenueGrowth: "Ръст на приходите",
    earningsGrowth: "Ръст на печалбата",
    cash: "Парични средства",
    totalDebt: "Общ дълг",
    currentRatio: "Текуща ликвидност",
    quickRatio: "Бърза ликвидност",
    dividendRate: "Годишен дивидент",
    dividendYield: "Дивидентна доходност",
    analysts: "Перспектива на анализаторите",
    consensus: "Промяна в препоръките",
    target: "Целева цена за 12 месеца",
    historicalPrice: "Цена на акцията · последната година",
    analystRange: "Целеви диапазон на анализаторите · следващите 12 месеца",
    analystMean: "Средна целева цена",
    targetChartLoading: "Зареждане на историята на цената…",
    targetChartUnavailable: "Историята на цената или целевият диапазон не са налични.",
    peerTitle: "P/E спрямо избрани компании",
    peerDescription:
      "Избери сам публичните компании за сравнение. Средната стойност не включва разглежданата компания и дружества без положителен P/E.",
    peerSearch: "Търси компания или тикер",
    peerAdd: "Търси",
    peerAddCompany: "Добави",
    peerRemove: "Премахни",
    peerTtm: "P/E (TTM)",
    peerForward: "Прогнозен P/E",
    peerAverage: "Средно за сравняваните",
    peerEmpty: "Потърси и добави компании, за да сравниш отчетените им P/E коефициенти.",
    peerNoData: "Няма налични положителни P/E стойности за избраните компании.",
    peerSearchUnavailable: "Търсенето на компании временно не е налично.",
    currentPrice: "Текуща цена",
    low: "Минимум",
    average: "Средна",
    high: "Максимум",
    upside: "Потенциал до средната целева цена",
    strongBuy: "Силна покупка",
    buy: "Покупка",
    hold: "Задържане",
    sell: "Продажба",
    strongSell: "Силна продажба",
    estimates: "Прогнози за печалбата и приходите",
    estimatesNote:
      "Средните стойности са консенсусни оценки, не прогноза на компанията или гарантиран резултат. Броят анализатори може да се различава по показател.",
    revisions: "Промени в прогнозите за EPS · последни 30 дни",
    epsTrend: "Сега спрямо преди 30 дни",
    upRevisions: "Повишени",
    downRevisions: "Понижени",
    surprises: "Изненади в отчетената печалба",
    actualEps: "Отчетен EPS",
    estimatedEps: "Прогнозен EPS",
    surprisePercent: "Изненада",
    retrieved: "Данните са изтеглени",
    ratioNote:
      "TTM обхваща последните 12 отчетени месеца. Прогнозните стойности са оценки; коефициентите се променят с цената на акцията.",
    targetNote: "Целевите цени са консенсусни оценки на анализатори, не гарантирани бъдещи цени.",
    metricHelp: {
      trailingPe:
        "Текущата цена на акцията, разделена на печалбата на акция за последните 12 месеца.",
      forwardPe:
        "Текущата цена на акцията, разделена на прогнозната печалба на акция; прогнозите се променят.",
      pegRatio:
        "P/E, разделено на очаквания ръст на печалбата. Методите на доставчиците може да се различават.",
      beta: "Историческа чувствителност към движенията на пазара, не прогноза за бъдещата волатилност.",
      eps: "Печалба на акция за последните 12 отчетени месеца.",
      forwardEps: "Прогнозна печалба на акция за бъдещ период според анализаторите.",
      debtToEquity: "Отчетен дълг спрямо собствения капитал; сравнявай сходни отрасли.",
    },
    period: "Период",
    epsAverage: "Средна печалба на акция",
    epsRange: "Печалба на акция мин.–макс.",
    revenueAverage: "Средни приходи",
    analystsCount: "Анализатори",
    growth: "Ръст",
    holders: "Собственост и акционери",
    insiderOwnership: "Дял на вътрешни лица",
    institutionalOwnership: "Дял на институциите",
    institutionsCount: "Отчитащи институции",
    institutions: "Най-големи институционални акционери",
    holder: "Притежател",
    percentHeld: "% дял",
    value: "Отчетена стойност",
    reported: "Отчетено",
    insiderHolders: "Позиции на вътрешни лица",
    relation: "Длъжност",
    shares: "Акции",
    unavailable: "Няма отчетени данни за този раздел.",
    loading: "Зареждане на анализа…",
    loadFailed: "Анализът на компанията не се зареди.",
    retry: "Опитай отново",
    source:
      "Източник: Yahoo Finance. Данните може да са забавени или непълни; това не е инвестиционен съвет.",
  },
  de: {
    title: "Unternehmensanalyse",
    desc: "Ein genauerer Blick auf Bewertung, Entwicklung, Analystenerwartungen und Eigentümer.",
    statistics: "Wichtige Kennzahlen",
    valuation: "Bewertung & Handel",
    profitability: "Rentabilität & Wachstum",
    balanceSheet: "Bilanz",
    shareholderReturns: "Aktionärsrendite",
    marketCap: "Marktkapitalisierung",
    enterpriseValue: "Unternehmenswert",
    trailingPe: "KGV (TTM)",
    forwardPe: "Forward-KGV",
    priceToSales: "Kurs / Umsatz",
    priceToBook: "Kurs / Buchwert",
    pegRatio: "PEG-Verhältnis",
    beta: "Beta (5J monatlich)",
    eps: "Gewinn je Aktie (TTM)",
    forwardEps: "Erwarteter Gewinn je Aktie",
    roe: "Eigenkapitalrendite",
    debtToEquity: "Fremdkapital / Eigenkapital",
    operatingMargin: "Operative Marge",
    profitMargin: "Nettomarge",
    revenueGrowth: "Umsatzwachstum",
    earningsGrowth: "Gewinnwachstum",
    cash: "Barmittel",
    totalDebt: "Gesamtschulden",
    currentRatio: "Liquidität 3. Grades",
    quickRatio: "Liquidität 2. Grades",
    dividendRate: "Jährliche Dividende",
    dividendYield: "Dividendenrendite",
    analysts: "Analystenausblick",
    consensus: "Empfehlungstrend",
    target: "Kursziel für 12 Monate",
    historicalPrice: "Aktienkurs · letztes Jahr",
    analystRange: "Analystenzielspanne · nächste 12 Monate",
    analystMean: "Durchschnittliches Kursziel",
    targetChartLoading: "Kursverlauf wird geladen…",
    targetChartUnavailable: "Kursverlauf oder Analystenzielspanne nicht verfügbar.",
    peerTitle: "KGV im Vergleich zu ausgewählten Unternehmen",
    peerDescription:
      "Wähle börsennotierte Unternehmen selbst aus. Der Peer-Durchschnitt schließt das aktuelle Unternehmen und Unternehmen ohne positives KGV aus.",
    peerSearch: "Unternehmen oder Ticker suchen",
    peerAdd: "Suchen",
    peerAddCompany: "Hinzufügen",
    peerRemove: "Entfernen",
    peerTtm: "KGV (TTM)",
    peerForward: "Forward-KGV",
    peerAverage: "Peer-Durchschnitt",
    peerEmpty: "Suche und füge Unternehmen hinzu, um ihre gemeldeten KGVs zu vergleichen.",
    peerNoData: "Für die ausgewählten Unternehmen sind keine positiven KGV-Daten verfügbar.",
    peerSearchUnavailable: "Die Unternehmenssuche ist vorübergehend nicht verfügbar.",
    currentPrice: "Aktueller Kurs",
    low: "Tief",
    average: "Durchschnitt",
    high: "Hoch",
    upside: "Potenzial bis zum Durchschnittsziel",
    strongBuy: "Starker Kauf",
    buy: "Kauf",
    hold: "Halten",
    sell: "Verkauf",
    strongSell: "Starker Verkauf",
    estimates: "Gewinn- und Umsatzschätzungen",
    estimatesNote:
      "Konsensdurchschnitte sind Schätzungen, keine Unternehmensprognosen oder garantierten Ergebnisse. Die Analystenzahl kann je Kennzahl variieren.",
    revisions: "EPS-Schätzungsänderungen · letzte 30 Tage",
    epsTrend: "Aktuell gegenüber vor 30 Tagen",
    upRevisions: "Angehoben",
    downRevisions: "Gesenkt",
    surprises: "Überraschungen bei gemeldeten Ergebnissen",
    actualEps: "Gemeldeter EPS",
    estimatedEps: "Geschätzter EPS",
    surprisePercent: "Überraschung",
    retrieved: "Daten abgerufen",
    ratioNote:
      "TTM umfasst die letzten 12 gemeldeten Monate. Zukunftswerte sind Schätzungen; Bewertungskennzahlen ändern sich mit dem Aktienkurs.",
    targetNote: "Analystenkursziele sind Konsensschätzungen, keine garantierten zukünftigen Kurse.",
    metricHelp: {
      trailingPe: "Aktueller Aktienkurs geteilt durch den Gewinn je Aktie der letzten 12 Monate.",
      forwardPe:
        "Aktueller Kurs geteilt durch den geschätzten künftigen Gewinn je Aktie; Schätzungen ändern sich.",
      pegRatio:
        "KGV geteilt durch das erwartete Gewinnwachstum. Anbieter können unterschiedliche Methoden nutzen.",
      beta: "Historische Sensitivität gegenüber Marktbewegungen, keine Prognose künftiger Volatilität.",
      eps: "Gewinn je Aktie für die letzten 12 gemeldeten Monate.",
      forwardEps: "Analystenschätzung des Gewinns je Aktie für einen künftigen Zeitraum.",
      debtToEquity:
        "Gemeldete Schulden im Verhältnis zum Eigenkapital; mit ähnlichen Branchen vergleichen.",
    },
    period: "Zeitraum",
    epsAverage: "EPS-Durchschnitt",
    epsRange: "EPS-Tief–Hoch",
    revenueAverage: "Umsatz-Durchschnitt",
    analystsCount: "Analysten",
    growth: "Wachstum",
    holders: "Eigentümer & Anteilseigner",
    insiderOwnership: "Insideranteil",
    institutionalOwnership: "Institutioneller Anteil",
    institutionsCount: "Berichtende Institutionen",
    institutions: "Größte institutionelle Anteilseigner",
    holder: "Anteilseigner",
    percentHeld: "% gehalten",
    value: "Gemeldeter Wert",
    reported: "Gemeldet",
    insiderHolders: "Insiderpositionen",
    relation: "Funktion",
    shares: "Aktien",
    unavailable: "Für diesen Abschnitt sind keine gemeldeten Daten verfügbar.",
    loading: "Unternehmensanalyse wird geladen…",
    loadFailed: "Unternehmensanalyse konnte nicht geladen werden.",
    retry: "Erneut versuchen",
    source:
      "Quelle: Yahoo Finance. Daten können verzögert oder unvollständig sein; keine Anlageberatung.",
  },
  es: {
    title: "Análisis de la empresa",
    desc: "Una visión más profunda de la valoración, los resultados, las previsiones y la propiedad.",
    statistics: "Datos clave",
    valuation: "Valoración y negociación",
    profitability: "Rentabilidad y crecimiento",
    balanceSheet: "Balance",
    shareholderReturns: "Rentabilidad para accionistas",
    marketCap: "Capitalización bursátil",
    enterpriseValue: "Valor de empresa",
    trailingPe: "PER (TTM)",
    forwardPe: "PER futuro",
    priceToSales: "Precio / ventas",
    priceToBook: "Precio / valor contable",
    pegRatio: "Ratio PEG",
    beta: "Beta (5 años mensual)",
    eps: "BPA (TTM)",
    forwardEps: "BPA previsto",
    roe: "Rentabilidad sobre patrimonio",
    debtToEquity: "Deuda / patrimonio",
    operatingMargin: "Margen operativo",
    profitMargin: "Margen neto",
    revenueGrowth: "Crecimiento de ingresos",
    earningsGrowth: "Crecimiento de beneficios",
    cash: "Efectivo y equivalentes",
    totalDebt: "Deuda total",
    currentRatio: "Ratio corriente",
    quickRatio: "Ratio de liquidez",
    dividendRate: "Dividendo anual",
    dividendYield: "Rentabilidad por dividendo",
    analysts: "Perspectiva de analistas",
    consensus: "Tendencia de recomendaciones",
    target: "Precio objetivo a 12 meses",
    historicalPrice: "Precio de la acción · último año",
    analystRange: "Rango objetivo de analistas · próximos 12 meses",
    analystMean: "Objetivo medio",
    targetChartLoading: "Cargando historial de precios…",
    targetChartUnavailable: "No hay historial de precios o rango objetivo disponible.",
    peerTitle: "PER frente a empresas seleccionadas",
    peerDescription:
      "Elige tú las empresas cotizadas. La media excluye la empresa actual y las empresas sin un PER positivo.",
    peerSearch: "Buscar empresa o ticker",
    peerAdd: "Buscar",
    peerAddCompany: "Añadir",
    peerRemove: "Quitar",
    peerTtm: "PER (TTM)",
    peerForward: "PER futuro",
    peerAverage: "Media de comparables",
    peerEmpty: "Busca y añade empresas para comparar sus PER publicados.",
    peerNoData: "No hay datos de PER positivo para las empresas seleccionadas.",
    peerSearchUnavailable: "La búsqueda de empresas no está disponible temporalmente.",
    currentPrice: "Precio actual",
    low: "Mínimo",
    average: "Media",
    high: "Máximo",
    upside: "Rentabilidad implícita hasta el objetivo medio",
    strongBuy: "Compra fuerte",
    buy: "Comprar",
    hold: "Mantener",
    sell: "Vender",
    strongSell: "Venta fuerte",
    estimates: "Estimaciones de beneficios e ingresos",
    estimatesNote:
      "Los promedios de consenso son estimaciones, no previsiones de la empresa ni resultados garantizados. El número de analistas puede variar según la métrica.",
    revisions: "Revisiones de estimaciones de BPA · últimos 30 días",
    epsTrend: "Actual frente a hace 30 días",
    upRevisions: "Al alza",
    downRevisions: "A la baja",
    surprises: "Sorpresas de resultados publicados",
    actualEps: "BPA real",
    estimatedEps: "BPA estimado",
    surprisePercent: "Sorpresa",
    retrieved: "Datos obtenidos",
    ratioNote:
      "TTM abarca los últimos 12 meses publicados. Las cifras futuras son estimaciones; los múltiplos varían con el precio de la acción.",
    targetNote:
      "Los precios objetivo son estimaciones de consenso, no precios futuros garantizados.",
    metricHelp: {
      trailingPe:
        "Precio actual de la acción dividido por el beneficio por acción de los últimos 12 meses.",
      forwardPe:
        "Precio actual dividido por el beneficio por acción previsto; las previsiones pueden cambiar.",
      pegRatio:
        "PER dividido por el crecimiento de beneficios esperado. Las metodologías pueden variar.",
      beta: "Sensibilidad histórica a los movimientos del mercado; no predice la volatilidad futura.",
      eps: "Beneficio por acción de los últimos 12 meses publicados.",
      forwardEps: "Estimación de analistas del beneficio por acción para un período futuro.",
      debtToEquity:
        "Deuda publicada en relación con el capital propio; compárala dentro de sectores similares.",
    },
    period: "Período",
    epsAverage: "BPA medio",
    epsRange: "BPA mínimo–máximo",
    revenueAverage: "Ingresos medios",
    analystsCount: "Analistas",
    growth: "Crecimiento",
    holders: "Propiedad y accionistas",
    insiderOwnership: "Propiedad de directivos",
    institutionalOwnership: "Propiedad institucional",
    institutionsCount: "Instituciones que informan",
    institutions: "Mayores accionistas institucionales",
    holder: "Accionista",
    percentHeld: "% en propiedad",
    value: "Valor declarado",
    reported: "Declarado",
    insiderHolders: "Posiciones de directivos",
    relation: "Cargo",
    shares: "Acciones",
    unavailable: "No hay datos publicados disponibles para esta sección.",
    loading: "Cargando análisis…",
    loadFailed: "No se pudo cargar el análisis de la empresa.",
    retry: "Intentar de nuevo",
    source:
      "Fuente: Yahoo Finance. Los datos pueden estar retrasados o incompletos; no es asesoramiento financiero.",
  },
  it: {
    title: "Analisi aziendale",
    desc: "Una visione più approfondita di valutazione, risultati, aspettative degli analisti e proprietà.",
    statistics: "Statistiche principali",
    valuation: "Valutazione e negoziazione",
    profitability: "Redditività e crescita",
    balanceSheet: "Stato patrimoniale",
    shareholderReturns: "Rendimento per gli azionisti",
    marketCap: "Capitalizzazione di mercato",
    enterpriseValue: "Valore d'impresa",
    trailingPe: "P/E (TTM)",
    forwardPe: "P/E forward",
    priceToSales: "Prezzo / ricavi",
    priceToBook: "Prezzo / valore contabile",
    pegRatio: "Rapporto PEG",
    beta: "Beta (5 anni mensile)",
    eps: "Utile per azione (TTM)",
    forwardEps: "Utile per azione previsto",
    roe: "Rendimento del capitale",
    debtToEquity: "Debito / capitale",
    operatingMargin: "Margine operativo",
    profitMargin: "Margine netto",
    revenueGrowth: "Crescita dei ricavi",
    earningsGrowth: "Crescita degli utili",
    cash: "Liquidità e mezzi equivalenti",
    totalDebt: "Debito totale",
    currentRatio: "Indice di liquidità corrente",
    quickRatio: "Indice di liquidità immediata",
    dividendRate: "Dividendo annuale",
    dividendYield: "Rendimento da dividendo",
    analysts: "Prospettive degli analisti",
    consensus: "Andamento delle raccomandazioni",
    target: "Obiettivo di prezzo a 12 mesi",
    historicalPrice: "Prezzo dell'azione · ultimo anno",
    analystRange: "Intervallo obiettivo degli analisti · prossimi 12 mesi",
    analystMean: "Obiettivo medio",
    targetChartLoading: "Caricamento dello storico dei prezzi…",
    targetChartUnavailable: "Storico dei prezzi o intervallo obiettivo non disponibile.",
    peerTitle: "P/E rispetto alle aziende selezionate",
    peerDescription:
      "Scegli tu le società quotate. La media esclude l'azienda visualizzata e quelle senza un P/E positivo.",
    peerSearch: "Cerca azienda o ticker",
    peerAdd: "Cerca",
    peerAddCompany: "Aggiungi",
    peerRemove: "Rimuovi",
    peerTtm: "P/E (TTM)",
    peerForward: "P/E forward",
    peerAverage: "Media dei comparabili",
    peerEmpty: "Cerca e aggiungi aziende per confrontare i loro P/E dichiarati.",
    peerNoData: "Non sono disponibili dati P/E positivi per le aziende selezionate.",
    peerSearchUnavailable: "La ricerca delle aziende è temporaneamente non disponibile.",
    currentPrice: "Prezzo attuale",
    low: "Minimo",
    average: "Media",
    high: "Massimo",
    upside: "Rendimento implicito fino all'obiettivo medio",
    strongBuy: "Acquisto forte",
    buy: "Acquisto",
    hold: "Mantenere",
    sell: "Vendere",
    strongSell: "Vendita forte",
    estimates: "Stime di utili e ricavi",
    estimatesNote:
      "Le medie di consenso sono stime, non previsioni aziendali né risultati garantiti. Il numero di analisti può variare in base alla metrica.",
    revisions: "Revisioni delle stime EPS · ultimi 30 giorni",
    epsTrend: "Attuale rispetto a 30 giorni fa",
    upRevisions: "Al rialzo",
    downRevisions: "Al ribasso",
    surprises: "Sorprese sugli utili pubblicati",
    actualEps: "EPS effettivo",
    estimatedEps: "EPS stimato",
    surprisePercent: "Sorpresa",
    retrieved: "Dati aggiornati",
    ratioNote:
      "TTM comprende gli ultimi 12 mesi riportati. I dati previsionali sono stime; i multipli variano con il prezzo dell'azione.",
    targetNote: "I prezzi obiettivo sono stime di consenso, non prezzi futuri garantiti.",
    metricHelp: {
      trailingPe: "Prezzo attuale dell'azione diviso per l'utile per azione degli ultimi 12 mesi.",
      forwardPe:
        "Prezzo attuale diviso per l'utile per azione previsto; le stime possono cambiare.",
      pegRatio: "P/E diviso per la crescita degli utili prevista. Le metodologie possono variare.",
      beta: "Sensibilità storica ai movimenti del mercato, non una previsione della volatilità futura.",
      eps: "Utile per azione degli ultimi 12 mesi riportati.",
      forwardEps: "Stima degli analisti dell'utile per azione per un periodo futuro.",
      debtToEquity: "Debito dichiarato rispetto al patrimonio netto; confrontare settori simili.",
    },
    period: "Periodo",
    epsAverage: "EPS medio",
    epsRange: "EPS minimo–massimo",
    revenueAverage: "Ricavi medi",
    analystsCount: "Analisti",
    growth: "Crescita",
    holders: "Proprietà e azionisti",
    insiderOwnership: "Proprietà degli insider",
    institutionalOwnership: "Proprietà istituzionale",
    institutionsCount: "Istituzioni segnalanti",
    institutions: "Principali azionisti istituzionali",
    holder: "Azionista",
    percentHeld: "% detenuta",
    value: "Valore dichiarato",
    reported: "Dichiarato",
    insiderHolders: "Posizioni degli insider",
    relation: "Ruolo",
    shares: "Azioni",
    unavailable: "Nessun dato pubblicato disponibile per questa sezione.",
    loading: "Caricamento analisi aziendale…",
    loadFailed: "Impossibile caricare l'analisi aziendale.",
    retry: "Riprova",
    source:
      "Fonte: Yahoo Finance. I dati possono essere ritardati o incompleti; non è consulenza finanziaria.",
  },
} as const satisfies Record<Lang, Record<string, unknown>>;

export function ProCompanyResearch({
  symbol,
  lang,
  unlocked = false,
}: {
  symbol: string;
  lang: Lang;
  unlocked?: boolean;
}) {
  const c = COPY[lang];
  return (
    <ProGate title={c.title} desc={c.desc} preview={<BarsSilhouette />} unlocked={unlocked}>
      <ResearchPanels symbol={symbol} lang={lang} />
    </ProGate>
  );
}

function ResearchPanels({ symbol, lang }: { symbol: string; lang: Lang }) {
  const c = COPY[lang];
  const fetchStats = useServerFn(marketStats);
  const fetchResearch = useServerFn(marketCompanyResearch);
  const fetchDetails = useServerFn(marketDetails);
  const statsQuery = useQuery({
    queryKey: ["market-stats", symbol],
    queryFn: () => fetchStats({ data: { symbol } }),
    staleTime: 300_000,
  });
  const researchQuery = useQuery({
    queryKey: ["market-company-research", symbol],
    queryFn: () => fetchResearch({ data: { symbol } }),
    staleTime: 300_000,
  });
  const historyQuery = useQuery({
    queryKey: ["analyst-target-history", symbol],
    queryFn: () => fetchDetails({ data: { symbol, type: "stock", range: "1Y" } }),
    staleTime: 300_000,
  });
  const loc = languageLocale(lang);
  const stats = statsQuery.data;
  const research = researchQuery.data;
  const earningsHistory = research?.earningsHistory ?? [];
  const number = (value: number | null | undefined, digits = 1) =>
    value == null
      ? "—"
      : new Intl.NumberFormat(loc, { maximumFractionDigits: digits }).format(value);
  const percent = (value: number | null | undefined, alreadyPercent = false) =>
    value == null ? "—" : `${number(alreadyPercent ? value : value * 100)}%`;
  const money = (value: number | null | undefined, compact = false) =>
    value == null
      ? "—"
      : new Intl.NumberFormat(loc, {
          ...(stats?.currency ? { style: "currency" as const, currency: stats.currency } : {}),
          ...(compact ? { notation: "compact" as const, maximumFractionDigits: 2 } : {}),
          ...(!compact ? { maximumFractionDigits: 2 } : {}),
        }).format(value);
  const multiple = (value: number | null | undefined) =>
    value == null ? "—" : `${number(value, 2)}×`;
  const ratio = (value: number | null | undefined) => (value == null ? "—" : number(value, 2));
  const reportDate = (value: string | null) =>
    value ? new Date(value).toLocaleDateString(loc, { dateStyle: "medium" }) : "—";
  const fmtPeriod = (value: string) => value.replace(/^(\d+)([qym])$/, "$1 $2");
  const retrievedAt = research?.retrievedAt
    ? new Intl.DateTimeFormat(loc, { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(research.retrievedAt),
      )
    : null;

  if (statsQuery.isLoading || researchQuery.isLoading)
    return <p className="py-6 text-sm text-muted-foreground">{c.loading}</p>;
  if (statsQuery.isError || researchQuery.isError)
    return (
      <div className="space-y-3 py-4">
        <p role="alert" className="text-sm text-destructive">
          {c.loadFailed}
        </p>
        <Button
          variant="outline"
          onClick={() => void Promise.all([statsQuery.refetch(), researchQuery.refetch()])}
        >
          {c.retry}
        </Button>
      </div>
    );
  const hasOwnershipData =
    !!research &&
    (research.ownership.insiderPercent != null ||
      research.ownership.institutionalPercent != null ||
      research.ownership.institutions.length > 0 ||
      research.ownership.insiders.length > 0);
  if (
    !stats &&
    !research?.estimates.length &&
    !research?.earningsHistory.length &&
    !research?.recommendations.length &&
    !hasOwnershipData
  )
    return <p className="py-6 text-sm text-muted-foreground">{c.unavailable}</p>;

  const rows = (items: { label: string; value: string; help?: string }[]) => (
    <dl className="divide-y divide-border/70">
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <dt
            className="text-muted-foreground"
            title={item.help}
            aria-label={item.help ? `${item.label}. ${item.help}` : undefined}
          >
            {item.label}
          </dt>
          <dd className="text-right font-semibold tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
  const group = (
    title: string,
    icon: ReactNode,
    items: { label: string; value: string; help?: string }[],
  ) => (
    <section className="rounded-xl border border-border bg-background/70 p-4">
      <h4 className="mb-1 flex items-center gap-2 font-display text-sm font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </h4>
      {rows(items)}
    </section>
  );
  const recommendations = research?.recommendations ?? [];
  const latestRecommendation = recommendations[0];
  const voteLabels = ["strongBuy", "buy", "hold", "sell", "strongSell"] as const;
  const voteColors = [
    "bg-success",
    "bg-success/65",
    "bg-muted-foreground/50",
    "bg-destructive/65",
    "bg-destructive",
  ];
  const voteNames = [c.strongBuy, c.buy, c.hold, c.sell, c.strongSell];
  const totalVotes = latestRecommendation
    ? voteLabels.reduce((sum, key) => sum + latestRecommendation[key], 0)
    : 0;
  const targetLow = stats?.targetLow;
  const targetHigh = stats?.targetHigh;
  const currentPrice = stats?.currentPrice;
  const targetMean = stats?.target;
  const targetRangeValid =
    targetLow != null &&
    targetHigh != null &&
    currentPrice != null &&
    targetMean != null &&
    targetHigh > targetLow;
  const targetPosition = (value: number) =>
    Math.min(
      100,
      Math.max(0, ((value - (targetLow ?? 0)) / ((targetHigh ?? 0) - (targetLow ?? 0))) * 100),
    );
  const institutions = research?.ownership.institutions ?? [];
  const insiders = research?.ownership.insiders ?? [];
  const estimates = research?.estimates ?? [];
  const statGroups = [
    group(c.valuation, <ChartNoAxesCombined size={16} />, [
      { label: c.marketCap, value: money(stats?.marketCap, true) },
      { label: c.enterpriseValue, value: money(stats?.enterpriseValue, true) },
      {
        label: c.trailingPe,
        value: multiple(stats?.trailingPe),
        help: c.metricHelp.trailingPe,
      },
      { label: c.forwardPe, value: multiple(stats?.forwardPe), help: c.metricHelp.forwardPe },
      { label: c.priceToSales, value: multiple(stats?.priceToSales) },
      { label: c.priceToBook, value: multiple(stats?.priceToBook) },
      { label: c.pegRatio, value: ratio(stats?.pegRatio), help: c.metricHelp.pegRatio },
      { label: c.beta, value: ratio(stats?.beta), help: c.metricHelp.beta },
    ]),
    group(c.profitability, <BarChart3 size={16} />, [
      { label: c.eps, value: money(stats?.eps), help: c.metricHelp.eps },
      { label: c.forwardEps, value: money(stats?.forwardEps), help: c.metricHelp.forwardEps },
      { label: c.roe, value: percent(stats?.returnOnEquity) },
      {
        label: c.debtToEquity,
        value: stats?.debtToEquity == null ? "—" : `${number(stats.debtToEquity)}%`,
        help: c.metricHelp.debtToEquity,
      },
      { label: c.operatingMargin, value: percent(stats?.operatingMargins) },
      { label: c.profitMargin, value: percent(stats?.profitMargins) },
      { label: c.revenueGrowth, value: percent(stats?.revenueGrowth) },
      { label: c.earningsGrowth, value: percent(stats?.earningsGrowth) },
    ]),
    group(c.balanceSheet, <Building2 size={16} />, [
      { label: c.cash, value: money(stats?.cash, true) },
      { label: c.totalDebt, value: money(stats?.totalDebt, true) },
      { label: c.currentRatio, value: ratio(stats?.currentRatio) },
      { label: c.quickRatio, value: ratio(stats?.quickRatio) },
    ]),
    group(c.shareholderReturns, <UsersRound size={16} />, [
      { label: c.dividendRate, value: money(stats?.dividendRate) },
      { label: c.dividendYield, value: percent(stats?.dividendYield, true) },
    ]),
  ];

  return (
    <div className="space-y-8">
      <section id="statistics" className="scroll-mt-24 space-y-3">
        <SectionHeading icon={<ChartNoAxesCombined size={18} />} title={c.statistics} />
        <QuoteFreshness at={stats?.quoteAt} lang={lang} marketState={stats?.marketState} />
        <p className="text-xs text-muted-foreground">{c.ratioNote}</p>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{statGroups}</div>
        <PeerComparison
          symbol={symbol}
          lang={lang}
          copy={{
            title: c.peerTitle,
            description: c.peerDescription,
            search: c.peerSearch,
            add: c.peerAdd,
            addCompany: c.peerAddCompany,
            remove: c.peerRemove,
            ttm: c.peerTtm,
            forward: c.peerForward,
            average: c.peerAverage,
            empty: c.peerEmpty,
            noData: c.peerNoData,
            searchUnavailable: c.peerSearchUnavailable,
          }}
        />
      </section>

      <section id="analysis" className="scroll-mt-24 space-y-3">
        <SectionHeading icon={<BarChart3 size={18} />} title={c.analysts} />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-background/70 p-4">
            <h4 className="mb-3 font-display text-sm font-semibold">{c.target}</h4>
            <p className="mb-3 text-xs text-muted-foreground">{c.targetNote}</p>
            {targetRangeValid ? (
              <>
                <AnalystTargetChart
                  closes={historyQuery.data?.closes ?? []}
                  loading={historyQuery.isLoading}
                  currency={stats?.currency ?? historyQuery.data?.currency ?? null}
                  locale={loc}
                  currentPrice={currentPrice!}
                  targetLow={targetLow!}
                  targetMean={targetMean!}
                  targetHigh={targetHigh!}
                  labels={{
                    historical: c.historicalPrice,
                    range: c.analystRange,
                    mean: c.analystMean,
                    loading: c.targetChartLoading,
                    unavailable: c.targetChartUnavailable,
                  }}
                  unavailable={historyQuery.isError || historyQuery.data?.unavailable === true}
                />
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{c.currentPrice}</p>
                    <p className="numeric-display mt-1 text-2xl font-bold">{money(currentPrice)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{c.average}</p>
                    <p className="numeric-display mt-1 text-2xl font-bold text-primary">
                      {money(targetMean)}
                    </p>
                  </div>
                </div>
                <div className="relative mt-6 h-2 rounded-full bg-secondary">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-destructive/60 via-primary/50 to-success/70" />
                  <span
                    className="absolute -top-1.5 h-5 w-1 rounded-full bg-foreground"
                    style={{ left: `${targetPosition(currentPrice!)}%` }}
                    title={`${c.currentPrice}: ${money(currentPrice)}`}
                  />
                  <span
                    className="absolute -top-1 h-4 w-1 rounded-full bg-primary"
                    style={{ left: `${targetPosition(targetMean!)}%` }}
                    title={`${c.average}: ${money(targetMean)}`}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>
                    {c.low} {money(targetLow)}
                  </span>
                  <span>
                    {c.high} {money(targetHigh)}
                  </span>
                </div>
                {currentPrice! > 0 && (
                  <p className="mt-4 text-sm">
                    {c.upside}:{" "}
                    <strong
                      className={targetMean! >= currentPrice! ? "text-success" : "text-destructive"}
                    >
                      {percent((targetMean! / currentPrice! - 1) * 100, true)}
                    </strong>
                  </p>
                )}
              </>
            ) : (
              <p className="py-4 text-sm text-muted-foreground">{c.unavailable}</p>
            )}
          </section>
          <section className="rounded-xl border border-border bg-background/70 p-4">
            <h4 className="mb-3 font-display text-sm font-semibold">{c.consensus}</h4>
            {latestRecommendation && totalVotes > 0 ? (
              <>
                <div className="flex h-3 overflow-hidden rounded-full bg-secondary">
                  {voteLabels.map((key, index) =>
                    latestRecommendation[key] > 0 ? (
                      <span
                        key={key}
                        className={voteColors[index]}
                        style={{ width: `${(latestRecommendation[key] / totalVotes) * 100}%` }}
                        title={`${voteNames[index]}: ${latestRecommendation[key]}`}
                      />
                    ) : null,
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                  {voteLabels.map((key, index) => (
                    <div key={key} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <i className={`h-2 w-2 rounded-full ${voteColors[index]}`} />
                        {voteNames[index]}
                      </span>
                      <strong className="tabular-nums">{latestRecommendation[key]}</strong>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {recommendations.slice(0, 4).map((item) => (
                    <span key={item.period} className="mr-3">
                      {item.period}: {voteLabels.reduce((sum, key) => sum + item[key], 0)}
                    </span>
                  ))}
                </p>
              </>
            ) : (
              <p className="py-4 text-sm text-muted-foreground">{c.unavailable}</p>
            )}
          </section>
        </div>

        <section className="rounded-xl border border-border bg-background/70 p-4">
          <h4 className="font-display text-sm font-semibold">{c.estimates}</h4>
          <p className="mb-3 mt-1 text-xs text-muted-foreground">{c.estimatesNote}</p>
          {estimates.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-border text-xs text-muted-foreground">
                  <tr>
                    {[
                      c.period,
                      c.epsAverage,
                      c.epsRange,
                      c.revenueAverage,
                      c.growth,
                      c.analystsCount,
                    ].map((label) => (
                      <th key={label} className="px-3 py-2 font-medium">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {estimates.map((item) => (
                    <tr key={item.period} className="hover:bg-secondary/40">
                      <th className="px-3 py-2.5 font-semibold">
                        {item.endDate
                          ? new Date(item.endDate).toLocaleDateString(loc, {
                              month: "short",
                              year: "numeric",
                            })
                          : fmtPeriod(item.period)}
                      </th>
                      <td className="px-3 py-2.5 tabular-nums">{money(item.epsAverage)}</td>
                      <td className="px-3 py-2.5 tabular-nums">
                        {item.epsLow == null || item.epsHigh == null
                          ? "—"
                          : `${money(item.epsLow)} – ${money(item.epsHigh)}`}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">
                        {money(item.revenueAverage, true)}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">{percent(item.epsGrowth)}</td>
                      <td className="px-3 py-2.5 tabular-nums">{number(item.analystCount, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">{c.unavailable}</p>
          )}
        </section>
        <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-background/70 p-4">
            <h4 className="mb-3 font-display text-sm font-semibold">{c.revisions}</h4>
            {estimates.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="border-b border-border text-xs text-muted-foreground">
                    <tr>
                      {[c.period, c.epsTrend, c.upRevisions, c.downRevisions].map((label) => (
                        <th key={label} className="px-3 py-2 font-medium">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {estimates.map((item) => (
                      <tr key={item.period}>
                        <th className="px-3 py-2.5 font-semibold">
                          {item.endDate
                            ? new Date(item.endDate).toLocaleDateString(loc, {
                                month: "short",
                                year: "numeric",
                              })
                            : fmtPeriod(item.period)}
                        </th>
                        <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                          {money(item.eps30DaysAgo)} → {money(item.epsCurrent)}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">
                          {number(item.revisionsUp30Days, 0)}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">
                          {number(item.revisionsDown30Days, 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-4 text-sm text-muted-foreground">{c.unavailable}</p>
            )}
          </section>
          <section className="rounded-xl border border-border bg-background/70 p-4">
            <h4 className="mb-3 font-display text-sm font-semibold">{c.surprises}</h4>
            {earningsHistory.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="border-b border-border text-xs text-muted-foreground">
                    <tr>
                      {[c.period, c.actualEps, c.estimatedEps, c.surprisePercent].map((label) => (
                        <th key={label} className="px-3 py-2 font-medium">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {earningsHistory.map((item) => (
                      <tr key={item.period}>
                        <th className="px-3 py-2.5 font-semibold">
                          {item.quarter ? reportDate(item.quarter) : fmtPeriod(item.period)}
                        </th>
                        <td className="px-3 py-2.5 tabular-nums">{money(item.epsActual)}</td>
                        <td className="px-3 py-2.5 tabular-nums">{money(item.epsEstimate)}</td>
                        <td className="px-3 py-2.5 tabular-nums">
                          {percent(item.surprisePercent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-4 text-sm text-muted-foreground">{c.unavailable}</p>
            )}
          </section>
        </section>
      </section>

      <section id="holders" className="scroll-mt-24 space-y-3">
        <SectionHeading icon={<UsersRound size={18} />} title={c.holders} />
        <div className="grid gap-3 sm:grid-cols-3">
          <OwnershipCard
            label={c.insiderOwnership}
            value={percent(research?.ownership.insiderPercent)}
          />
          <OwnershipCard
            label={c.institutionalOwnership}
            value={percent(research?.ownership.institutionalPercent)}
          />
          <OwnershipCard
            label={c.institutionsCount}
            value={number(research?.ownership.institutionsCount, 0)}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <HolderTable
            title={c.institutions}
            headers={[c.holder, c.percentHeld, c.value, c.reported]}
            rows={institutions.map((item) => [
              item.name,
              percent(item.percentHeld),
              money(item.value, true),
              reportDate(item.reportDate),
            ])}
            empty={c.unavailable}
          />
          <HolderTable
            title={c.insiderHolders}
            headers={[c.holder, c.relation, c.shares, c.reported]}
            rows={insiders.map((item) => [
              item.name,
              item.relation || "—",
              number(item.shares, 0),
              reportDate(item.reportDate),
            ])}
            empty={c.unavailable}
          />
        </div>
      </section>
      <p className="text-xs text-muted-foreground">
        {c.source}
        {retrievedAt ? ` ${c.retrieved}: ${retrievedAt}.` : ""}
      </p>
    </div>
  );
}

function PeerComparison({
  symbol,
  lang,
  copy,
}: {
  symbol: string;
  lang: Lang;
  copy: {
    title: string;
    description: string;
    search: string;
    add: string;
    addCompany: string;
    remove: string;
    ttm: string;
    forward: string;
    average: string;
    empty: string;
    noData: string;
    searchUnavailable: string;
  };
}) {
  const [term, setTerm] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [peers, setPeers] = useState<MarketAsset[]>([]);
  const [metric, setMetric] = useState<"trailingPe" | "forwardPe">("trailingPe");
  const search = useServerFn(searchMarket);
  const fetchStats = useServerFn(marketStats);
  const searchQuery = useQuery({
    queryKey: ["company-peer-search", submitted],
    queryFn: () => search({ data: { query: submitted } }),
    enabled: !!submitted,
    staleTime: 300_000,
  });
  const peerQueries = useQueries({
    queries: peers.map((peer) => ({
      queryKey: ["market-stats", peer.symbol],
      queryFn: () => fetchStats({ data: { symbol: peer.symbol } }),
      staleTime: 300_000,
    })),
  });
  const candidates = (searchQuery.data?.assets ?? []).filter(
    (asset) =>
      asset.type === "stock" &&
      asset.symbol.toUpperCase() !== symbol.toUpperCase() &&
      !peers.some((peer) => peer.symbol.toUpperCase() === asset.symbol.toUpperCase()),
  );
  const values = peers.map((peer, index) => ({
    ...peer,
    value: peerQueries[index]?.data?.[metric] ?? null,
    loading: peerQueries[index]?.isLoading ?? false,
  }));
  const peerValues = values.flatMap((peer) =>
    peer.value != null && Number.isFinite(peer.value) && peer.value > 0 ? [peer.value] : [],
  );
  const peerAverage =
    peerValues.length > 0
      ? peerValues.reduce((sum, value) => sum + value, 0) / peerValues.length
      : null;
  const companyQuery = useQuery({
    queryKey: ["market-stats", symbol],
    queryFn: () => fetchStats({ data: { symbol } }),
    staleTime: 300_000,
  });
  const companyValue = companyQuery.data?.[metric] ?? null;
  const rows = [
    { symbol, name: symbol, value: companyValue, current: true, loading: companyQuery.isLoading },
    ...values.map((peer) => ({ ...peer, current: false })),
  ];
  const maxValue = Math.max(0, ...rows.map((row) => row.value ?? 0), peerAverage ?? 0);
  const max = maxValue * 1.1;
  const loc = languageLocale(lang);

  const addPeer = (asset: MarketAsset) => {
    if (peers.length >= 5) return;
    setPeers((current) => [...current, asset]);
    setTerm("");
    setSubmitted("");
  };

  return (
    <section className="rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-secondary/20 p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-display font-semibold">{copy.title}</h4>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            {copy.description}
          </p>
        </div>
        <div role="group" aria-label={copy.title} className="flex rounded-lg bg-secondary p-1">
          {(["trailingPe", "forwardPe"] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={metric === key}
              onClick={() => setMetric(key)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                metric === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {key === "trailingPe" ? copy.ttm : copy.forward}
            </button>
          ))}
        </div>
      </div>

      <form
        className="mt-4 flex max-w-xl gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(term.trim());
        }}
      >
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={copy.search}
          aria-label={copy.search}
          maxLength={60}
        />
        <Button type="submit" variant="secondary" disabled={!term.trim()}>
          {copy.add}
        </Button>
      </form>

      {searchQuery.isError && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {copy.searchUnavailable}
        </p>
      )}
      {searchQuery.data?.unavailable && (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          {copy.searchUnavailable}
        </p>
      )}
      {candidates.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {candidates.slice(0, 6).map((asset) => (
            <button
              key={asset.symbol}
              type="button"
              onClick={() => addPeer(asset)}
              disabled={peers.length >= 5}
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-background px-3 text-xs transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
            >
              <span className="font-semibold">{asset.symbol}</span>
              <span className="max-w-40 truncate text-muted-foreground">{asset.name}</span>
              <span aria-hidden className="text-primary">
                +
              </span>
              <span className="sr-only">
                {copy.addCompany} {asset.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {peers.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {copy.empty}
        </p>
      ) : (
        <>
          {peerAverage != null && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-primary/[0.07] px-3 py-2 text-sm">
              <span className="font-medium text-muted-foreground">{copy.average}</span>
              <strong className="tabular-nums text-primary">
                {new Intl.NumberFormat(loc, { maximumFractionDigits: 2 }).format(peerAverage)}×
              </strong>
            </div>
          )}
          {max > 0 ? (
            <div className="mt-3 space-y-3">
              {rows.map((row, index) => (
                <div
                  key={row.symbol}
                  className="grid grid-cols-[minmax(90px,1fr)_2fr_auto] items-center gap-3"
                >
                  <div className="min-w-0">
                    <p
                      className={`truncate text-sm font-semibold ${row.current ? "text-primary" : ""}`}
                    >
                      {row.symbol}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">{row.name}</p>
                  </div>
                  <div className="relative h-8 overflow-hidden rounded-r-md bg-secondary/60">
                    {peerAverage != null && (
                      <span
                        aria-hidden
                        className="absolute inset-y-0 z-10 border-l border-dashed border-foreground/60"
                        style={{ left: `${(peerAverage / max) * 100}%` }}
                      />
                    )}
                    {row.value != null && row.value > 0 && (
                      <div
                        className={`flex h-full min-w-1 items-center px-2 text-xs font-semibold text-primary-foreground ${
                          row.current ? "bg-primary" : "bg-success"
                        }`}
                        style={{ width: `${Math.max(1, (row.value / max) * 100)}%` }}
                      >
                        {row.value > max * 0.2
                          ? `${new Intl.NumberFormat(loc, { maximumFractionDigits: 2 }).format(row.value)}×`
                          : ""}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="min-w-12 text-right text-sm font-semibold tabular-nums">
                      {row.loading
                        ? "…"
                        : row.value != null && row.value > 0
                          ? `${new Intl.NumberFormat(loc, { maximumFractionDigits: 2 }).format(row.value)}×`
                          : "—"}
                    </span>
                    {!row.current && (
                      <button
                        type="button"
                        aria-label={`${copy.remove} ${row.symbol}`}
                        onClick={() =>
                          setPeers((current) =>
                            current.filter((peer) => peer.symbol !== row.symbol),
                          )
                        }
                        className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">{copy.noData}</p>
          )}
        </>
      )}
    </section>
  );
}

function AnalystTargetChart({
  closes,
  loading,
  unavailable,
  currency,
  locale,
  currentPrice,
  targetLow,
  targetMean,
  targetHigh,
  labels,
}: {
  closes: { t: number; c: number }[];
  loading: boolean;
  unavailable: boolean;
  currency: string | null;
  locale: string;
  currentPrice: number;
  targetLow: number;
  targetMean: number;
  targetHigh: number;
  labels: {
    historical: string;
    range: string;
    mean: string;
    loading: string;
    unavailable: string;
  };
}) {
  const data = closes.filter(
    (point) => Number.isFinite(point.t) && Number.isFinite(point.c) && point.c > 0,
  );
  const validTargets =
    Number.isFinite(targetLow) &&
    Number.isFinite(targetMean) &&
    Number.isFinite(targetHigh) &&
    targetLow > 0 &&
    targetLow <= targetMean &&
    targetMean <= targetHigh;
  const validCurrency = currency && /^[A-Za-z]{3}$/.test(currency);
  const formatMoney = (value: number) =>
    new Intl.NumberFormat(locale, {
      ...(validCurrency ? { style: "currency" as const, currency: currency! } : {}),
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);

  if (loading) return <p className="mb-3 text-sm text-muted-foreground">{labels.loading}</p>;
  if (unavailable || data.length < 2 || !validTargets)
    return (
      <p role="status" className="mb-3 text-sm text-muted-foreground">
        {labels.unavailable}
      </p>
    );
  const firstPoint = data[0];
  const lastPoint = data.at(-1);
  if (!firstPoint || !lastPoint)
    return (
      <p role="status" className="mb-3 text-sm text-muted-foreground">
        {labels.unavailable}
      </p>
    );

  const width = 760;
  const height = 250;
  const left = 78;
  const right = 42;
  const top = 24;
  const bottom = 38;
  const plotBottom = height - bottom;
  const actualEnd = width - right - 130;
  const targetX = width - right - 30;
  const prices = [...data.map((point) => point.c), targetLow, targetHigh, currentPrice];
  const rawMin = Math.min(...prices);
  const rawMax = Math.max(...prices);
  const padding = Math.max((rawMax - rawMin) * 0.1, rawMax * 0.03);
  const min = Math.max(0, rawMin - padding);
  const max = rawMax + padding;
  const y = (value: number) => plotBottom - ((value - min) / (max - min || 1)) * (plotBottom - top);
  const firstTime = firstPoint.t;
  const lastTime = lastPoint.t;
  const x = (time: number) =>
    left + ((time - firstTime) / (lastTime - firstTime || 1)) * (actualEnd - left);
  const line = data
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${x(point.t).toFixed(1)},${y(point.c).toFixed(1)}`,
    )
    .join(" ");
  const area = `${line} L${actualEnd},${plotBottom} L${left},${plotBottom} Z`;
  const bandTop = y(targetHigh);
  const bandBottom = y(targetLow);
  const bandHeight = Math.max(3, bandBottom - bandTop);
  const targetDate = new Date(Date.now() + 365 * 86400000);
  const dateLabel = (time: number) =>
    new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(new Date(time));

  return (
    <div className="mb-4 overflow-x-auto rounded-xl border border-border/60 bg-background/50 p-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[250px] min-w-[560px] w-full"
        role="img"
        aria-label={`${labels.historical}. ${labels.range}: ${formatMoney(targetLow)}–${formatMoney(targetHigh)}. ${labels.mean}: ${formatMoney(targetMean)}.`}
      >
        {[0, 1, 2, 3].map((step) => {
          const value = min + ((max - min) * step) / 3;
          const position = y(value);
          return (
            <g key={step}>
              <line
                x1={left}
                x2={width - right}
                y1={position}
                y2={position}
                stroke="var(--border)"
                strokeDasharray="3 5"
              />
              <text
                x={left - 8}
                y={position + 4}
                textAnchor="end"
                fill="var(--muted-foreground)"
                fontSize="10"
              >
                {formatMoney(value)}
              </text>
            </g>
          );
        })}
        <path d={area} fill="var(--chart-5)" fillOpacity="0.13" />
        <path
          d={line}
          fill="none"
          stroke="var(--chart-5)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle
          cx={actualEnd}
          cy={y(lastPoint.c)}
          r="4"
          fill="var(--chart-5)"
          stroke="var(--background)"
          strokeWidth="2"
        />
        <line
          x1={targetX}
          x2={targetX}
          y1={bandTop}
          y2={bandBottom}
          stroke="var(--primary)"
          strokeWidth="2"
        />
        <rect
          x={targetX - 18}
          y={bandTop}
          width="36"
          height={bandHeight}
          rx="6"
          fill="var(--primary)"
          fillOpacity="0.22"
          stroke="var(--primary)"
          strokeOpacity="0.65"
        />
        <line
          x1={targetX - 10}
          x2={targetX + 10}
          y1={y(targetMean)}
          y2={y(targetMean)}
          stroke="var(--primary)"
          strokeWidth="3"
        />
        <circle
          cx={targetX}
          cy={y(targetMean)}
          r="4"
          fill="var(--primary)"
          stroke="var(--background)"
          strokeWidth="2"
        />
        <line
          x1={actualEnd + 8}
          x2={targetX - 22}
          y1={plotBottom}
          y2={plotBottom}
          stroke="var(--muted-foreground)"
          strokeDasharray="3 5"
        />
        <text x={left} y={height - 10} fill="var(--muted-foreground)" fontSize="10">
          {dateLabel(firstTime)}
        </text>
        <text
          x={actualEnd}
          y={height - 10}
          textAnchor="middle"
          fill="var(--muted-foreground)"
          fontSize="10"
        >
          {dateLabel(lastTime)}
        </text>
        <text
          x={targetX}
          y={height - 10}
          textAnchor="middle"
          fill="var(--muted-foreground)"
          fontSize="10"
        >
          {dateLabel(targetDate.getTime())}
        </text>
        <text
          x={targetX}
          y={Math.max(top + 10, bandTop - 8)}
          textAnchor="middle"
          fill="var(--primary)"
          fontSize="10"
          fontWeight="600"
        >
          {formatMoney(targetLow)}–{formatMoney(targetHigh)}
        </text>
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-2 pb-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2 rounded-full bg-[var(--chart-5)]" />
          {labels.historical}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2 rounded-full bg-primary" />
          {labels.range} · {labels.mean}: {formatMoney(targetMean)}
        </span>
      </div>
    </div>
  );
}

function SectionHeading({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <h4 className="flex items-center gap-2 font-display text-base font-semibold">
      <span className="text-primary">{icon}</span>
      {title}
    </h4>
  );
}

function OwnershipCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/70 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function HolderTable({
  title,
  headers,
  rows,
  empty,
}: {
  title: string;
  headers: string[];
  rows: string[][];
  empty: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-background/70">
      <h4 className="px-4 pb-2 pt-4 font-display text-sm font-semibold">{title}</h4>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] text-left text-sm">
            <thead className="border-y border-border text-xs text-muted-foreground">
              <tr>
                {headers.map((header) => (
                  <th key={header} className="px-3 py-2 font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {rows.map((row) => (
                <tr key={row.join("|")} className="hover:bg-secondary/40">
                  {row.map((cell, index) =>
                    index === 0 ? (
                      <th
                        key={index}
                        className="max-w-48 truncate px-3 py-2.5 font-medium"
                        title={cell}
                      >
                        {cell}
                      </th>
                    ) : (
                      <td key={index} className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                        {cell}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-4 py-4 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}
