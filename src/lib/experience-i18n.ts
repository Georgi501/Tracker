import type { Lang } from "./i18n";
type ExperienceCopy = {
  heroTitle: string;
  heroSub: string;
  showDetails: string;
  hideDetails: string;
  freeBenefits: string[];
  proBenefits: string[];
  planDetails: string;
  steps: readonly [string, string, string];
  demoGuide: string;
  importHint: string;
  signup: string;
  sample: string;
  signin: string;
};
export const experienceCopy: Record<Lang, ExperienceCopy> = {
  en: {
    heroTitle: "Your investments. One clear picture.",
    heroSub: "Bring your brokers together. Understand your performance, allocation and dividends.",
    showDetails: "Show detailed metrics",
    hideDetails: "Hide detailed metrics",
    freeBenefits: [
      "Unlimited CSV imports and manual trades",
      "Portfolio performance and allocation",
      "Dividends, watchlist and goals",
      "Company research with a weekly allowance",
    ],
    proBenefits: [
      "Everything in Free",
      "Read-only IBKR & Trading 212 sync",
      "Unlimited company research and DCF",
      "FIFO reports, deeper analytics and AI",
    ],
    planDetails: "Full benefits and research limits",
    steps: ["Inspect performance", "Explore holdings", "Try sample import"],
    demoGuide: "Explore the sample in three steps",
    importHint: "Preview a sample CSV safely. Nothing is added to your portfolio.",
    signup: "Create free account",
    sample: "Explore demo",
    signin: "Sign in",
  },
  bg: {
    heroTitle: "Инвестициите ти. Една ясна картина.",
    heroSub:
      "Събери брокерите си на едно място. Разбери доходността, разпределението и дивидентите си.",
    showDetails: "Покажи подробните показатели",
    hideDetails: "Скрий подробните показатели",
    freeBenefits: [
      "Неограничен CSV импорт и ръчни сделки",
      "Доходност и разпределение на портфолиото",
      "Дивиденти, списък за наблюдение и цели",
      "Анализи на компании със седмичен лимит",
    ],
    proBenefits: [
      "Всичко от Free",
      "IBKR и Trading 212 синхронизация само за четене",
      "Неограничени анализи на компании и DCF",
      "FIFO отчети, задълбочени анализи и AI",
    ],
    planDetails: "Всички предимства и лимити за анализи",
    steps: ["Разгледай доходността", "Разгледай позициите", "Пробвай примерен импорт"],
    demoGuide: "Разгледай примера в три стъпки",
    importHint: "Прегледай безопасно примерен CSV. Нищо не се добавя към портфолиото ти.",
    signup: "Създай безплатен профил",
    sample: "Разгледай демото",
    signin: "Вход",
  },
  de: {
    heroTitle: "Deine Anlagen. Ein klares Bild.",
    heroSub: "Führe deine Broker zusammen. Verstehe Rendite, Aufteilung und Dividenden.",
    showDetails: "Detaillierte Kennzahlen anzeigen",
    hideDetails: "Detaillierte Kennzahlen ausblenden",
    freeBenefits: [
      "Unbegrenzte CSV-Importe und manuelle Trades",
      "Portfoliorendite und Aufteilung",
      "Dividenden, Watchlist und Ziele",
      "Unternehmensanalysen mit Wochenlimit",
    ],
    proBenefits: [
      "Alles aus Free",
      "IBKR & Trading 212 Synchronisierung mit Lesezugriff",
      "Unbegrenzte Analysen und DCF",
      "FIFO-Berichte, erweiterte Analysen und KI",
    ],
    planDetails: "Alle Vorteile und Analyselimits",
    steps: ["Rendite ansehen", "Positionen erkunden", "Beispielimport testen"],
    demoGuide: "Das Beispiel in drei Schritten erkunden",
    importHint: "Beispiel-CSV sicher ansehen. Deinem Portfolio wird nichts hinzugefügt.",
    signup: "Kostenloses Konto erstellen",
    sample: "Demo erkunden",
    signin: "Anmelden",
  },
  es: {
    heroTitle: "Tus inversiones. Una visión clara.",
    heroSub: "Reúne tus brókeres. Comprende rentabilidad, distribución y dividendos.",
    showDetails: "Mostrar métricas detalladas",
    hideDetails: "Ocultar métricas detalladas",
    freeBenefits: [
      "Importaciones CSV y operaciones manuales ilimitadas",
      "Rentabilidad y distribución",
      "Dividendos, seguimiento y objetivos",
      "Análisis de empresas con límite semanal",
    ],
    proBenefits: [
      "Todo lo de Free",
      "Sincronización de solo lectura con IBKR y Trading 212",
      "Análisis de empresas y DCF ilimitados",
      "Informes FIFO, análisis avanzados e IA",
    ],
    planDetails: "Ventajas y límites de análisis",
    steps: ["Examinar rentabilidad", "Explorar posiciones", "Probar importación"],
    demoGuide: "Explora el ejemplo en tres pasos",
    importHint: "Revisa un CSV de ejemplo de forma segura. No se añade nada a tu cartera.",
    signup: "Crear cuenta gratuita",
    sample: "Explorar demo",
    signin: "Iniciar sesión",
  },
  it: {
    heroTitle: "I tuoi investimenti. Una visione chiara.",
    heroSub: "Riunisci i tuoi broker. Comprendi rendimento, allocazione e dividendi.",
    showDetails: "Mostra metriche dettagliate",
    hideDetails: "Nascondi metriche dettagliate",
    freeBenefits: [
      "Importazioni CSV e operazioni manuali illimitate",
      "Rendimento e allocazione",
      "Dividendi, watchlist e obiettivi",
      "Analisi aziendali con limite settimanale",
    ],
    proBenefits: [
      "Tutto di Free",
      "Sincronizzazione in sola lettura con IBKR e Trading 212",
      "Analisi aziendali e DCF illimitati",
      "Report FIFO, analisi avanzate e IA",
    ],
    planDetails: "Vantaggi e limiti delle analisi",
    steps: ["Esamina il rendimento", "Esplora le posizioni", "Prova l’importazione"],
    demoGuide: "Esplora l’esempio in tre passaggi",
    importHint: "Esamina un CSV di esempio in sicurezza. Nulla viene aggiunto al portafoglio.",
    signup: "Crea account gratuito",
    sample: "Esplora demo",
    signin: "Accedi",
  },
};
