import type { Lang } from "./i18n";
export const benchmarkCopy: Record<
  Lang,
  {
    compare: string;
    none: string;
    portfolio: string;
    index: string;
    difference: string;
    pp: string;
    priceReturn: string;
    unavailable: string;
    value: string;
    returns: string;
    twrVsIrrTitle: string;
    twrVsIrrNote: string;
    timingFavorable: string;
    timingUnfavorable: string;
    timingNeutral: string;
  }
> = {
  en: {
    compare: "Compare with index",
    none: "No comparison",
    portfolio: "Portfolio",
    index: "Index",
    difference: "Difference",
    pp: "pp",
    priceReturn: "Index price return · dividends excluded · same base currency",
    unavailable: "Index comparison unavailable for this period.",
    value: "Value",
    returns: "Return",
    twrVsIrrTitle: "TTWROR vs. IRR (Cash-flow timing)",
    twrVsIrrNote:
      "TTWROR isolates underlying asset performance for the period, while annualized IRR reflects when and how much capital you added or withdrew.",
    timingFavorable: "Positive cash-flow timing impact",
    timingUnfavorable: "Larger inflows preceded softer returns",
    timingNeutral: "Aligned with strategy return",
  },
  bg: {
    compare: "Сравни с индекс",
    none: "Без сравнение",
    portfolio: "Портфейл",
    index: "Индекс",
    difference: "Разлика",
    pp: "пр.п.",
    priceReturn: "Ценова доходност на индекса · без дивиденти · еднаква базова валута",
    unavailable: "Сравнението с индекса не е налично за този период.",
    value: "Стойност",
    returns: "Доходност",
    twrVsIrrTitle: "TTWROR срещу IRR (Момент на вноските)",
    twrVsIrrNote:
      "TTWROR измерва чистото представяне на активите за периода, а годишният IRR отчита кога и какви суми си внасял или теглил.",
    timingFavorable: "Положителен ефект от момента на сделките",
    timingUnfavorable: "По-големи вноски преди по-слаб период",
    timingNeutral: "Близко до стратегическата доходност",
  },
  de: {
    compare: "Mit Index vergleichen",
    none: "Kein Vergleich",
    portfolio: "Portfolio",
    index: "Index",
    difference: "Differenz",
    pp: "Prozentpunkte",
    priceReturn: "Index-Kursrendite · ohne Dividenden · gleiche Basiswährung",
    unavailable: "Indexvergleich für diesen Zeitraum nicht verfügbar.",
    value: "Wert",
    returns: "Rendite",
    twrVsIrrTitle: "TTWROR vs. IRR (Cashflow-Timing)",
    twrVsIrrNote:
      "TTWROR misst die reine Strategierendite im Zeitraum, während der annualisierte IRR berücksichtigt, wann und wie viel Kapital ein- oder ausgezahlt wurde.",
    timingFavorable: "Positiver Cashflow-Timing-Effekt",
    timingUnfavorable: "Größere Zuflüsse vor schwächerer Marktphase",
    timingNeutral: "Im Einklang mit der Strategierendite",
  },
  es: {
    compare: "Comparar con índice",
    none: "Sin comparación",
    portfolio: "Cartera",
    index: "Índice",
    difference: "Diferencia",
    pp: "p. p.",
    priceReturn: "Rentabilidad de precio del índice · sin dividendos · misma moneda base",
    unavailable: "Comparación con el índice no disponible para este período.",
    value: "Valor",
    returns: "Rentabilidad",
    twrVsIrrTitle: "TTWROR vs. IRR (Momento de aportaciones)",
    twrVsIrrNote:
      "TTWROR mide el rendimiento puro de la estrategia en el período, mientras que la TIR (IRR) anualizada refleja cuándo aportaste o retiraste capital.",
    timingFavorable: "Impacto positivo del momento de aportación",
    timingUnfavorable: "Mayores aportaciones antes de menores retornos",
    timingNeutral: "Alineado con el retorno de la estrategia",
  },
  it: {
    compare: "Confronta con indice",
    none: "Nessun confronto",
    portfolio: "Portafoglio",
    index: "Indice",
    difference: "Differenza",
    pp: "p. p.",
    priceReturn: "Rendimento di prezzo dell’indice · dividendi esclusi · stessa valuta base",
    unavailable: "Confronto con l’indice non disponibile per questo periodo.",
    value: "Valore",
    returns: "Rendimento",
    twrVsIrrTitle: "TTWROR vs. IRR (Tempistica dei flussi)",
    twrVsIrrNote:
      "TTWROR misura il rendimento puro della strategia nel periodo, mentre l’IRR annualizzato riflette il momento e l’importo dei flussi di capitale.",
    timingFavorable: "Impatto positivo della tempistica dei flussi",
    timingUnfavorable: "Flussi maggiori prima di rendimenti più deboli",
    timingNeutral: "Allineato al rendimento della strategia",
  },
};
