import type { Lang } from "./i18n";

const en = {
  watch: "Add to watchlist",
  watching: "On watchlist",
  range52: "52-week range",
  low: "Low",
  high: "High",
  chart1y: "Last 12 months",
  noChart: "Price history unavailable.",
  retry: "Try again",
  chartDate: "Date",
  chartClose: "Close",
  chartOpen: "Open",
  chartHigh: "High",
  chartLow: "Low",
  alerts: "Price alerts",
  alertAbove: "Above",
  alertBelow: "Below",
  alertTarget: "Target price",
  alertAdd: "Set alert",
  alertHit: "Target reached",
  alertWaiting: "Waiting",
  alertNone: "No alerts yet. Alerts are checked against market quotes while the app is open.",
  taxExport: "Download tax report (Excel/CSV)",
  taxNote: "Amounts in USD, FIFO. Check with your tax advisor before filing.",
};
type Copy = typeof en;
const bg: Copy = {
  watch: "Добави в Watchlist",
  watching: "В Watchlist",
  range52: "52-седмичен диапазон",
  low: "Мин",
  high: "Макс",
  chart1y: "Последните 12 месеца",
  noChart: "Няма налична ценова история.",
  retry: "Опитай отново",
  chartDate: "Дата",
  chartClose: "Затваряне",
  chartOpen: "Отваряне",
  chartHigh: "Максимум",
  chartLow: "Минимум",
  alerts: "Ценови известия",
  alertAbove: "Над",
  alertBelow: "Под",
  alertTarget: "Целева цена",
  alertAdd: "Задай известие",
  alertHit: "Целта е достигната",
  alertWaiting: "Изчакване",
  alertNone:
    "Няма известия. Проверяват се спрямо пазарните котировки, докато приложението е отворено.",
  taxExport: "Изтегли данъчен отчет (Excel/CSV)",
  taxNote: "Суми в USD, по FIFO. Провери с данъчен консултант преди подаване.",
};
const de: Copy = {
  watch: "Zur Watchlist",
  watching: "Auf Watchlist",
  range52: "52-Wochen-Spanne",
  low: "Tief",
  high: "Hoch",
  chart1y: "Letzte 12 Monate",
  noChart: "Kursverlauf nicht verfügbar.",
  retry: "Erneut versuchen",
  chartDate: "Datum",
  chartClose: "Schluss",
  chartOpen: "Eröffnung",
  chartHigh: "Hoch",
  chartLow: "Tief",
  alerts: "Preisalarme",
  alertAbove: "Über",
  alertBelow: "Unter",
  alertTarget: "Zielpreis",
  alertAdd: "Alarm setzen",
  alertHit: "Ziel erreicht",
  alertWaiting: "Wartet",
  alertNone: "Noch keine Alarme. Sie werden bei geöffneter App mit Marktkursen geprüft.",
  taxExport: "Steuerbericht herunterladen (Excel/CSV)",
  taxNote: "Beträge in USD, FIFO. Vor Abgabe mit Steuerberater prüfen.",
};
const es: Copy = {
  watch: "Añadir a watchlist",
  watching: "En watchlist",
  range52: "Rango 52 semanas",
  low: "Mín",
  high: "Máx",
  chart1y: "Últimos 12 meses",
  noChart: "Historial de precios no disponible.",
  retry: "Reintentar",
  chartDate: "Fecha",
  chartClose: "Cierre",
  chartOpen: "Apertura",
  chartHigh: "Máximo",
  chartLow: "Mínimo",
  alerts: "Alertas de precio",
  alertAbove: "Por encima",
  alertBelow: "Por debajo",
  alertTarget: "Precio objetivo",
  alertAdd: "Crear alerta",
  alertHit: "Objetivo alcanzado",
  alertWaiting: "En espera",
  alertNone: "Sin alertas. Se comprueban con cotizaciones de mercado mientras la app está abierta.",
  taxExport: "Descargar informe fiscal (Excel/CSV)",
  taxNote: "Importes en USD, FIFO. Consulta a tu asesor fiscal antes de declarar.",
};
const it: Copy = {
  watch: "Aggiungi alla watchlist",
  watching: "In watchlist",
  range52: "Intervallo 52 settimane",
  low: "Min",
  high: "Max",
  chart1y: "Ultimi 12 mesi",
  noChart: "Storico prezzi non disponibile.",
  retry: "Riprova",
  chartDate: "Data",
  chartClose: "Chiusura",
  chartOpen: "Apertura",
  chartHigh: "Massimo",
  chartLow: "Minimo",
  alerts: "Avvisi di prezzo",
  alertAbove: "Sopra",
  alertBelow: "Sotto",
  alertTarget: "Prezzo obiettivo",
  alertAdd: "Imposta avviso",
  alertHit: "Obiettivo raggiunto",
  alertWaiting: "In attesa",
  alertNone: "Nessun avviso. Vengono controllati con quotazioni di mercato mentre l'app è aperta.",
  taxExport: "Scarica report fiscale (Excel/CSV)",
  taxNote: "Importi in USD, FIFO. Verifica con il commercialista prima della dichiarazione.",
};
export const extrasCopy: Record<Lang, Copy> = { en, bg, de, es, it };

export const priceAlertCopy: Record<
  Lang,
  {
    title: string;
    crossed: (symbol: string, target: string) => string;
    monitorNote: string;
  }
> = {
  en: {
    title: "Price alert",
    crossed: (symbol, target) => `${symbol} crossed your target of ${target}.`,
    monitorNote:
      "Alerts are checked with live quotes while the app is open; they do not run in the background.",
  },
  bg: {
    title: "Ценово известие",
    crossed: (symbol, target) => `${symbol} достигна зададената цел ${target}.`,
    monitorNote:
      "Известията се проверяват с реални котировки, докато приложението е отворено; не във фонов режим.",
  },
  de: {
    title: "Kursalarm",
    crossed: (symbol, target) => `${symbol} hat deinen Zielkurs ${target} erreicht.`,
    monitorNote:
      "Alarme werden mit Live-Kursen geprüft, solange die App geöffnet ist; nicht im Hintergrund.",
  },
  es: {
    title: "Alerta de precio",
    crossed: (symbol, target) => `${symbol} alcanzó tu objetivo de ${target}.`,
    monitorNote:
      "Las alertas se comprueban con cotizaciones en directo mientras la aplicación está abierta.",
  },
  it: {
    title: "Avviso prezzo",
    crossed: (symbol, target) => `${symbol} ha raggiunto il tuo obiettivo di ${target}.`,
    monitorNote:
      "Gli avvisi vengono controllati con quotazioni live mentre l'app è aperta; non in background.",
  },
};
