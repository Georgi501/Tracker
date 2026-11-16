import type { Lang } from "./i18n";

export interface EventsCopy {
  calendarTitle: string;
  calendarDescription: string;
  calendarEmpty: string;
  calendarSource: string;
  exDate: string;
  payDate: string;
  perShare: string;
  total: string;
  monthTotal: string;
  shares: string;
  amountUnavailable: string;
  feedTitle: string;
  feedDescription: string;
  feedEmpty: string;
  feedLoading: string;
  feedSource: string;
  today: string;
  tomorrow: string;
  inDays: (days: number) => string;
  filedAgo: (days: number) => string;
  exDividendTitle: (symbol: string) => string;
  exDividendBody: (when: string, date: string, payout: string) => string;
  secTitle: (symbol: string) => string;
  secBody: (periodEnd: string, filed: string) => string;
  viewFiling: string;
  bellLabel: (count: number) => string;
  bellTitle: string;
  bellEmpty: string;
  bellViewAll: string;
}

export const eventsCopy: Record<Lang, EventsCopy> = {
  en: {
    calendarTitle: "Confirmed dividend calendar",
    calendarDescription:
      "Upcoming ex-dividend and payment dates confirmed by the provider for your holdings, grouped by month.",
    calendarEmpty: "No confirmed upcoming dividend dates for your holdings.",
    calendarSource:
      "Only confirmed event dates are shown. Amounts use the latest confirmed payout per share; unconfirmed payouts are never estimated.",
    exDate: "Ex-dividend",
    payDate: "Payment",
    perShare: "Last confirmed / share",
    total: "Total",
    monthTotal: "Month total",
    shares: "shares",
    amountUnavailable: "Amount unavailable",
    feedTitle: "Portfolio events",
    feedDescription:
      "Confirmed ex-dividend dates in the next 7 days and recent SEC 10-K filings for companies you hold.",
    feedEmpty: "No upcoming ex-dividend dates or new 10-K filings for your holdings.",
    feedLoading: "Checking your holdings…",
    feedSource: "Public data from Yahoo Finance and SEC EDGAR. Nothing is estimated.",
    today: "today",
    tomorrow: "tomorrow",
    inDays: (days) => `in ${days} days`,
    filedAgo: (days) => (days === 0 ? "filed today" : `filed ${days} days ago`),
    exDividendTitle: (symbol) => `${symbol} goes ex-dividend`,
    exDividendBody: (when, date, payout) => `Ex-dividend ${when} (${date}). ${payout}`,
    secTitle: (symbol) => `${symbol} filed a new annual report (10-K)`,
    secBody: (periodEnd, filed) => `Fiscal year ended ${periodEnd}, filed ${filed}.`,
    viewFiling: "View filing",
    bellLabel: (count) => (count ? `Portfolio events (${count})` : "Portfolio events"),
    bellTitle: "Portfolio events",
    bellEmpty: "No new portfolio events.",
    bellViewAll: "Open all alerts",
  },
  bg: {
    calendarTitle: "Календар на потвърдените дивиденти",
    calendarDescription:
      "Предстоящи екс-дивидентни дати и дати на плащане, потвърдени от доставчика за твоите позиции, групирани по месеци.",
    calendarEmpty: "Няма потвърдени предстоящи дивидентни дати за твоите позиции.",
    calendarSource:
      "Показват се само потвърдени дати. Сумите използват последното потвърдено плащане на акция; непотвърдени плащания никога не се прогнозират.",
    exDate: "Екс-дивидент",
    payDate: "Плащане",
    perShare: "Последно потвърдено / акция",
    total: "Общо",
    monthTotal: "Общо за месеца",
    shares: "бр.",
    amountUnavailable: "Сумата не е налична",
    feedTitle: "Събития в портфолиото",
    feedDescription:
      "Потвърдени екс-дивидентни дати през следващите 7 дни и скорошни SEC 10-K отчети на компании, които притежаваш.",
    feedEmpty: "Няма предстоящи екс-дивидентни дати или нови 10-K отчети за твоите позиции.",
    feedLoading: "Проверяваме позициите ти…",
    feedSource: "Публични данни от Yahoo Finance и SEC EDGAR. Нищо не се прогнозира.",
    today: "днес",
    tomorrow: "утре",
    inDays: (days) => `след ${days} дни`,
    filedAgo: (days) => (days === 0 ? "подаден днес" : `подаден преди ${days} дни`),
    exDividendTitle: (symbol) => `${symbol} става екс-дивидент`,
    exDividendBody: (when, date, payout) => `Екс-дивидент ${when} (${date}). ${payout}`,
    secTitle: (symbol) => `${symbol} подаде нов годишен отчет (10-K)`,
    secBody: (periodEnd, filed) => `Финансова година до ${periodEnd}, подаден на ${filed}.`,
    viewFiling: "Виж отчета",
    bellLabel: (count) => (count ? `Събития в портфолиото (${count})` : "Събития в портфолиото"),
    bellTitle: "Събития в портфолиото",
    bellEmpty: "Няма нови събития в портфолиото.",
    bellViewAll: "Отвори всички известия",
  },
  de: {
    calendarTitle: "Kalender bestätigter Dividenden",
    calendarDescription:
      "Vom Anbieter bestätigte kommende Ex-Dividenden- und Zahltage deiner Positionen, nach Monaten gruppiert.",
    calendarEmpty: "Keine bestätigten kommenden Dividendentermine für deine Positionen.",
    calendarSource:
      "Es werden nur bestätigte Termine angezeigt. Beträge nutzen die zuletzt bestätigte Ausschüttung je Aktie; unbestätigte Zahlungen werden nie geschätzt.",
    exDate: "Ex-Tag",
    payDate: "Zahltag",
    perShare: "Zuletzt bestätigt / Aktie",
    total: "Gesamt",
    monthTotal: "Monatssumme",
    shares: "Stk.",
    amountUnavailable: "Betrag nicht verfügbar",
    feedTitle: "Portfolio-Ereignisse",
    feedDescription:
      "Bestätigte Ex-Dividenden-Termine der nächsten 7 Tage und neue SEC-10-K-Berichte der Unternehmen, die du hältst.",
    feedEmpty: "Keine anstehenden Ex-Tage oder neuen 10-K-Berichte für deine Positionen.",
    feedLoading: "Deine Positionen werden geprüft…",
    feedSource: "Öffentliche Daten von Yahoo Finance und SEC EDGAR. Nichts wird geschätzt.",
    today: "heute",
    tomorrow: "morgen",
    inDays: (days) => `in ${days} Tagen`,
    filedAgo: (days) => (days === 0 ? "heute eingereicht" : `vor ${days} Tagen eingereicht`),
    exDividendTitle: (symbol) => `${symbol} geht ex Dividende`,
    exDividendBody: (when, date, payout) => `Ex-Tag ${when} (${date}). ${payout}`,
    secTitle: (symbol) => `${symbol} hat einen neuen Jahresbericht (10-K) eingereicht`,
    secBody: (periodEnd, filed) => `Geschäftsjahr bis ${periodEnd}, eingereicht am ${filed}.`,
    viewFiling: "Bericht ansehen",
    bellLabel: (count) => (count ? `Portfolio-Ereignisse (${count})` : "Portfolio-Ereignisse"),
    bellTitle: "Portfolio-Ereignisse",
    bellEmpty: "Keine neuen Portfolio-Ereignisse.",
    bellViewAll: "Alle Alarme öffnen",
  },
  es: {
    calendarTitle: "Calendario de dividendos confirmados",
    calendarDescription:
      "Próximas fechas ex-dividendo y de pago confirmadas por el proveedor para tus posiciones, agrupadas por mes.",
    calendarEmpty: "No hay fechas de dividendos futuras confirmadas para tus posiciones.",
    calendarSource:
      "Solo se muestran fechas confirmadas. Los importes usan el último pago confirmado por acción; los pagos no confirmados nunca se estiman.",
    exDate: "Ex-dividendo",
    payDate: "Pago",
    perShare: "Último confirmado / acción",
    total: "Total",
    monthTotal: "Total del mes",
    shares: "acc.",
    amountUnavailable: "Importe no disponible",
    feedTitle: "Eventos de la cartera",
    feedDescription:
      "Fechas ex-dividendo confirmadas en los próximos 7 días e informes 10-K recientes de la SEC de las empresas que posees.",
    feedEmpty: "No hay fechas ex-dividendo próximas ni nuevos informes 10-K para tus posiciones.",
    feedLoading: "Comprobando tus posiciones…",
    feedSource: "Datos públicos de Yahoo Finance y SEC EDGAR. No se estima nada.",
    today: "hoy",
    tomorrow: "mañana",
    inDays: (days) => `en ${days} días`,
    filedAgo: (days) => (days === 0 ? "presentado hoy" : `presentado hace ${days} días`),
    exDividendTitle: (symbol) => `${symbol} cotiza ex-dividendo`,
    exDividendBody: (when, date, payout) => `Ex-dividendo ${when} (${date}). ${payout}`,
    secTitle: (symbol) => `${symbol} presentó un nuevo informe anual (10-K)`,
    secBody: (periodEnd, filed) => `Ejercicio cerrado el ${periodEnd}, presentado el ${filed}.`,
    viewFiling: "Ver informe",
    bellLabel: (count) => (count ? `Eventos de la cartera (${count})` : "Eventos de la cartera"),
    bellTitle: "Eventos de la cartera",
    bellEmpty: "No hay eventos nuevos en la cartera.",
    bellViewAll: "Abrir todas las alertas",
  },
  it: {
    calendarTitle: "Calendario dei dividendi confermati",
    calendarDescription:
      "Prossime date di stacco e di pagamento confermate dal provider per le tue posizioni, raggruppate per mese.",
    calendarEmpty: "Nessuna data di dividendo futura confermata per le tue posizioni.",
    calendarSource:
      "Sono mostrate solo date confermate. Gli importi usano l'ultimo pagamento confermato per azione; i pagamenti non confermati non vengono mai stimati.",
    exDate: "Stacco",
    payDate: "Pagamento",
    perShare: "Ultimo confermato / azione",
    total: "Totale",
    monthTotal: "Totale del mese",
    shares: "az.",
    amountUnavailable: "Importo non disponibile",
    feedTitle: "Eventi del portafoglio",
    feedDescription:
      "Date di stacco confermate nei prossimi 7 giorni e recenti report 10-K della SEC delle società che detieni.",
    feedEmpty: "Nessuno stacco imminente o nuovo 10-K per le tue posizioni.",
    feedLoading: "Controllo delle tue posizioni…",
    feedSource: "Dati pubblici da Yahoo Finance e SEC EDGAR. Nulla viene stimato.",
    today: "oggi",
    tomorrow: "domani",
    inDays: (days) => `tra ${days} giorni`,
    filedAgo: (days) => (days === 0 ? "depositato oggi" : `depositato ${days} giorni fa`),
    exDividendTitle: (symbol) => `${symbol} va in stacco dividendo`,
    exDividendBody: (when, date, payout) => `Stacco ${when} (${date}). ${payout}`,
    secTitle: (symbol) => `${symbol} ha depositato un nuovo bilancio annuale (10-K)`,
    secBody: (periodEnd, filed) => `Esercizio chiuso il ${periodEnd}, depositato il ${filed}.`,
    viewFiling: "Vedi documento",
    bellLabel: (count) => (count ? `Eventi del portafoglio (${count})` : "Eventi del portafoglio"),
    bellTitle: "Eventi del portafoglio",
    bellEmpty: "Nessun nuovo evento nel portafoglio.",
    bellViewAll: "Apri tutti gli avvisi",
  },
};
