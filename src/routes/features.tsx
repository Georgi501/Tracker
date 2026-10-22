import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  FileUp,
  LineChart,
  LockKeyhole,
  ShieldCheck,
  Target,
  Wallet,
} from "lucide-react";
import { Card } from "@/components/AppShell";
import { usePortfolio } from "@/lib/store";
import type { Lang } from "@/lib/i18n";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Portfolio tracking features — Capispot" },
      {
        name: "description",
        content:
          "Explore Capispot portfolio tracking, real market data, historical performance, goals and private account security.",
      },
      { property: "og:title", content: "Portfolio tracking features — Capispot" },
      {
        property: "og:description",
        content:
          "Track investments with real market prices, dated portfolio history and privacy-first controls.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FeaturesPage,
});

type FeatureCopy = {
  title: string;
  subtitle: string;
  cta: string;
  pricing: string;
  features: { title: string; body: string }[];
  trustTitle: string;
  trust: { title: string; body: string }[];
  disclaimer: string;
};
const COPY: Record<Lang, FeatureCopy> = {
  en: {
    title: "A clearer view of your investments",
    subtitle:
      "Capispot brings your portfolio, real market data and long-term plan together—without pretending that forecasts are facts.",
    cta: "Create a free account",
    pricing: "Compare plans",
    features: [
      {
        title: "One portfolio, multiple assets",
        body: "Track stocks, ETFs, crypto, cash and real estate. Add trades manually or import broker statements with currency-aware transaction costs.",
      },
      {
        title: "Performance with real history",
        body: "Review dated portfolio values and cash-flow-adjusted returns alongside selected market benchmarks. Missing market history stays unavailable rather than being estimated.",
      },
      {
        title: "Plan and understand",
        body: "Set investment goals, review allocation and risk, follow confirmed dividend events and use investor tools to explore scenarios.",
      },
      {
        title: "Useful free plan, deeper Pro tools",
        body: "Start with the core portfolio tracker for free. Pro adds advanced analysis and planning tools, with transparent monthly and annual billing.",
      },
    ],
    trustTitle: "Designed for clarity and privacy",
    trust: [
      {
        title: "Your portfolio stays yours",
        body: "Portfolio records are protected by account-scoped database rules. Public sharing is optional and displays portfolio-class percentages, not account balances.",
      },
      {
        title: "Real sources, visible limits",
        body: "Quotes come from Yahoo Finance and CoinGecko. Provider delays, gaps and unavailable data are disclosed rather than filled with invented prices.",
      },
      {
        title: "Not investment advice",
        body: "Capispot is tracking and analytics software. It does not tell you what to buy or sell; forecasts and AI outputs are informational tools, not personal recommendations.",
      },
    ],
    disclaimer:
      "Investing involves risk, including the loss of capital. Past performance does not guarantee future results.",
  },
  bg: {
    title: "По-ясен поглед към инвестициите ти",
    subtitle:
      "Capispot събира портфолиото, реалните пазарни данни и дългосрочния план — без да представя прогнозите като факти.",
    cta: "Създай безплатен профил",
    pricing: "Сравни плановете",
    features: [
      {
        title: "Едно портфолио за различни активи",
        body: "Следи акции, ETF-и, крипто, кеш и имоти. Добавяй сделки ръчно или импортирай брокерски извлечения с отчитане на валутата.",
      },
      {
        title: "Доходност с реална история",
        body: "Разглеждай историческа стойност на портфолиото и доходност, коригирана за парични потоци, спрямо избрани индекси. Липсващите пазарни данни не се заместват с оценки.",
      },
      {
        title: "Планирай и разбирай",
        body: "Задавай инвестиционни цели, преглеждай разпределение и риск, следи потвърдени дивиденти и използвай инструменти за сценарии.",
      },
      {
        title: "Полезен безплатен план и повече в Pro",
        body: "Започни безплатно с основното следене на портфейл. Pro добавя разширени анализи и планиране с ясно месечно или годишно таксуване.",
      },
    ],
    trustTitle: "Яснота и поверителност по дизайн",
    trust: [
      {
        title: "Портфолиото си остава твое",
        body: "Записите са защитени с правила за достъп до данните на профила. Публичното споделяне е по избор и показва проценти по класове, не стойности на сметката.",
      },
      {
        title: "Реални източници и видими ограничения",
        body: "Котировките идват от Yahoo Finance и CoinGecko. Забавянията, липсващите стойности и недостъпните данни се показват, без измислени цени.",
      },
      {
        title: "Не е инвестиционен съвет",
        body: "Capispot е софтуер за следене и анализ. Не ти казва какво да купиш или продадеш; прогнозите и AI резултатите са информационни инструменти, не лични препоръки.",
      },
    ],
    disclaimer:
      "Инвестирането носи риск, включително загуба на капитал. Миналите резултати не гарантират бъдещите.",
  },
  de: {
    title: "Mehr Überblick über deine Investments",
    subtitle:
      "Capispot verbindet Portfolio, echte Marktdaten und langfristige Planung, ohne Prognosen als Fakten darzustellen.",
    cta: "Kostenloses Konto erstellen",
    pricing: "Tarife vergleichen",
    features: [
      {
        title: "Ein Portfolio für verschiedene Anlageklassen",
        body: "Aktien, ETFs, Krypto, Bargeld und Immobilien verfolgen. Trades manuell erfassen oder Brokerdateien mit Währungsumrechnung importieren.",
      },
      {
        title: "Performance mit echter Historie",
        body: "Historische Portfoliowerte und cashflowbereinigte Renditen mit Marktbenchmarks vergleichen. Fehlende Daten werden nicht geschätzt.",
      },
      {
        title: "Planen und verstehen",
        body: "Anlageziele setzen, Allokation und Risiko prüfen, bestätigte Dividenden verfolgen und Szenarien untersuchen.",
      },
      {
        title: "Kostenlos starten, mehr mit Pro",
        body: "Beginne kostenlos mit dem Portfolio-Tracker. Pro ergänzt Analysen und Planung mit transparenter monatlicher oder jährlicher Abrechnung.",
      },
    ],
    trustTitle: "Klarheit und Datenschutz",
    trust: [
      {
        title: "Dein Portfolio bleibt privat",
        body: "Portfoliodaten sind durch kontobasierte Datenbankregeln geschützt. Öffentliches Teilen ist optional und zeigt Prozentanteile, keine Kontostände.",
      },
      {
        title: "Echte Quellen, sichtbare Grenzen",
        body: "Kurse stammen von Yahoo Finance und CoinGecko. Verzögerungen und Datenlücken werden nicht durch erfundene Preise ersetzt.",
      },
      {
        title: "Keine Anlageberatung",
        body: "Capispot ist Portfolio- und Analysesoftware, keine persönliche Empfehlung zum Kauf oder Verkauf.",
      },
    ],
    disclaimer:
      "Investitionen sind mit Risiken bis hin zum Kapitalverlust verbunden. Vergangene Ergebnisse garantieren keine zukünftigen Ergebnisse.",
  },
  es: {
    title: "Una visión más clara de tus inversiones",
    subtitle:
      "Capispot reúne tu cartera, datos reales del mercado y planificación a largo plazo sin presentar previsiones como hechos.",
    cta: "Crear cuenta gratis",
    pricing: "Comparar planes",
    features: [
      {
        title: "Una cartera, distintos activos",
        body: "Sigue acciones, ETF, criptomonedas, efectivo e inmuebles. Añade operaciones o importa extractos con conversión de divisas.",
      },
      {
        title: "Rentabilidad con historia real",
        body: "Consulta valores históricos y rentabilidad ajustada por flujos de efectivo frente a índices. Los datos faltantes no se estiman.",
      },
      {
        title: "Planifica y comprende",
        body: "Define objetivos, revisa asignación y riesgo, sigue dividendos confirmados y explora escenarios.",
      },
      {
        title: "Empieza gratis y amplía con Pro",
        body: "Comienza con el seguimiento esencial gratis. Pro añade análisis y planificación con facturación mensual o anual transparente.",
      },
    ],
    trustTitle: "Claridad y privacidad desde el diseño",
    trust: [
      {
        title: "Tu cartera sigue siendo privada",
        body: "Los datos están protegidos por reglas de acceso por cuenta. Compartir es opcional y muestra porcentajes, no saldos.",
      },
      {
        title: "Fuentes reales, límites visibles",
        body: "Las cotizaciones proceden de Yahoo Finance y CoinGecko. No se rellenan retrasos ni datos ausentes con precios inventados.",
      },
      {
        title: "No es asesoramiento financiero",
        body: "Capispot es software de seguimiento y análisis, no una recomendación personal para comprar o vender.",
      },
    ],
    disclaimer:
      "Invertir implica riesgos, incluida la pérdida de capital. Los resultados pasados no garantizan resultados futuros.",
  },
  it: {
    title: "Una visione più chiara dei tuoi investimenti",
    subtitle:
      "Capispot riunisce portafoglio, dati di mercato reali e pianificazione senza presentare le previsioni come fatti.",
    cta: "Crea un account gratuito",
    pricing: "Confronta i piani",
    features: [
      {
        title: "Un portafoglio, più asset",
        body: "Monitora azioni, ETF, criptovalute, liquidità e immobili. Aggiungi operazioni o importa estratti con conversione valutaria.",
      },
      {
        title: "Rendimento basato sulla storia reale",
        body: "Esamina valori storici e rendimenti corretti per i flussi di cassa rispetto agli indici. I dati mancanti non vengono stimati.",
      },
      {
        title: "Pianifica e comprendi",
        body: "Imposta obiettivi, controlla allocazione e rischio, segui dividendi confermati ed esplora scenari.",
      },
      {
        title: "Inizia gratis, passa a Pro",
        body: "Inizia con il tracker essenziale gratuito. Pro aggiunge analisi e pianificazione con fatturazione mensile o annuale trasparente.",
      },
    ],
    trustTitle: "Chiarezza e privacy integrate",
    trust: [
      {
        title: "Il portafoglio resta privato",
        body: "I dati sono protetti da regole di accesso per account. La condivisione è facoltativa e mostra percentuali, non saldi.",
      },
      {
        title: "Fonti reali, limiti visibili",
        body: "Le quotazioni provengono da Yahoo Finance e CoinGecko. Ritardi e dati mancanti non vengono sostituiti da prezzi inventati.",
      },
      {
        title: "Non è consulenza finanziaria",
        body: "Capispot è un software di monitoraggio e analisi, non una raccomandazione personale di acquisto o vendita.",
      },
    ],
    disclaimer:
      "Investire comporta rischi, inclusa la perdita del capitale. I risultati passati non garantiscono quelli futuri.",
  },
};

const ICONS = [Wallet, LineChart, Target, BarChart3];
const TRUST_ICONS = [LockKeyhole, Activity, ShieldCheck];

function FeaturesPage() {
  const p = usePortfolio();
  const c = COPY[p.lang];
  return (
    <div className="mx-auto max-w-5xl space-y-12 py-6">
      <section className="rounded-3xl border border-border bg-card px-6 py-12 text-center sm:px-12">
        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-primary">Capispot</p>
        <h1 className="font-display mx-auto mt-3 max-w-3xl text-balance text-3xl font-bold sm:text-5xl">
          {c.title}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {c.subtitle}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            to="/auth"
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            {c.cta}
          </Link>
          <Link
            to="/pricing"
            className="rounded-full border border-border px-6 py-3 text-sm font-semibold"
          >
            {c.pricing}
          </Link>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        {c.features.map((feature, index) => {
          const Icon = ICONS[index] ?? FileUp;
          return (
            <Card key={feature.title} className="p-6">
              <Icon className="mb-3 text-primary" size={22} />
              <h2 className="font-display text-lg font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
            </Card>
          );
        })}
      </section>
      <section>
        <h2 className="font-display mb-4 text-center text-2xl font-bold">{c.trustTitle}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {c.trust.map((feature, index) => {
            const Icon = TRUST_ICONS[index] ?? ShieldCheck;
            return (
              <Card key={feature.title} className="p-5">
                <Icon className="mb-3 text-primary" size={20} />
                <h3 className="font-display font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
              </Card>
            );
          })}
        </div>
        <p className="mx-auto mt-4 max-w-3xl text-center text-xs text-muted-foreground">
          {c.disclaimer}
        </p>
      </section>
    </div>
  );
}
