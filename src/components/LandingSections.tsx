import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ChartNoAxesCombined,
  FileSpreadsheet,
  LockKeyhole,
  Target,
} from "lucide-react";
import { Card } from "@/components/AppShell";
import { usePortfolio } from "@/lib/store";
import type { Lang } from "@/lib/i18n";

type FeaturePath = "/features" | "/dividends" | "/tools" | "/pricing";
type LandingCopy = {
  stepsTitle: string;
  stepsIntro: string;
  steps: { title: string; body: string }[];
  featuresTitle: string;
  features: {
    title: string;
    body: string;
    href: FeaturePath;
    hash?: "methodology";
    link: string;
  }[];
  trustTitle: string;
  trust: { title: string; body: string }[];
  finalTitle: string;
  finalBody: string;
  signup: string;
  demo: string;
};

const COPY: Record<Lang, LandingCopy> = {
  en: {
    stepsTitle: "Get started in three steps",
    stepsIntro: "A simple way to bring your investments into one clear view.",
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
        body: "Follow dated history and compare portfolio performance with selected market indices.",
        href: "/features",
        hash: "methodology",
        link: "How calculations work",
      },
      {
        title: "Dividends and activity",
        body: "Keep transaction history together with confirmed dividend information.",
        href: "/dividends",
        link: "Explore dividends",
      },
      {
        title: "Goals and planning",
        body: "Set a target and explore transparent scenarios based on your own assumptions.",
        href: "/tools",
        link: "Explore investor tools",
      },
      {
        title: "Market data, with limits",
        body: "See provider quotes and historical prices; missing data is not filled with estimates.",
        href: "/features",
        hash: "methodology",
        link: "Read the methodology",
      },
      {
        title: "Full company analysis",
        body: "Explore full company profiles for 2 companies per calendar week with a free account. Each includes that company's DCF calculator in the same view, with no extra view used. The standalone DCF tool is Pro.",
        href: "/pricing",
        link: "Compare plans",
      },
    ],
    trustTitle: "Built to be clear about data and privacy",
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
    stepsTitle: "Започни в три стъпки",
    stepsIntro: "Лесен начин да събереш инвестициите си на едно ясно място.",
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
        body: "Следи датираната история и сравнявай доходността с избрани пазарни индекси.",
        href: "/features",
        hash: "methodology",
        link: "Как се изчислява",
      },
      {
        title: "Дивиденти и сделки",
        body: "Съхранявай историята на сделките заедно с потвърдената информация за дивиденти.",
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
        body: "Виж котировки и исторически цени от доставчика; липсващите данни не се заместват с оценки.",
        href: "/features",
        hash: "methodology",
        link: "Прочети методологията",
      },
      {
        title: "Пълен анализ на компании",
        body: "С безплатен профил разглеждай пълни профили на 2 компании за календарна седмица. DCF калкулаторът за компанията е в същия преглед и не изразходва отделен преглед. Самостоятелният DCF инструмент е Pro.",
        href: "/pricing",
        link: "Сравни плановете",
      },
    ],
    trustTitle: "Яснота за данните и поверителността",
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
    stepsTitle: "In drei Schritten starten",
    stepsIntro: "Ein einfacher Weg, deine Anlagen übersichtlich zusammenzuführen.",
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
        body: "Verfolge den datierten Verlauf und vergleiche die Rendite mit ausgewählten Marktindizes.",
        href: "/features",
        hash: "methodology",
        link: "Berechnung verstehen",
      },
      {
        title: "Dividenden und Aktivitäten",
        body: "Behalte Transaktionsverlauf und bestätigte Dividendeninformationen zusammen.",
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
        body: "Sieh Anbieter-Kurse und historische Preise; fehlende Daten werden nicht geschätzt.",
        href: "/features",
        hash: "methodology",
        link: "Methodik lesen",
      },
      {
        title: "Vollständige Unternehmensanalysen",
        body: "Mit einem kostenlosen Konto kannst du vollständige Unternehmensprofile für 2 Unternehmen pro Kalenderwoche ansehen. Der DCF-Rechner für das jeweilige Unternehmen ist in derselben Ansicht enthalten und verbraucht keinen zusätzlichen Aufruf. Der eigenständige DCF-Rechner ist Pro.",
        href: "/pricing",
        link: "Tarife vergleichen",
      },
    ],
    trustTitle: "Klarheit bei Daten und Datenschutz",
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
    stepsTitle: "Empieza en tres pasos",
    stepsIntro: "Una forma sencilla de reunir tus inversiones en una vista clara.",
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
        body: "Sigue el historial fechado y compara la rentabilidad con índices seleccionados.",
        href: "/features",
        hash: "methodology",
        link: "Cómo se calcula",
      },
      {
        title: "Dividendos y actividad",
        body: "Mantén el historial de operaciones junto con información de dividendos confirmados.",
        href: "/dividends",
        link: "Explorar dividendos",
      },
      {
        title: "Objetivos y planificación",
        body: "Define un objetivo y consulta escenarios transparentes con tus propias hipótesis.",
        href: "/tools",
        link: "Explorar herramientas",
      },
      {
        title: "Datos de mercado con límites claros",
        body: "Consulta cotizaciones e historial del proveedor; los datos que faltan no se estiman.",
        href: "/features",
        hash: "methodology",
        link: "Leer metodología",
      },
      {
        title: "Análisis completos de empresas",
        body: "Con una cuenta gratuita, consulta perfiles completos de 2 empresas por semana natural. La calculadora DCF de cada empresa está incluida en esa misma vista y no consume otra. La herramienta DCF independiente es Pro.",
        href: "/pricing",
        link: "Comparar planes",
      },
    ],
    trustTitle: "Claridad sobre datos y privacidad",
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
    stepsTitle: "Inizia in tre passaggi",
    stepsIntro: "Un modo semplice per riunire i tuoi investimenti in una vista chiara.",
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
        body: "Segui lo storico datato e confronta i rendimenti con gli indici selezionati.",
        href: "/features",
        hash: "methodology",
        link: "Come si calcola",
      },
      {
        title: "Dividendi e attività",
        body: "Conserva insieme lo storico delle operazioni e le informazioni sui dividendi confermati.",
        href: "/dividends",
        link: "Esplora i dividendi",
      },
      {
        title: "Obiettivi e pianificazione",
        body: "Imposta un obiettivo ed esplora scenari trasparenti basati sulle tue ipotesi.",
        href: "/tools",
        link: "Esplora gli strumenti",
      },
      {
        title: "Dati di mercato con limiti chiari",
        body: "Consulta quotazioni e prezzi storici del fornitore; i dati mancanti non vengono stimati.",
        href: "/features",
        hash: "methodology",
        link: "Leggi la metodologia",
      },
      {
        title: "Analisi aziendali complete",
        body: "Con un account gratuito, consulta profili completi di 2 aziende a settimana. Il calcolatore DCF della singola azienda è incluso nella stessa visita e non ne consuma un'altra. Lo strumento DCF autonomo è Pro.",
        href: "/pricing",
        link: "Confronta i piani",
      },
    ],
    trustTitle: "Chiarezza su dati e privacy",
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

export function LandingSections() {
  const { lang } = usePortfolio();
  const c = COPY[lang];
  return (
    <div className="space-y-8 lg:col-span-3">
      <section aria-labelledby="landing-steps" className="space-y-2">
        <div className="text-center">
          <h2 id="landing-steps" className="font-display text-2xl font-bold">
            {c.stepsTitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{c.stepsIntro}</p>
        </div>
        <ol className="grid gap-2.5 md:grid-cols-3">
          {c.steps.map((step, index) => {
            const Icon = STEP_ICONS[index] ?? Target;
            return (
              <li key={step.title}>
                <Card className="flex h-full items-start gap-3 p-3.5 sm:p-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon size={18} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </p>
                      <h3 className="font-display text-sm font-semibold">{step.title}</h3>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="landing-features" className="space-y-3">
        <h2 id="landing-features" className="font-display text-center text-2xl font-bold">
          {c.featuresTitle}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {c.features.map((feature) => (
            <Card key={feature.title} className="border-border/60 bg-card/60 p-4 sm:p-5">
              <h3 className="font-display font-semibold">{feature.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
              <Link
                to={feature.href}
                {...(feature.hash ? { hash: feature.hash } : {})}
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                {feature.link}
                <ArrowRight size={14} aria-hidden />
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="landing-trust" className="space-y-3">
        <div className="flex items-center justify-center gap-2">
          <LockKeyhole className="text-primary" size={18} aria-hidden />
          <h2 id="landing-trust" className="font-display text-center text-xl font-bold">
            {c.trustTitle}
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {c.trust.map((item) => (
            <div key={item.title} className="border-l-2 border-primary/30 py-1 pl-3">
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
        <p className="text-center">
          <Link
            to="/features"
            hash="methodology"
            className="text-sm font-semibold text-primary hover:underline"
          >
            {c.features[3]?.link}
          </Link>
        </p>
      </section>

      <section className="border-t border-border pt-5 text-center">
        <h2 className="font-display text-balance text-xl font-bold sm:text-2xl">{c.finalTitle}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{c.finalBody}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2.5">
          <Link
            to="/auth"
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {c.signup}
            <ArrowRight size={15} aria-hidden />
          </Link>
          <Link
            to="/demo"
            className="inline-flex min-h-10 items-center rounded-full border border-border bg-background/70 px-4 py-2 text-sm font-semibold hover:bg-secondary"
          >
            {c.demo}
          </Link>
        </div>
      </section>
    </div>
  );
}
