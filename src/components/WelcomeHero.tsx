import { Link } from "@tanstack/react-router";
import { ArrowRight, Eye, Search, Upload, PlusCircle, LineChart } from "lucide-react";
import { useEffect, useState } from "react";
import { usePortfolio } from "@/lib/store";
import type { Lang } from "@/lib/i18n";
import { isQuoteStale } from "@/lib/portfolio";
import { QuoteFreshness } from "@/components/QuoteFreshness";

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
    guestTitle: "Your investments, clearly in view.",
    guestSub:
      "Track stocks, ETFs and crypto, with portfolio performance, allocation and dividend insights in one place.",
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
    dataTrust:
      "Quotes come from Yahoo Finance; missing historical data is never replaced with estimates.",
    dataTrustLink: "How market data works",
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
    quoteStaleFor: "Quote older than 72 hours",
    quoteGap: "Missing quotes are marked unavailable; prices are never estimated.",
    quoteError: "Quotes could not be refreshed. Your last saved transactions are unchanged.",
    quoteUnavailable: "Some provider quotes are currently unavailable.",
    refreshQuotes: "Refresh quotes",
  },
  bg: {
    morning: "Добро утро",
    afternoon: "Добър ден",
    evening: "Добър вечер",
    guestTitle: "Виж инвестициите си ясно.",
    guestSub:
      "Следи акции, ETF-и и крипто, както и доходността, разпределението и дивидентите на портфолиото си — на едно място.",
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
    dataTrust:
      "Котировките идват от Yahoo Finance; липсващите исторически данни не се заместват с оценки.",
    dataTrustLink: "Как работят пазарните данни",
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
    quoteStaleFor: "Котировка над 72 часа",
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
      "Behalte Aktien, ETFs und Krypto sowie Wertentwicklung, Aufteilung und Dividenden deines Portfolios an einem Ort im Blick.",
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
    dataTrust:
      "Kurse stammen von Yahoo Finance; fehlende historische Daten werden nicht durch Schätzungen ersetzt.",
    dataTrustLink: "So funktionieren Marktdaten",
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
    quoteStaleFor: "Kurs älter als 72 Stunden",
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
      "Sigue acciones, ETF y cripto, junto con la rentabilidad, la distribución y los dividendos de tu cartera en un solo lugar.",
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
    dataTrust:
      "Las cotizaciones proceden de Yahoo Finance; los datos históricos que faltan no se sustituyen por estimaciones.",
    dataTrustLink: "Cómo funcionan los datos de mercado",
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
    quoteStaleFor: "Cotización de más de 72 horas",
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
      "Segui azioni, ETF e criptovalute, con rendimento, allocazione e informazioni sui dividendi del portafoglio in un unico posto.",
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
    dataTrust:
      "Le quotazioni provengono da Yahoo Finance; i dati storici mancanti non vengono sostituiti con stime.",
    dataTrustLink: "Come funzionano i dati di mercato",
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
    quoteStaleFor: "Quotazione oltre 72 ore",
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
        <p className="mt-4 max-w-3xl text-xs leading-relaxed text-muted-foreground">
          {c.dataTrust}{" "}
          <Link
            to="/features"
            hash="methodology"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            {c.dataTrustLink}
          </Link>
        </p>
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

  const marketHoldings = p.holdings.filter(
    (holding) =>
      holding.asset.type === "stock" ||
      holding.asset.type === "etf" ||
      holding.asset.type === "crypto",
  );
  const quotedHoldings = marketHoldings.filter(
    (holding) =>
      !!holding.asset.quoteAt &&
      Number.isFinite(Date.parse(holding.asset.quoteAt)) &&
      Number.isFinite(holding.asset.price),
  );
  const latestQuote = quotedHoldings
    .map((holding) => holding.asset.quoteAt)
    .filter((at): at is string => !!at)
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];
  const staleQuotes = quotedHoldings.filter((holding) =>
    isQuoteStale(holding.asset.quoteAt),
  ).length;
  const quoteIssues = marketHoldings.filter((holding) => {
    const at = holding.asset.quoteAt;
    return (
      !Number.isFinite(holding.asset.price) ||
      !at ||
      !Number.isFinite(Date.parse(at)) ||
      isQuoteStale(at)
    );
  });
  return (
    <section className="rise flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">
          {greet}
          {name ? `, ${name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">{c.activeSub}</p>
        {marketHoldings.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {latestQuote && <QuoteFreshness at={latestQuote} lang={p.lang} compact />}
            <p className="text-[10px] text-muted-foreground">
              {c.quoteCoverage(quotedHoldings.length, marketHoldings.length)}
              {quotedHoldings.length < marketHoldings.length && ` ${c.quoteGap}`}
            </p>
            {staleQuotes > 0 && (
              <p
                role="status"
                className="text-[10px] font-medium text-amber-700 dark:text-amber-300"
              >
                {c.staleQuoteCount(staleQuotes)}
              </p>
            )}
            {quoteIssues.length > 0 && (
              <details className="text-[10px] text-muted-foreground">
                <summary className="w-fit cursor-pointer font-semibold text-primary">
                  {c.quoteIssueSummary}
                </summary>
                <ul className="mt-1 space-y-0.5">
                  {quoteIssues.map((holding) => {
                    const at = holding.asset.quoteAt;
                    const stale = isQuoteStale(at);
                    return (
                      <li key={holding.asset.id} className="flex flex-wrap gap-x-1">
                        <span className="font-semibold">{holding.asset.symbol}:</span>
                        <span>{stale ? c.quoteStaleFor : c.quoteUnavailableFor}</span>
                      </li>
                    );
                  })}
                </ul>
              </details>
            )}
            {p.priceNote && (
              <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground">
                <span role={p.priceNote === "error" ? "alert" : "status"}>
                  {p.priceNote === "error" ? c.quoteError : c.quoteUnavailable}
                </span>
                <button
                  type="button"
                  onClick={() => void p.reload()}
                  className="font-semibold text-primary hover:underline"
                >
                  {c.refreshQuotes}
                </button>
              </div>
            )}
          </div>
        )}
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
