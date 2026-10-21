import type { Lang } from "@/lib/i18n";

type PlanCopy = {
  compareTitle: string; compareSub: string; freeTag: string; proTag: string;
  groups: { title: string; free: string; pro: string }[];
  gateNote: string; yearlySave: string; seeWhat: string;
};

const en: PlanCopy = {
  compareTitle: "Free vs Pro", compareSub: "Free tracks your money with confidence. Pro helps you make better investing decisions.",
  freeTag: "Free", proTag: "Pro",
  groups: [
    { title: "Brokers & import", free: "1 broker, CSV import", pro: "Up to 4 brokers, import preview & duplicate checks" },
    { title: "Portfolio", free: "Net worth, P&L, holdings, live prices", pro: "Everything in Free" },
    { title: "Analytics", free: "Basic allocation & history", pro: "Heatmap, benchmark, risk & concentration insights" },
    { title: "Dividends", free: "Confirmed dividend events", pro: "Income matrix, yield on cost, income goals" },
    { title: "Research", free: "Search, news, key stats", pro: "DCF fair value, AI thesis check, AI advisor" },
    { title: "Planning", free: "Investment goals", pro: "FIRE calculator & scenarios" },
    { title: "Community", free: "—", pro: "Profile, shared allocation, private chat" },
  ],
  gateNote: "€4.99/month or €49.99/year", yearlySave: "Save 17% yearly", seeWhat: "See everything in Pro",
};

const bg: PlanCopy = {
  compareTitle: "Free срещу Pro", compareSub: "Free следи парите ти уверено. Pro ти помага да взимаш по-добри инвестиционни решения.",
  freeTag: "Free", proTag: "Pro",
  groups: [
    { title: "Брокери и импорт", free: "1 брокер, CSV импорт", pro: "До 4 брокера, преглед и проверка за дублирани сделки" },
    { title: "Портфолио", free: "Нетна стойност, P&L, позиции, реални цени", pro: "Всичко от Free" },
    { title: "Анализи", free: "Основни разпределения и история", pro: "Heatmap, сравнение с индекс, риск и концентрация" },
    { title: "Дивиденти", free: "Потвърдени дивидентни събития", pro: "Месечна матрица, yield on cost, цели за доход" },
    { title: "Проучване", free: "Търсене, новини, ключови показатели", pro: "DCF справедлива цена, AI проверка на теза, AI съветник" },
    { title: "Планиране", free: "Инвестиционни цели", pro: "FIRE калкулатор и сценарии" },
    { title: "Общност", free: "—", pro: "Профил, споделено разпределение, лични съобщения" },
  ],
  gateNote: "€4.99/месец или €49.99/година", yearlySave: "Спестяваш 17% годишно", seeWhat: "Виж всичко в Pro",
};

const de: PlanCopy = {
  compareTitle: "Free vs. Pro", compareSub: "Free verfolgt dein Vermögen zuverlässig. Pro hilft dir, bessere Anlageentscheidungen zu treffen.",
  freeTag: "Free", proTag: "Pro",
  groups: [
    { title: "Broker & Import", free: "1 Broker, CSV-Import", pro: "Bis zu 4 Broker, Importvorschau & Duplikatprüfung" },
    { title: "Portfolio", free: "Nettovermögen, G&V, Positionen, Live-Kurse", pro: "Alles aus Free" },
    { title: "Analysen", free: "Basis-Aufteilung & Verlauf", pro: "Heatmap, Benchmark, Risiko & Konzentration" },
    { title: "Dividenden", free: "Bestätigte Dividendentermine", pro: "Einkommensmatrix, Yield on Cost, Einkommensziele" },
    { title: "Research", free: "Suche, News, Kennzahlen", pro: "DCF-Fair-Value, KI-Thesencheck, KI-Berater" },
    { title: "Planung", free: "Anlageziele", pro: "FIRE-Rechner & Szenarien" },
    { title: "Community", free: "—", pro: "Profil, geteilte Aufteilung, private Chats" },
  ],
  gateNote: "€4,99/Monat oder €49,99/Jahr", yearlySave: "17% sparen jährlich", seeWhat: "Alles in Pro ansehen",
};

const es: PlanCopy = {
  compareTitle: "Free vs Pro", compareSub: "Free sigue tu dinero con confianza. Pro te ayuda a tomar mejores decisiones de inversión.",
  freeTag: "Free", proTag: "Pro",
  groups: [
    { title: "Brókers e importación", free: "1 bróker, importación CSV", pro: "Hasta 4 brókers, vista previa y control de duplicados" },
    { title: "Cartera", free: "Patrimonio, P&L, posiciones, precios en vivo", pro: "Todo lo de Free" },
    { title: "Análisis", free: "Distribución e historial básicos", pro: "Heatmap, índice de referencia, riesgo y concentración" },
    { title: "Dividendos", free: "Eventos de dividendos confirmados", pro: "Matriz de ingresos, yield on cost, metas de ingresos" },
    { title: "Investigación", free: "Búsqueda, noticias, datos clave", pro: "Valor justo DCF, revisión de tesis con IA, asesor IA" },
    { title: "Planificación", free: "Metas de inversión", pro: "Calculadora FIRE y escenarios" },
    { title: "Comunidad", free: "—", pro: "Perfil, distribución compartida, chat privado" },
  ],
  gateNote: "€4,99/mes o €49,99/año", yearlySave: "Ahorra 17% al año", seeWhat: "Ver todo en Pro",
};

const it: PlanCopy = {
  compareTitle: "Free vs Pro", compareSub: "Free monitora il tuo patrimonio con sicurezza. Pro ti aiuta a prendere decisioni d'investimento migliori.",
  freeTag: "Free", proTag: "Pro",
  groups: [
    { title: "Broker e import", free: "1 broker, import CSV", pro: "Fino a 4 broker, anteprima e controllo duplicati" },
    { title: "Portafoglio", free: "Patrimonio, P&L, posizioni, prezzi live", pro: "Tutto di Free" },
    { title: "Analisi", free: "Allocazione e storico di base", pro: "Heatmap, benchmark, rischio e concentrazione" },
    { title: "Dividendi", free: "Eventi di dividendo confermati", pro: "Matrice dei redditi, yield on cost, obiettivi di reddito" },
    { title: "Ricerca", free: "Ricerca, notizie, dati chiave", pro: "Fair value DCF, verifica tesi con IA, consulente IA" },
    { title: "Pianificazione", free: "Obiettivi d'investimento", pro: "Calcolatore FIRE e scenari" },
    { title: "Community", free: "—", pro: "Profilo, allocazione condivisa, chat privata" },
  ],
  gateNote: "€4,99/mese o €49,99/anno", yearlySave: "Risparmi il 17% all'anno", seeWhat: "Scopri tutto in Pro",
};

export const planCopy: Record<Lang, PlanCopy> = { en, bg, de, es, it };
