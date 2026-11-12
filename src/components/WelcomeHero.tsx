import { experienceCopy } from "@/lib/experience-i18n";
import { type Lang } from "@/lib/i18n";
import { usePortfolio } from "@/lib/store";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Eye, LineChart, PlusCircle, Search, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { SamplePortfolioPreview } from "./SamplePortfolioPreview";

type Copy = {
  morning: string;
  afternoon: string;
  evening: string;
  guestTitle: string;
  guestSub: string;
  signUp: string;
  explore: string;
  emptyTitle: string;
  emptySub: string;
  s1: string;
  s2: string;
  activeSub: string;
  sampleTitle: string;
  sampleSub: string;
  sampleLink: string;
  dataTrust: string;
  dataTrustLink: string;
  heroCaption: string;
  sampleValue: string;
  sampleGain: string;
  sampleHistory: string;
  markets: string;
  watchlist: string;
  analytics: string;
  import: string;
  quoteCoverage: (available: number, total: number) => string;
  staleQuoteCount: (count: number) => string;
  quoteIssueSummary: string;
  quoteUnavailableFor: string;
  quoteStaleFor: string;
  quoteGap: string;
  quoteError: string;
  quoteUnavailable: string;
  refreshQuotes: string;
};
const COPY: Record<Lang, Copy> = {
  en: {
    morning: "Good morning",
    afternoon: "Good afternoon",
    evening: "Good evening",
    guestTitle: "Portfolio from every broker, all in one place.",
    guestSub:
      "Import CSVs from Trading 212, IBKR or Revolut to track performance, allocation and dividends together. Pro includes an annual FIFO report of realized gains and losses; missing quotes are never guessed.",
    signUp: "Create free account",
    explore: "Explore markets",
    emptyTitle: "Let's build your portfolio",
    emptySub: "Choose how you want to get started:",
    s1: "Import a broker CSV",
    s2: "Or add a trade manually",
    activeSub: "Here's how your portfolio is doing today.",
    sampleTitle: "Want to see an example first?",
    sampleSub: "Explore a sample portfolio to see how holdings and allocation are presented.",
    sampleLink: "Try the demo without an account",
    dataTrust:
      "Quotes come from Yahoo Finance; missing historical data is never replaced with estimates.",
    dataTrustLink: "How market data works",
    heroCaption: "Sample portfolio with illustrative data",
    sampleValue: "Sample portfolio value",
    sampleGain: "Sample gain",
    sampleHistory: "Illustrative portfolio value history",
    markets: "Markets",
    watchlist: "Watchlist",
    analytics: "Analytics",
    import: "Import",
    quoteCoverage: (available, total) =>
      `Quotes available for ${available} of ${total} market holdings.`,
    staleQuoteCount: (count) =>
      `${count} quote${count === 1 ? "" : "s"} older than 96 hours; review before acting.`,
    quoteIssueSummary: "Review affected assets",
    quoteUnavailableFor: "Quote unavailable",
    quoteStaleFor: "Quote older than 96 hours",
    quoteGap: "Missing quotes are marked unavailable; prices are never estimated.",
    quoteError: "Quotes could not be refreshed. Your last saved transactions are unchanged.",
    quoteUnavailable: "Some provider quotes are currently unavailable.",
    refreshQuotes: "Refresh quotes",
  },
  bg: {
    morning: "Добро утро",
    afternoon: "Добър ден",
    evening: "Добър вечер",
    guestTitle: "Инвестициите от всички брокери — на едно място.",
    guestSub:
      "Импортирай CSV файлове от Trading 212, IBKR или Revolut и следи доходността, разпределението и дивидентите в общо портфолио. В Pro има годишна FIFO справка за реализираните печалби и загуби. Липсващите котировки не се заместват с измислени цени.",
    signUp: "Създай безплатен профил",
    explore: "Разгледай пазарите",
    emptyTitle: "Да изградим портфолиото ти",
    emptySub: "Избери как да започнеш:",
    s1: "Импортирай CSV от брокер",
    s2: "Или добави сделка ръчно",
    activeSub: "Ето как се представя портфолиото ти днес.",
    sampleTitle: "Искаш първо да разгледаш пример?",
    sampleSub: "Виж примерно портфолио, за да разбереш как изглеждат позициите и разпределението.",
    sampleLink: "Пробвай демото без регистрация",
    dataTrust:
      "Котировките идват от Yahoo Finance; липсващите исторически данни не се заместват с оценки.",
    dataTrustLink: "Как работят пазарните данни",
    heroCaption: "Примерно портфолио с илюстративни данни",
    sampleValue: "Примерна стойност на портфолиото",
    sampleGain: "Примерна печалба",
    sampleHistory: "Илюстративна история на стойността",
    markets: "Пазари",
    watchlist: "Watchlist",
    analytics: "Анализи",
    import: "Импорт",
    quoteCoverage: (available, total) =>
      `Има котировки за ${available} от ${total} пазарни позиции.`,
    staleQuoteCount: (count) =>
      `${count} ${count === 1 ? "котировка е" : "котировки са"} по-стара${count === 1 ? "" : "и"} от 96 часа; провери ги преди действие.`,
    quoteIssueSummary: "Провери засегнатите активи",
    quoteUnavailableFor: "Няма котировка",
    quoteStaleFor: "Котировка над 96 часа",
    quoteGap: "Липсващите котировки са отбелязани като недостъпни; цени не се оценяват.",
    quoteError: "Котировките не се обновиха. Записаните сделки не са променени.",
    quoteUnavailable: "В момента няма котировки от доставчика за някои позиции.",
    refreshQuotes: "Обнови котировките",
  },
  de: {
    morning: "Guten Morgen",
    afternoon: "Guten Tag",
    evening: "Guten Abend",
    guestTitle: "Deine Investments klar im Blick.",
    guestSub:
      "Importiere CSV-Dateien von Trading 212, IBKR oder Revolut und verfolge Wertentwicklung, Aufteilung und Dividenden an einem Ort. Pro enthält einen jährlichen FIFO-Bericht über realisierte Gewinne und Verluste; fehlende Kurse werden nicht geschätzt.",
    signUp: "Kostenloses Konto",
    explore: "Märkte entdecken",
    emptyTitle: "Bauen wir dein Portfolio auf",
    emptySub: "Wähle, wie du starten möchtest:",
    s1: "Broker-CSV importieren",
    s2: "Oder Trade manuell hinzufügen",
    activeSub: "So entwickelt sich dein Portfolio heute.",
    sampleTitle: "Möchtest du zuerst ein Beispiel sehen?",
    sampleSub: "Sieh dir ein Beispielportfolio mit Positionen und Aufteilung an.",
    sampleLink: "Demo ohne Registrierung ansehen",
    dataTrust:
      "Kurse stammen von Yahoo Finance; fehlende historische Daten werden nicht durch Schätzungen ersetzt.",
    dataTrustLink: "So funktionieren Marktdaten",
    heroCaption: "Beispielportfolio mit illustrativen Daten",
    sampleValue: "Beispielwert des Portfolios",
    sampleGain: "Beispielgewinn",
    sampleHistory: "Illustrativer Portfolioverlauf",
    markets: "Märkte",
    watchlist: "Watchlist",
    analytics: "Analysen",
    import: "Import",
    quoteCoverage: (available, total) =>
      `Kurse für ${available} von ${total} Marktpositionen verfügbar.`,
    staleQuoteCount: (count) =>
      `${count} ${count === 1 ? "Kurs ist" : "Kurse sind"} älter als 96 Stunden; bitte vor einer Aktion prüfen.`,
    quoteIssueSummary: "Betroffene Werte prüfen",
    quoteUnavailableFor: "Kurs nicht verfügbar",
    quoteStaleFor: "Kurs älter als 96 Stunden",
    quoteGap: "Fehlende Kurse werden als nicht verfügbar angezeigt; Preise werden nicht geschätzt.",
    quoteError:
      "Kurse konnten nicht aktualisiert werden. Gespeicherte Transaktionen bleiben unverändert.",
    quoteUnavailable: "Einige Anbieter-Kurse sind derzeit nicht verfügbar.",
    refreshQuotes: "Kurse aktualisieren",
  },
  es: {
    morning: "Buenos días",
    afternoon: "Buenas tardes",
    evening: "Buenas noches",
    guestTitle: "Tus inversiones, con claridad.",
    guestSub:
      "Importa archivos CSV de Trading 212, IBKR o Revolut para seguir la rentabilidad, la distribución y los dividendos en un solo lugar. Pro incluye un informe anual FIFO de ganancias y pérdidas realizadas; no estimamos cotizaciones ausentes.",
    signUp: "Crear cuenta gratis",
    explore: "Explorar mercados",
    emptyTitle: "Construyamos tu cartera",
    emptySub: "Elige cómo quieres empezar:",
    s1: "Importa un CSV del bróker",
    s2: "O añade una operación manual",
    activeSub: "Así va tu cartera hoy.",
    sampleTitle: "¿Quieres ver un ejemplo primero?",
    sampleSub:
      "Explora una cartera de ejemplo para ver cómo se muestran las posiciones y la distribución.",
    sampleLink: "Probar la demo sin registrarse",
    dataTrust:
      "Las cotizaciones proceden de Yahoo Finance; los datos históricos que faltan no se sustituyen por estimaciones.",
    dataTrustLink: "Cómo funcionan los datos de mercado",
    heroCaption: "Cartera de ejemplo con datos ilustrativos",
    sampleValue: "Valor de cartera de ejemplo",
    sampleGain: "Ganancia de ejemplo",
    sampleHistory: "Historial ilustrativo del valor",
    markets: "Mercados",
    watchlist: "Watchlist",
    analytics: "Análisis",
    import: "Importar",
    quoteCoverage: (available, total) =>
      `Hay cotizaciones para ${available} de ${total} posiciones de mercado.`,
    staleQuoteCount: (count) =>
      `${count} cotización${count === 1 ? " tiene" : "es tienen"} más de 96 horas; revísala${count === 1 ? "" : "s"} antes de actuar.`,
    quoteIssueSummary: "Revisar activos afectados",
    quoteUnavailableFor: "Cotización no disponible",
    quoteStaleFor: "Cotización de más de 96 horas",
    quoteGap: "Las cotizaciones ausentes aparecen como no disponibles; no se estiman precios.",
    quoteError:
      "No se pudieron actualizar las cotizaciones. Las operaciones guardadas no cambiaron.",
    quoteUnavailable: "Algunas cotizaciones del proveedor no están disponibles ahora.",
    refreshQuotes: "Actualizar cotizaciones",
  },
  it: {
    morning: "Buongiorno",
    afternoon: "Buon pomeriggio",
    evening: "Buonasera",
    guestTitle: "I tuoi investimenti, in modo chiaro.",
    guestSub:
      "Importa i CSV di Trading 212, IBKR o Revolut per seguire rendimento, allocazione e dividendi in un unico posto. Pro include un report annuale FIFO di plusvalenze e minusvalenze realizzate; le quotazioni mancanti non vengono stimate.",
    signUp: "Crea account gratis",
    explore: "Esplora i mercati",
    emptyTitle: "Costruiamo il tuo portafoglio",
    emptySub: "Scegli come vuoi iniziare:",
    s1: "Importa un CSV del broker",
    s2: "Oppure aggiungi un'operazione",
    activeSub: "Ecco come va il tuo portafoglio oggi.",
    sampleTitle: "Vuoi vedere prima un esempio?",
    sampleSub:
      "Esplora un portafoglio di esempio per vedere come vengono mostrate le posizioni e l'allocazione.",
    sampleLink: "Prova la demo senza registrazione",
    dataTrust:
      "Le quotazioni provengono da Yahoo Finance; i dati storici mancanti non vengono sostituiti con stime.",
    dataTrustLink: "Come funzionano i dati di mercato",
    heroCaption: "Portafoglio di esempio con dati illustrativi",
    sampleValue: "Valore del portafoglio di esempio",
    sampleGain: "Guadagno di esempio",
    sampleHistory: "Storico illustrativo del valore",
    markets: "Mercati",
    watchlist: "Watchlist",
    analytics: "Analisi",
    import: "Importa",
    quoteCoverage: (available, total) =>
      `Quotazioni disponibili per ${available} di ${total} posizioni di mercato.`,
    staleQuoteCount: (count) =>
      `${count} quotazione${count === 1 ? " è" : " sono"} più vecchia${count === 1 ? "" : "e"} di 96 ore; controlla prima di agire.`,
    quoteIssueSummary: "Controlla gli asset interessati",
    quoteUnavailableFor: "Quotazione non disponibile",
    quoteStaleFor: "Quotazione oltre 96 ore",
    quoteGap: "Le quotazioni mancanti risultano non disponibili; i prezzi non vengono stimati.",
    quoteError:
      "Impossibile aggiornare le quotazioni. Le operazioni salvate non sono state modificate.",
    quoteUnavailable: "Alcune quotazioni del fornitore non sono disponibili.",
    refreshQuotes: "Aggiorna quotazioni",
  },
};

const chip =
  "press inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent";
const GOAL_LABEL: Record<Lang, string> = {
  en: "Set your first investment goal",
  bg: "Задай първата си инвестиционна цел",
  de: "Lege dein erstes Anlageziel fest",
  es: "Define tu primer objetivo de inversión",
  it: "Imposta il tuo primo obiettivo d'investimento",
};

export function WelcomeHero() {
  const p = usePortfolio();
  const c = COPY[p.lang] ?? COPY.en;
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => setHour(new Date().getHours()), []);
  const greet = hour === null ? "" : hour < 12 ? c.morning : hour < 18 ? c.afternoon : c.evening;
  const meta = p.user?.user_metadata;
  const name =
    p.displayName.trim() ||
    (meta?.["display_name"] as string | undefined) ||
    (meta?.["full_name"] as string | undefined) ||
    (meta?.["name"] as string | undefined) ||
    undefined;

  if (!p.user)
    return (
      <section className="rise hover-lift-card grid items-center gap-6 rounded-3xl border border-border bg-card p-4 sm:p-6 md:p-7 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <h1 className="font-display max-w-4xl text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
            {experienceCopy[p.lang].heroTitle}
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
            {experienceCopy[p.lang].heroSub}
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="hero-cta press inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2 font-semibold transition-[transform,box-shadow,filter] hover:-translate-y-0.5"
            >
              {c.signUp}
              <ArrowRight className="size-4" />
            </Link>
            <Link to="/demo" className={`${chip} min-h-11 px-5`}>
              <Eye className="size-4" />
              {c.sampleLink}
            </Link>
          </div>
        </div>
        <SamplePortfolioPreview lang={p.lang} />
      </section>
    );

  if (!p.holdings.length)
    return (
      <section className="rise rounded-3xl border border-border bg-card p-4 sm:p-6 md:p-7">
        <p className="text-sm text-muted-foreground">
          {greet}
          {name ? `, ${name}` : ""}
        </p>
        <h1 className="font-display mt-1 text-balance text-2xl font-bold leading-tight md:text-4xl">
          {c.emptyTitle}
        </h1>
        <p className="mt-2 leading-relaxed text-muted-foreground">{c.emptySub}</p>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          <Link
            to="/brokers"
            className="card-interactive press flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-background/60 p-4"
          >
            <span className="grid size-9 place-items-center rounded-full bg-foreground/10 text-foreground">
              <Upload className="size-4" />
            </span>
            <span className="font-medium">{c.s1}</span>
          </Link>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("folio-open-add-transaction"))}
            className="card-interactive press flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-background/60 p-4 text-left"
          >
            <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
              <PlusCircle className="size-4" />
            </span>
            <span className="font-medium">{c.s2}</span>
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-border bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">{c.sampleTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{c.sampleSub}</p>
          </div>
          <Link to="/demo" className={`${chip} min-h-10 shrink-0 justify-center px-4`}>
            <Eye className="size-4" />
            {c.sampleLink}
          </Link>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          <Link to="/tools" className="font-semibold text-primary hover:underline">
            {GOAL_LABEL[p.lang]}
          </Link>
        </p>
      </section>
    );

  return (
    <section className="rise flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">
          {greet}
          {name ? `, ${name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">{c.activeSub}</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link to="/markets" className={chip}>
          <Search className="size-4" />
          {c.markets}
        </Link>
        <Link to="/watchlist" className={chip}>
          <Eye className="size-4" />
          {c.watchlist}
        </Link>
        <Link to="/analytics" className={chip}>
          <LineChart className="size-4" />
          {c.analytics}
        </Link>
        <Link to="/brokers" className={chip}>
          <Upload className="size-4" />
          {c.import}
        </Link>
      </div>
    </section>
  );
}
