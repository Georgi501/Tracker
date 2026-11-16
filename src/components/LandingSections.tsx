import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Building2,
  ChartNoAxesCombined,
  CheckCircle2,
  Coins,
  Compass,
  Database,
  FileSpreadsheet,
  LockKeyhole,
  ShieldCheck,
  Target,
  TrendingUp,
} from "lucide-react";
import { usePortfolio } from "@/lib/store";
import type { Lang } from "@/lib/i18n";

type FeaturePath = "/features" | "/dividends" | "/tools" | "/pricing" | "/markets";
type LandingCopy = {
  stepsEyebrow: string;
  stepsTitle: string;
  stepsIntro: string;
  trading212Guide: string;
  ibkrGuide: string;
  revolutGuide: string;
  steps: { title: string; body: string }[];
  featuresTitle: string;
  features: {
    title: string;
    badge?: string;
    body: string;
    href: FeaturePath;
    hash?: "methodology";
    link: string;
  }[];
  trustTitle: string;
  methodologyLink: string;
  trust: { title: string; body: string }[];
  finalTitle: string;
  finalBody: string;
  signup: string;
  demo: string;
};

const COPY: Record<Lang, LandingCopy> = {
  en: {
    stepsEyebrow: "How it works",
    stepsTitle: "Get started in three steps",
    stepsIntro: "Broker CSV imports are free—bring your investments into one clear view.",
    trading212Guide: "Trading 212 CSV guide",
    ibkrGuide: "Interactive Brokers CSV guide",
    revolutGuide: "Revolut CSV guide",
    steps: [
      { title: "Add your activity", body: "Import a broker CSV or record a transaction manually." },
      {
        title: "See your portfolio",
        body: "Review holdings, allocation, dividends and portfolio history.",
      },
      {
        title: "Make sense of performance",
        body: "Compare cash-flow-adjusted returns and explore your goals.",
      },
    ],
    featuresTitle: "A clearer picture of your investments",
    features: [
      {
        title: "Portfolio performance",
        badge: "TTWROR · IRR · Benchmarks",
        body: "Follow dated history and compare cash-flow-adjusted returns with selected market indices.",
        href: "/features",
        hash: "methodology",
        link: "How calculations work",
      },
      {
        title: "Full company analysis",
        badge: "SEC 10-K · DCF",
        body: "Full company profiles for 2 companies per week with DCF included. Standalone DCF is Pro.",
        href: "/pricing",
        link: "Compare plans",
      },
      {
        title: "Dividends and activity",
        body: "Keep transaction history together with confirmed dividend schedules.",
        href: "/dividends",
        link: "Explore dividends",
      },
      {
        title: "Goals and planning",
        body: "Set a target and explore transparent scenarios based on your assumptions.",
        href: "/tools",
        link: "Explore investor tools",
      },
      {
        title: "Market data, with limits",
        body: "Live provider quotes and historical closes; missing data is never estimated.",
        href: "/markets",
        link: "Explore live markets",
      },
    ],
    trustTitle: "Built to be clear about data and privacy",
    methodologyLink: "Read the methodology",
    trust: [
      {
        title: "Your portfolio is private",
        body: "Portfolio records are scoped to your account. Sharing is optional.",
      },
      {
        title: "Sources are disclosed",
        body: "Quotes use Yahoo Finance and may be delayed or unavailable.",
      },
      {
        title: "No made-up history",
        body: "Missing prices, exchange rates or split reconciliation can make a chart unavailable.",
      },
    ],
    finalTitle: "Ready to see your portfolio more clearly?",
    finalBody: "Start with a free account, or look around the sample portfolio first.",
    signup: "Create a free account",
    demo: "Explore the sample portfolio",
  },
  bg: {
    stepsEyebrow: "Как работи",
    stepsTitle: "Започни в три стъпки",
    stepsIntro: "Импортът на CSV от брокер е безплатен — събери инвестициите си на едно място.",
    trading212Guide: "Ръководство за CSV от Trading 212",
    ibkrGuide: "Ръководство за CSV от Interactive Brokers",
    revolutGuide: "Ръководство за CSV от Revolut",
    steps: [
      { title: "Добави сделките си", body: "Импортирай CSV от брокер или въведи сделка ръчно." },
      {
        title: "Виж портфолиото си",
        body: "Прегледай позиции, разпределение, дивиденти и история.",
      },
      {
        title: "Разбери представянето",
        body: "Сравни доходността с корекция за паричните потоци и разгледай целите си.",
      },
    ],
    featuresTitle: "По-ясна картина на инвестициите ти",
    features: [
      {
        title: "Представяне на портфейла",
        badge: "TTWROR · IRR · Индекси",
        body: "Проследявай датираната история и сравнявай доходността с избрани пазарни индекси.",
        href: "/features",
        hash: "methodology",
        link: "Как се изчислява",
      },
      {
        title: "Пълен анализ на компании",
        badge: "SEC 10-K · DCF",
        body: "Пълни профили на 2 компании седмично с вграден DCF. Самостоятелният DCF е Pro.",
        href: "/pricing",
        link: "Сравни плановете",
      },
      {
        title: "Дивиденти и сделки",
        body: "Съхранявай историята на сделките заедно с потвърдените дивиденти.",
        href: "/dividends",
        link: "Разгледай дивидентите",
      },
      {
        title: "Цели и планиране",
        body: "Задай цел и разгледай прозрачни сценарии според собствените си допускания.",
        href: "/tools",
        link: "Разгледай инструментите",
      },
      {
        title: "Пазарни данни с ясни ограничения",
        body: "Котировки и исторически цени от доставчика; липсващите данни не се измислят.",
        href: "/markets",
        link: "Разгледай пазарите",
      },
    ],
    trustTitle: "Яснота за данните и поверителността",
    methodologyLink: "Прочети методологията",
    trust: [
      {
        title: "Портфолиото ти е лично",
        body: "Записите в портфейла са ограничени до твоя профил. Споделянето е по избор.",
      },
      {
        title: "Източниците са посочени",
        body: "Котировките идват от Yahoo Finance и може да са забавени или недостъпни.",
      },
      {
        title: "Без измислена история",
        body: "Липсващи цени, валутни курсове или несъгласувани сплитове могат да направят графиката недостъпна.",
      },
    ],
    finalTitle: "Готов ли си да виждаш портфолиото си по-ясно?",
    finalBody: "Започни с безплатен профил или първо разгледай примерното портфолио.",
    signup: "Създай безплатен профил",
    demo: "Разгледай примерното портфолио",
  },
  de: {
    stepsEyebrow: "So funktioniert's",
    stepsTitle: "In drei Schritten starten",
    stepsIntro: "Broker-CSV-Importe sind kostenlos – bringe deine Anlagen übersichtlich zusammen.",
    trading212Guide: "Trading 212 CSV-Anleitung",
    ibkrGuide: "Interactive Brokers CSV-Anleitung",
    revolutGuide: "Revolut CSV-Anleitung",
    steps: [
      {
        title: "Aktivitäten hinzufügen",
        body: "Importiere eine Broker-CSV oder erfasse Transaktionen manuell.",
      },
      { title: "Portfolio ansehen", body: "Prüfe Positionen, Aufteilung, Dividenden und Verlauf." },
      {
        title: "Wertentwicklung verstehen",
        body: "Vergleiche cashflowbereinigte Renditen und erkunde deine Ziele.",
      },
    ],
    featuresTitle: "Ein klareres Bild deiner Anlagen",
    features: [
      {
        title: "Portfolio-Performance",
        badge: "TTWROR · IRR · Indizes",
        body: "Verfolge den datierten Verlauf und vergleiche die Rendite mit ausgewählten Marktindizes.",
        href: "/features",
        hash: "methodology",
        link: "Berechnung verstehen",
      },
      {
        title: "Vollständige Unternehmensanalysen",
        badge: "SEC 10-K · DCF",
        body: "Vollständige Profile für 2 Unternehmen pro Woche inkl. DCF. Eigenständiger DCF ist Pro.",
        href: "/pricing",
        link: "Tarife vergleichen",
      },
      {
        title: "Dividenden und Aktivitäten",
        body: "Behalte Transaktionsverlauf und bestätigte Dividenden zusammen im Blick.",
        href: "/dividends",
        link: "Dividenden entdecken",
      },
      {
        title: "Ziele und Planung",
        body: "Lege ein Ziel fest und prüfe transparente Szenarien mit deinen Annahmen.",
        href: "/tools",
        link: "Anleger-Tools ansehen",
      },
      {
        title: "Marktdaten mit klaren Grenzen",
        body: "Anbieter-Kurse und historische Preise; fehlende Daten werden nie geschätzt.",
        href: "/markets",
        link: "Märkte entdecken",
      },
    ],
    trustTitle: "Klarheit bei Daten und Datenschutz",
    methodologyLink: "Methodik lesen",
    trust: [
      {
        title: "Dein Portfolio bleibt privat",
        body: "Portfoliodaten sind deinem Konto zugeordnet. Teilen ist optional.",
      },
      {
        title: "Quellen werden genannt",
        body: "Kurse stammen von Yahoo Finance und können verzögert oder nicht verfügbar sein.",
      },
      {
        title: "Keine erfundene Historie",
        body: "Fehlende Kurse, Wechselkurse oder nicht abgeglichene Splits können ein Diagramm verhindern.",
      },
    ],
    finalTitle: "Möchtest du dein Portfolio klarer sehen?",
    finalBody: "Erstelle ein kostenloses Konto oder sieh dir zuerst das Beispielportfolio an.",
    signup: "Kostenloses Konto erstellen",
    demo: "Beispielportfolio ansehen",
  },
  es: {
    stepsEyebrow: "Cómo funciona",
    stepsTitle: "Empieza en tres pasos",
    stepsIntro: "Importar CSV de un bróker es gratis: reúne tus inversiones en una vista clara.",
    trading212Guide: "Guía de CSV de Trading 212",
    ibkrGuide: "Guía de CSV de Interactive Brokers",
    revolutGuide: "Guía de CSV de Revolut",
    steps: [
      {
        title: "Añade tu actividad",
        body: "Importa un CSV del bróker o registra una operación manualmente.",
      },
      {
        title: "Consulta tu cartera",
        body: "Revisa posiciones, distribución, dividendos e historial.",
      },
      {
        title: "Entiende el rendimiento",
        body: "Compara rentabilidades ajustadas por flujos y explora tus objetivos.",
      },
    ],
    featuresTitle: "Una visión más clara de tus inversiones",
    features: [
      {
        title: "Rendimiento de cartera",
        badge: "TTWROR · IRR · Índices",
        body: "Sigue el historial fechado y compara la rentabilidad con índices seleccionados.",
        href: "/features",
        hash: "methodology",
        link: "Cómo se calcula",
      },
      {
        title: "Análisis completos de empresas",
        badge: "SEC 10-K · DCF",
        body: "Perfiles completos de 2 empresas por semana con DCF incluido. El DCF independiente es Pro.",
        href: "/pricing",
        link: "Comparar planes",
      },
      {
        title: "Dividendos y actividad",
        body: "Mantén el historial de operaciones junto con los dividendos confirmados.",
        href: "/dividends",
        link: "Explorar dividendos",
      },
      {
        title: "Objetivos y planificación",
        body: "Define un objetivo y consulta escenarios transparentes con tus hipótesis.",
        href: "/tools",
        link: "Explorar herramientas",
      },
      {
        title: "Datos de mercado con límites claros",
        body: "Cotizaciones e historial del proveedor; los datos que faltan no se estiman.",
        href: "/markets",
        link: "Explorar mercados",
      },
    ],
    trustTitle: "Claridad sobre datos y privacidad",
    methodologyLink: "Leer metodología",
    trust: [
      {
        title: "Tu cartera es privada",
        body: "Los registros de cartera están asociados a tu cuenta. Compartir es opcional.",
      },
      {
        title: "Fuentes transparentes",
        body: "Las cotizaciones proceden de Yahoo Finance y pueden tener retraso o no estar disponibles.",
      },
      {
        title: "Sin historial inventado",
        body: "La falta de precios, divisas o conciliación de splits puede impedir mostrar un gráfico.",
      },
    ],
    finalTitle: "¿Listo para ver tu cartera con más claridad?",
    finalBody: "Crea una cuenta gratis o explora primero la cartera de ejemplo.",
    signup: "Crear cuenta gratis",
    demo: "Ver cartera de ejemplo",
  },
  it: {
    stepsEyebrow: "Come funziona",
    stepsTitle: "Inizia in tre passaggi",
    stepsIntro:
      "Importare un CSV del broker è gratis: riunisci i tuoi investimenti in una vista chiara.",
    trading212Guide: "Guida CSV di Trading 212",
    ibkrGuide: "Guida CSV di Interactive Brokers",
    revolutGuide: "Guida CSV di Revolut",
    steps: [
      {
        title: "Aggiungi le attività",
        body: "Importa un CSV del broker o registra un'operazione manualmente.",
      },
      {
        title: "Visualizza il portafoglio",
        body: "Esamina posizioni, allocazione, dividendi e storico.",
      },
      {
        title: "Comprendi il rendimento",
        body: "Confronta rendimenti corretti per i flussi ed esplora i tuoi obiettivi.",
      },
    ],
    featuresTitle: "Una visione più chiara dei tuoi investimenti",
    features: [
      {
        title: "Rendimento del portafoglio",
        badge: "TTWROR · IRR · Indici",
        body: "Segui lo storico datato e confronta i rendimenti con gli indici selezionati.",
        href: "/features",
        hash: "methodology",
        link: "Come si calcola",
      },
      {
        title: "Analisi aziendali complete",
        badge: "SEC 10-K · DCF",
        body: "Profili completi di 2 aziende a settimana con DCF incluso. Il DCF autonomo è Pro.",
        href: "/pricing",
        link: "Confronta i piani",
      },
      {
        title: "Dividendi e attività",
        body: "Conserva insieme lo storico operazioni e i dividendi confermati.",
        href: "/dividends",
        link: "Esplora i dividendi",
      },
      {
        title: "Obiettivi e pianificazione",
        body: "Imposta un obiettivo ed esplora scenari trasparenti sulle tue ipotesi.",
        href: "/tools",
        link: "Esplora gli strumenti",
      },
      {
        title: "Dati di mercato con limiti chiari",
        body: "Quotazioni e prezzi storici del fornitore; i dati mancanti non vengono stimati.",
        href: "/markets",
        link: "Esplora i mercati",
      },
    ],
    trustTitle: "Chiarezza su dati e privacy",
    methodologyLink: "Leggi la metodologia",
    trust: [
      {
        title: "Il portafoglio è privato",
        body: "I dati del portafoglio sono associati al tuo account. La condivisione è facoltativa.",
      },
      {
        title: "Fonti dichiarate",
        body: "Le quotazioni provengono da Yahoo Finance e possono essere ritardate o non disponibili.",
      },
      {
        title: "Nessuno storico inventato",
        body: "Dati mancanti, cambi o split non riconciliati possono rendere indisponibile un grafico.",
      },
    ],
    finalTitle: "Pronto a vedere il tuo portafoglio più chiaramente?",
    finalBody: "Crea un account gratuito o visita prima il portafoglio di esempio.",
    signup: "Crea un account gratuito",
    demo: "Visualizza il portafoglio di esempio",
  },
};

const STEP_ICONS = [FileSpreadsheet, ChartNoAxesCombined, Target];
const STEP_LINKS = ["/import-demo", "/demo", "/etf-overlap"] as const;

export function LandingSteps() {
  const { lang } = usePortfolio();
  const c = COPY[lang];
  const guides = [
    { to: "/trading212-import", label: c.trading212Guide },
    { to: "/ibkr-import", label: c.ibkrGuide },
    { to: "/revolut-import", label: c.revolutGuide },
  ] as const;
  return (
    <section
      aria-labelledby="landing-steps"
      className="rounded-2xl border border-border bg-card/50 p-4 shadow-[var(--shadow-card)] sm:p-6 lg:col-span-3"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            {c.stepsEyebrow}
          </p>
          <h2
            id="landing-steps"
            className="mt-1 font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl"
          >
            {c.stepsTitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{c.stepsIntro}</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {guides.map((guide) => (
            <Link
              key={guide.to}
              to={guide.to}
              className="group inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>{guide.label}</span>
              <ArrowRight
                size={13}
                aria-hidden="true"
                className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
              />
            </Link>
          ))}
        </div>
      </div>
      <ol className="mt-4 grid gap-3 md:grid-cols-3">
        {c.steps.map((step, index) => {
          const Icon = STEP_ICONS[index] ?? Target;
          const stepHref = STEP_LINKS[index] ?? "/demo";
          return (
            <li key={step.title}>
              <Link
                to={stepHref}
                className="group flex h-full flex-col rounded-xl border border-border/80 bg-card/80 p-4 transition-all hover:border-primary/50 hover:bg-card hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary ring-1 ring-inset ring-primary/25 transition-colors group-hover:bg-primary/18">
                      <Icon size={16} aria-hidden="true" />
                    </span>
                    <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-bold tracking-wider text-primary tabular-nums ring-1 ring-inset ring-primary/25">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <ArrowUpRight
                    size={15}
                    aria-hidden="true"
                    className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
                  />
                </div>
                <h3 className="mt-2.5 font-display text-sm font-semibold tracking-tight text-foreground sm:text-[15px]">
                  {step.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

const FEATURE_ICONS = [TrendingUp, Building2, Coins, Compass, Activity] as const;
const TRUST_ICONS = [ShieldCheck, Database, CheckCircle2] as const;

export function LandingSections() {
  const { lang } = usePortfolio();
  const c = COPY[lang];
  return (
    <div className="space-y-6 lg:col-span-3">
      <section aria-labelledby="landing-features" className="space-y-3">
        <h2
          id="landing-features"
          className="font-display text-center text-xl font-bold tracking-tight sm:text-2xl"
        >
          {c.featuresTitle}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {c.features.map((feature, index) => {
            const Icon = FEATURE_ICONS[index] ?? TrendingUp;
            const isFeatured = index < 2;
            return (
              <Link
                key={feature.title}
                to={feature.href}
                {...(feature.hash ? { hash: feature.hash } : {})}
                className={`group flex h-full flex-col rounded-2xl border border-border/75 bg-card/75 p-4 shadow-[var(--shadow-card)] transition-colors hover:border-primary/50 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isFeatured ? "lg:col-span-3" : "lg:col-span-2"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary ring-1 ring-inset ring-primary/25 transition-colors group-hover:bg-primary/18">
                      <Icon size={15} aria-hidden="true" />
                    </span>
                    <h3 className="font-display text-sm font-semibold tracking-tight text-foreground sm:text-base">
                      {feature.title}
                    </h3>
                  </div>
                  {feature.badge && (
                    <span className="shrink-0 rounded-full border border-border/80 bg-secondary/60 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-muted-foreground">
                      {feature.badge}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {feature.body}
                </p>
                <span className="mt-2.5 inline-flex w-fit items-center gap-1 text-xs font-semibold text-primary sm:text-sm">
                  {feature.link}
                  <ArrowRight
                    size={14}
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section
        aria-labelledby="landing-trust"
        className="rounded-2xl border border-border bg-card/50 p-4 shadow-[var(--shadow-card)] sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3.5">
          <div className="flex items-center gap-2">
            <LockKeyhole className="text-primary" size={17} aria-hidden="true" />
            <h2 id="landing-trust" className="font-display text-lg font-bold tracking-tight">
              {c.trustTitle}
            </h2>
          </div>
          <Link
            to="/features"
            hash="methodology"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline sm:text-sm"
          >
            {c.methodologyLink}
            <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-4 grid divide-y divide-border/60 md:grid-cols-3 md:divide-x md:divide-y-0">
          {c.trust.map((item, index) => {
            const Icon = TRUST_ICONS[index] ?? ShieldCheck;
            return (
              <div
                key={item.title}
                className="py-3 first:pt-0 last:pb-0 md:px-5 md:py-1 md:first:pl-0 md:last:pr-0"
              >
                <div className="flex items-center gap-2">
                  <Icon size={15} aria-hidden="true" className="shrink-0 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border/80 bg-card/60 p-5 text-center shadow-[var(--shadow-card)] sm:p-6">
        <h2 className="font-display text-balance text-xl font-bold tracking-tight sm:text-2xl">
          {c.finalTitle}
        </h2>
        <p className="mx-auto mt-1.5 max-w-xl text-sm text-muted-foreground">{c.finalBody}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2.5">
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {c.signup}
            <ArrowRight size={15} aria-hidden />
          </Link>
          <Link
            to="/demo"
            className="inline-flex min-h-11 items-center rounded-full border border-border bg-background/70 px-5 py-2 text-sm font-semibold hover:bg-secondary"
          >
            {c.demo}
          </Link>
        </div>
      </section>
    </div>
  );
}
