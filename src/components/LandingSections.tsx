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

type FeaturePath = "/features" | "/dividends" | "/tools";
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
  faqTitle: string;
  faq: { question: string; answer: string }[];
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
    faqTitle: "Frequently asked questions",
    faq: [
      {
        question: "Can I try Capispot before creating an account?",
        answer:
          "Yes. Open the sample portfolio to explore the interface without adding your own portfolio data.",
      },
      {
        question: "Can I import transactions from my broker?",
        answer:
          "Yes. Import a supported broker CSV and review the transactions before adding them, or record activity manually.",
      },
      {
        question: "Where do prices and exchange rates come from?",
        answer:
          "Market quotes and historical prices use Yahoo Finance. Historical currency conversion uses dated provider rates; unavailable data is not replaced with a fixed estimate.",
      },
      {
        question: "Is Capispot investment advice?",
        answer:
          "No. Capispot is a portfolio tracking and analytics tool, not a recommendation to buy or sell. Investing involves risk.",
      },
      {
        question: "What is free and what is Pro?",
        answer:
          "The core portfolio tracker is free. Pro adds advanced analysis and planning features. See the pricing page for current plan details.",
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
    faqTitle: "Често задавани въпроси",
    faq: [
      {
        question: "Мога ли да разгледам Capispot без регистрация?",
        answer:
          "Да. Отвори примерното портфолио, за да разгледаш интерфейса, без да добавяш свои данни.",
      },
      {
        question: "Мога ли да импортирам сделки от брокера си?",
        answer:
          "Да. Импортирай поддържан брокерски CSV и прегледай сделките преди добавяне или ги въведи ръчно.",
      },
      {
        question: "Откъде идват цените и валутните курсове?",
        answer:
          "Котировките и историческите цени използват Yahoo Finance. Историческото превалутиране използва датирани курсове от доставчика; липсващите данни не се заместват с фиксирана оценка.",
      },
      {
        question: "Capispot дава ли инвестиционни съвети?",
        answer:
          "Не. Capispot е инструмент за следене и анализ на портфейл, а не препоръка за покупка или продажба. Инвестирането носи риск.",
      },
      {
        question: "Какво включват безплатният и Pro планът?",
        answer:
          "Основното следене на портфейл е безплатно. Pro добавя разширени анализи и инструменти за планиране. Виж страницата с цени за актуалните подробности.",
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
    faqTitle: "Häufig gestellte Fragen",
    faq: [
      {
        question: "Kann ich Capispot vor der Registrierung testen?",
        answer:
          "Ja. Öffne das Beispielportfolio, um die Oberfläche ohne eigene Portfoliodaten zu erkunden.",
      },
      {
        question: "Kann ich Transaktionen von meinem Broker importieren?",
        answer:
          "Ja. Importiere eine unterstützte Broker-CSV und prüfe die Transaktionen vor dem Hinzufügen oder erfasse sie manuell.",
      },
      {
        question: "Woher stammen Kurse und Wechselkurse?",
        answer:
          "Kurse und historische Preise verwenden Yahoo Finance. Die historische Währungsumrechnung verwendet datierte Anbieter-Kurse; fehlende Daten werden nicht durch feste Schätzungen ersetzt.",
      },
      {
        question: "Ist Capispot eine Anlageberatung?",
        answer:
          "Nein. Capispot ist ein Portfolio-Tracking- und Analysewerkzeug, keine Kauf- oder Verkaufsempfehlung. Investitionen sind mit Risiken verbunden.",
      },
      {
        question: "Was ist kostenlos und was bietet Pro?",
        answer:
          "Der Kern-Tracker ist kostenlos. Pro ergänzt erweiterte Analyse- und Planungsfunktionen. Aktuelle Details stehen auf der Preisseite.",
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
    faqTitle: "Preguntas frecuentes",
    faq: [
      {
        question: "¿Puedo probar Capispot antes de crear una cuenta?",
        answer:
          "Sí. Abre la cartera de ejemplo para explorar la interfaz sin añadir tus propios datos.",
      },
      {
        question: "¿Puedo importar operaciones de mi bróker?",
        answer:
          "Sí. Importa un CSV compatible y revisa las operaciones antes de añadirlas, o regístralas manualmente.",
      },
      {
        question: "¿De dónde proceden los precios y los tipos de cambio?",
        answer:
          "Las cotizaciones y los precios históricos utilizan Yahoo Finance. La conversión histórica usa tipos fechados del proveedor; los datos ausentes no se sustituyen por estimaciones fijas.",
      },
      {
        question: "¿Capispot ofrece asesoramiento de inversión?",
        answer:
          "No. Capispot es una herramienta de seguimiento y análisis, no una recomendación de compra o venta. Invertir conlleva riesgos.",
      },
      {
        question: "¿Qué incluye el plan gratuito y qué añade Pro?",
        answer:
          "El seguimiento básico de cartera es gratuito. Pro añade análisis avanzado y herramientas de planificación. Consulta precios para ver los detalles actuales.",
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
    faqTitle: "Domande frequenti",
    faq: [
      {
        question: "Posso provare Capispot prima di creare un account?",
        answer:
          "Sì. Apri il portafoglio di esempio per esplorare l'interfaccia senza aggiungere i tuoi dati.",
      },
      {
        question: "Posso importare le operazioni dal mio broker?",
        answer:
          "Sì. Importa un CSV supportato e controlla le operazioni prima di aggiungerle, oppure inseriscile manualmente.",
      },
      {
        question: "Da dove provengono prezzi e cambi?",
        answer:
          "Le quotazioni e i prezzi storici utilizzano Yahoo Finance. La conversione storica usa cambi datati del fornitore; i dati mancanti non sono sostituiti con stime fisse.",
      },
      {
        question: "Capispot offre consulenza sugli investimenti?",
        answer:
          "No. Capispot è uno strumento di monitoraggio e analisi, non una raccomandazione di acquisto o vendita. Investire comporta rischi.",
      },
      {
        question: "Cosa è incluso nel piano gratuito e in Pro?",
        answer:
          "Il tracker di base è gratuito. Pro aggiunge analisi avanzate e strumenti di pianificazione. Consulta i prezzi per i dettagli aggiornati.",
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
    <div className="space-y-10 lg:col-span-3">
      <section aria-labelledby="landing-steps" className="space-y-2">
        <div className="text-center">
          <h2 id="landing-steps" className="font-display text-2xl font-bold">
            {c.stepsTitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{c.stepsIntro}</p>
        </div>
        <ol className="grid gap-3 md:grid-cols-3">
          {c.steps.map((step, index) => {
            const Icon = STEP_ICONS[index] ?? Target;
            return (
              <li key={step.title}>
                <Card className="h-full p-5">
                  <span className="mb-3 grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon size={18} aria-hidden />
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {index + 1}
                  </p>
                  <h3 className="mt-1 font-display font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
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
            <Card key={feature.title} className="p-5">
              <h3 className="font-display font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
              <Link
                to={feature.href}
                {...(feature.hash ? { hash: feature.hash } : {})}
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                {feature.link}
                <ArrowRight size={14} aria-hidden />
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="landing-trust"
        className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/[0.05] via-card/70 to-chart-2/[0.06] p-5 sm:p-7"
      >
        <div className="mb-4 flex items-center justify-center gap-2">
          <LockKeyhole className="text-primary" size={18} aria-hidden />
          <h2 id="landing-trust" className="font-display text-center text-xl font-bold">
            {c.trustTitle}
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {c.trust.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-border/70 bg-background/50 p-4"
            >
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center">
          <Link
            to="/features"
            hash="methodology"
            className="text-sm font-semibold text-primary hover:underline"
          >
            {c.features[3]?.link}
          </Link>
        </p>
      </section>

      <section aria-labelledby="landing-faq" className="mx-auto w-full max-w-3xl">
        <h2 id="landing-faq" className="font-display mb-3 text-center text-2xl font-bold">
          {c.faqTitle}
        </h2>
        <div className="divide-y divide-border rounded-2xl border border-border bg-card px-4">
          {c.faq.map((item, index) => (
            <details key={item.question} className="group py-4" open={index === 0}>
              <summary className="cursor-pointer list-none pr-6 font-semibold marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <span className="flex items-center justify-between gap-3">
                  {item.question}
                  <span
                    className="text-lg text-primary transition-transform group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-primary/20 bg-primary/[0.045] px-5 py-8 text-center sm:px-8">
        <h2 className="font-display text-balance text-2xl font-bold">{c.finalTitle}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{c.finalBody}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2.5">
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
