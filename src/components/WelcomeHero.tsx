import { Link } from "@tanstack/react-router";
import { ArrowRight, Eye, Search, Upload, PlusCircle, LineChart } from "lucide-react";
import { useEffect, useState } from "react";
import { usePortfolio } from "@/lib/store";
import { languageLocale, type Lang } from "@/lib/i18n";

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
  markets: string;
  watchlist: string;
  analytics: string;
  import: string;
};
const COPY: Record<Lang, Copy> = {
  en: {
    morning: "Good morning",
    afternoon: "Good afternoon",
    evening: "Good evening",
    guestTitle: "All your investments in one calm place",
    guestSub: "Track stocks, ETFs and crypto with live prices, dividends and real performance.",
    signUp: "Create free account",
    explore: "Explore markets",
    emptyTitle: "Let's build your portfolio",
    emptySub: "Choose how you want to get started:",
    s1: "Import a broker CSV",
    s2: "Or add a trade manually",
    activeSub: "Here's how your portfolio is doing today.",
    sampleTitle: "Want to see an example first?",
    sampleSub: "Explore a sample portfolio to see how holdings and allocation are presented.",
    sampleLink: "View sample portfolio",
    markets: "Markets",
    watchlist: "Watchlist",
    analytics: "Analytics",
    import: "Import",
  },
  bg: {
    morning: "Добро утро",
    afternoon: "Добър ден",
    evening: "Добър вечер",
    guestTitle: "Всички твои инвестиции на едно спокойно място",
    guestSub: "Следи акции, ETF-и и крипто с цени на живо, дивиденти и реална доходност.",
    signUp: "Създай безплатен профил",
    explore: "Разгледай пазарите",
    emptyTitle: "Да изградим портфолиото ти",
    emptySub: "Избери как да започнеш:",
    s1: "Импортирай CSV от брокер",
    s2: "Или добави сделка ръчно",
    activeSub: "Ето как се представя портфолиото ти днес.",
    sampleTitle: "Искаш първо да разгледаш пример?",
    sampleSub: "Виж примерно портфолио, за да разбереш как изглеждат позициите и разпределението.",
    sampleLink: "Разгледай примерното портфолио",
    markets: "Пазари",
    watchlist: "Watchlist",
    analytics: "Анализи",
    import: "Импорт",
  },
  de: {
    morning: "Guten Morgen",
    afternoon: "Guten Tag",
    evening: "Guten Abend",
    guestTitle: "Alle Investments an einem ruhigen Ort",
    guestSub: "Aktien, ETFs und Krypto mit Live-Kursen, Dividenden und echter Rendite verfolgen.",
    signUp: "Kostenloses Konto",
    explore: "Märkte entdecken",
    emptyTitle: "Bauen wir dein Portfolio auf",
    emptySub: "Wähle, wie du starten möchtest:",
    s1: "Broker-CSV importieren",
    s2: "Oder Trade manuell hinzufügen",
    activeSub: "So entwickelt sich dein Portfolio heute.",
    sampleTitle: "Möchtest du zuerst ein Beispiel sehen?",
    sampleSub: "Sieh dir ein Beispielportfolio mit Positionen und Aufteilung an.",
    sampleLink: "Beispielportfolio ansehen",
    markets: "Märkte",
    watchlist: "Watchlist",
    analytics: "Analysen",
    import: "Import",
  },
  es: {
    morning: "Buenos días",
    afternoon: "Buenas tardes",
    evening: "Buenas noches",
    guestTitle: "Todas tus inversiones en un lugar tranquilo",
    guestSub: "Sigue acciones, ETF y cripto con precios en vivo, dividendos y rentabilidad real.",
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
    sampleLink: "Ver cartera de ejemplo",
    markets: "Mercados",
    watchlist: "Watchlist",
    analytics: "Análisis",
    import: "Importar",
  },
  it: {
    morning: "Buongiorno",
    afternoon: "Buon pomeriggio",
    evening: "Buonasera",
    guestTitle: "Tutti i tuoi investimenti in un posto sereno",
    guestSub: "Segui azioni, ETF e cripto con prezzi live, dividendi e rendimento reale.",
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
    sampleLink: "Guarda il portafoglio di esempio",
    markets: "Mercati",
    watchlist: "Watchlist",
    analytics: "Analisi",
    import: "Importa",
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
      <section className="rise hover-lift-card rounded-3xl border border-border bg-card p-4 sm:p-6 md:p-7">
        <h1 className="font-display max-w-4xl text-balance text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl">
          {c.guestTitle}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {c.guestSub}
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Link
            to="/auth"
            className="press inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20"
          >
            {c.signUp}
            <ArrowRight className="size-4" />
          </Link>
          <Link to="/demo" className={`${chip} min-h-10 px-4`}>
            <Eye className="size-4" />
            {c.sampleLink}
          </Link>
          <Link to="/markets" className={`${chip} min-h-10 px-4`}>
            <Search className="size-4" />
            {c.explore}
          </Link>
        </div>
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
          {[
            { to: "/brokers", icon: Upload, t: c.s1 },
            { to: "/holdings", icon: PlusCircle, t: c.s2 },
          ].map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="card-interactive press flex items-center gap-3 rounded-2xl border border-border bg-background/60 p-4"
            >
              <span className="grid size-9 place-items-center rounded-full bg-foreground/10 text-foreground">
                <s.icon className="size-4" />
              </span>
              <span className="font-medium">{s.t}</span>
            </Link>
          ))}
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

  const quotedHoldings = p.holdings.filter((holding) => !!holding.asset.quoteAt);
  const latestQuote = quotedHoldings
    .map((holding) => holding.asset.quoteAt)
    .filter((at): at is string => !!at)
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];
  const quoteDate = latestQuote
    ? new Intl.DateTimeFormat(languageLocale(p.lang), {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(latestQuote))
    : null;
  const quoteSources = [...new Set(quotedHoldings.map(() => "Yahoo Finance"))].join(" & ");

  return (
    <section className="rise flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">
          {greet}
          {name ? `, ${name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">{c.activeSub}</p>
        {quoteDate && (
          <p className="mt-1 text-xs text-muted-foreground">
            {p.lang === "bg"
              ? `Пазарни данни от ${quoteSources} · последна налична котировка: ${quoteDate}. Данните може да са забавени.`
              : `Market data from ${quoteSources} · latest available quote: ${quoteDate}. Data may be delayed.`}
          </p>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
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
