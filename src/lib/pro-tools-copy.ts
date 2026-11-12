import type { IssueKind } from "./quality";

export type L = "en" | "bg" | "de" | "es" | "it";

export const en = {
  review: "AI portfolio review",
  reviewDesc:
    "A review of your own portfolio: concentration, risks, questions and a weekly checklist.",
  go: "Review my portfolio",
  stop: "Stop",
  err: "Review failed",
  quality: "Data quality check",
  qualityDesc: "Finds transaction issues, stale quotes and buy targets that may need review.",
  clean: "No issues found — your data looks clean.",
  k: {
    duplicate: "Duplicate transactions",
    oversell: "Sold more than held",
    missingPrice: "Missing price",
    future: "Future date",
    noQuote: "No live quote",
    staleQuote: "Quote is more than four days old",
    targetReviewDue: "Buy target needs review",
    orphan: "Transaction without asset",
    priceOutlier: "Unit price far from the asset median; review split/import details",
  } as Record<IssueKind, string>,
};

export const bg: typeof en = {
  review: "AI преглед на портфолиото",
  reviewDesc:
    "Преглед на собственото ти портфолио: концентрация, рискове, въпроси и седмичен чеклист.",
  go: "Прегледай портфолиото ми",
  stop: "Спри",
  err: "Прегледът не успя",
  quality: "Проверка на данните",
  qualityDesc: "Открива проблеми със сделките, остарели котировки и цени за покупка за преглед.",
  clean: "Няма открити проблеми — данните изглеждат чисти.",
  k: {
    duplicate: "Дублирани трансакции",
    oversell: "Продадено повече от наличното",
    missingPrice: "Липсваща цена",
    future: "Бъдеща дата",
    noQuote: "Няма текуща цена",
    staleQuote: "Котировката е на повече от четири дни",
    targetReviewDue: "Цената за покупка трябва да се прегледа",
    orphan: "Трансакция без актив",
    priceOutlier: "Единичната цена се отклонява от медианата; провери сплит/импорт",
  },
};

export const de: typeof en = {
  ...en,
  review: "KI-Portfolio-Review",
  reviewDesc: "Review deines Portfolios: Konzentration, Risiken, Fragen und Wochen-Checkliste.",
  go: "Portfolio prüfen",
  stop: "Stopp",
  quality: "Datenqualität",
  qualityDesc:
    "Findet Transaktionsfehler, veraltete Kurse und möglicherweise prüfbedürftige Kaufziele.",
  clean: "Keine Probleme gefunden.",
  k: {
    ...en.k,
    staleQuote: "Kurs älter als vier Tage",
    targetReviewDue: "Kaufziel sollte geprüft werden",
    priceOutlier: "Stückpreis weicht stark vom Median ab; Split/Import prüfen",
  },
};

export const es: typeof en = {
  ...en,
  review: "Revisión IA de cartera",
  reviewDesc: "Revisión de tu cartera: concentración, riesgos, preguntas y lista semanal.",
  go: "Revisar mi cartera",
  stop: "Detener",
  quality: "Calidad de datos",
  qualityDesc:
    "Detecta problemas de transacciones, cotizaciones antiguas y objetivos de compra que revisar.",
  clean: "Sin problemas.",
  k: {
    ...en.k,
    staleQuote: "Cotización de hace más de cuatro días",
    targetReviewDue: "Revisar objetivo de compra",
    priceOutlier: "Precio unitario muy distinto de la mediana; revisar split/importación",
  },
};

export const it: typeof en = {
  ...en,
  review: "Revisione IA del portafoglio",
  reviewDesc:
    "Revisione del tuo portafoglio: concentrazione, rischi, domande e checklist settimanale.",
  go: "Rivedi il portafoglio",
  stop: "Ferma",
  quality: "Qualità dei dati",
  qualityDesc:
    "Rileva problemi nelle operazioni, quotazioni obsolete e obiettivi d'acquisto da rivedere.",
  clean: "Nessun problema.",
  k: {
    ...en.k,
    staleQuote: "Quotazione più vecchia di quattro giorni",
    targetReviewDue: "Obiettivo di acquisto da rivedere",
    priceOutlier: "Prezzo unitario molto diverso dalla mediana; verificare split/importazione",
  },
};

export const proToolsCopy: Record<L, typeof en> = { en, bg, de, es, it };
