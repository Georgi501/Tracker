import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, Building2, ChartNoAxesCombined, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { marketCompanyResearch, marketStats } from "@/lib/market.functions";
import { languageLocale, type Lang } from "@/lib/i18n";
import { ProGate, BarsSilhouette } from "@/components/ProFeatures";

const COPY = {
  en: {
    title: "Company research",
    desc: "A deeper view of valuation, company performance, analyst expectations and ownership.",
    statistics: "Key statistics",
    valuation: "Valuation & trading",
    profitability: "Profitability & growth",
    balanceSheet: "Balance sheet",
    shareholderReturns: "Shareholder returns",
    marketCap: "Market capitalization",
    enterpriseValue: "Enterprise value",
    trailingPe: "Trailing P/E",
    forwardPe: "Forward P/E",
    priceToSales: "Price / sales",
    priceToBook: "Price / book",
    pegRatio: "PEG ratio",
    beta: "Beta (5Y monthly)",
    eps: "EPS (TTM)",
    forwardEps: "Forward EPS",
    roe: "Return on equity",
    debtToEquity: "Debt / equity",
    operatingMargin: "Operating margin",
    profitMargin: "Profit margin",
    revenueGrowth: "Revenue growth",
    earningsGrowth: "Earnings growth",
    cash: "Cash & equivalents",
    totalDebt: "Total debt",
    currentRatio: "Current ratio",
    quickRatio: "Quick ratio",
    dividendRate: "Annual dividend",
    dividendYield: "Dividend yield",
    analysts: "Analyst outlook",
    consensus: "Recommendation trend",
    target: "12-month price target",
    currentPrice: "Current price",
    low: "Low",
    average: "Average",
    high: "High",
    upside: "Implied return to average target",
    strongBuy: "Strong buy",
    buy: "Buy",
    hold: "Hold",
    sell: "Sell",
    strongSell: "Strong sell",
    estimates: "Earnings & revenue estimates",
    revisions: "EPS estimate revisions · last 30 days",
    epsTrend: "Current vs. 30 days ago",
    upRevisions: "Raised",
    downRevisions: "Lowered",
    surprises: "Reported earnings surprises",
    actualEps: "Actual EPS",
    estimatedEps: "Estimated EPS",
    surprisePercent: "Surprise",
    retrieved: "Data retrieved",
    period: "Period",
    epsAverage: "EPS average",
    epsRange: "EPS low–high",
    revenueAverage: "Revenue average",
    analystsCount: "Analysts",
    growth: "Growth",
    holders: "Ownership & holders",
    insiderOwnership: "Insider ownership",
    institutionalOwnership: "Institutional ownership",
    institutionsCount: "Institutions reporting",
    institutions: "Largest institutional holders",
    holder: "Holder",
    percentHeld: "% held",
    value: "Reported value",
    reported: "Reported",
    insiderHolders: "Insider positions",
    relation: "Role",
    shares: "Shares",
    unavailable: "No reported data is available for this section.",
    loading: "Loading company research…",
    loadFailed: "Could not load company research.",
    retry: "Try again",
    source: "Source: Yahoo Finance. Data may be delayed or incomplete; not investment advice.",
  },
  bg: {
    title: "Анализ на компанията",
    desc: "По-задълбочен поглед към оценката, резултатите, очакванията и собствеността.",
    statistics: "Ключови показатели",
    valuation: "Оценка и търговия",
    profitability: "Рентабилност и растеж",
    balanceSheet: "Баланс",
    shareholderReturns: "Доходност за акционерите",
    marketCap: "Пазарна капитализация",
    enterpriseValue: "Стойност на предприятието",
    trailingPe: "P/E (последни 12 м.)",
    forwardPe: "Прогнозен P/E",
    priceToSales: "Цена / приходи",
    priceToBook: "Цена / балансова стойност",
    pegRatio: "PEG коефициент",
    beta: "Бета (5 г., месечна)",
    eps: "Печалба на акция (TTM)",
    forwardEps: "Прогнозна печалба на акция",
    roe: "Възвръщаемост на капитала",
    debtToEquity: "Дълг / собствен капитал",
    operatingMargin: "Оперативен марж",
    profitMargin: "Нетен марж",
    revenueGrowth: "Ръст на приходите",
    earningsGrowth: "Ръст на печалбата",
    cash: "Парични средства",
    totalDebt: "Общ дълг",
    currentRatio: "Текуща ликвидност",
    quickRatio: "Бърза ликвидност",
    dividendRate: "Годишен дивидент",
    dividendYield: "Дивидентна доходност",
    analysts: "Перспектива на анализаторите",
    consensus: "Промяна в препоръките",
    target: "Целева цена за 12 месеца",
    currentPrice: "Текуща цена",
    low: "Минимум",
    average: "Средна",
    high: "Максимум",
    upside: "Потенциал до средната целева цена",
    strongBuy: "Силна покупка",
    buy: "Покупка",
    hold: "Задържане",
    sell: "Продажба",
    strongSell: "Силна продажба",
    estimates: "Прогнози за печалбата и приходите",
    revisions: "Промени в прогнозите за EPS · последни 30 дни",
    epsTrend: "Сега спрямо преди 30 дни",
    upRevisions: "Повишени",
    downRevisions: "Понижени",
    surprises: "Изненади в отчетената печалба",
    actualEps: "Отчетен EPS",
    estimatedEps: "Прогнозен EPS",
    surprisePercent: "Изненада",
    retrieved: "Данните са изтеглени",
    period: "Период",
    epsAverage: "Средна печалба на акция",
    epsRange: "Печалба на акция мин.–макс.",
    revenueAverage: "Средни приходи",
    analystsCount: "Анализатори",
    growth: "Ръст",
    holders: "Собственост и акционери",
    insiderOwnership: "Дял на вътрешни лица",
    institutionalOwnership: "Дял на институциите",
    institutionsCount: "Отчитащи институции",
    institutions: "Най-големи институционални акционери",
    holder: "Притежател",
    percentHeld: "% дял",
    value: "Отчетена стойност",
    reported: "Отчетено",
    insiderHolders: "Позиции на вътрешни лица",
    relation: "Длъжност",
    shares: "Акции",
    unavailable: "Няма отчетени данни за този раздел.",
    loading: "Зареждане на анализа…",
    loadFailed: "Анализът на компанията не се зареди.",
    retry: "Опитай отново",
    source:
      "Източник: Yahoo Finance. Данните може да са забавени или непълни; това не е инвестиционен съвет.",
  },
  de: {
    title: "Unternehmensanalyse",
    desc: "Ein genauerer Blick auf Bewertung, Entwicklung, Analystenerwartungen und Eigentümer.",
    statistics: "Wichtige Kennzahlen",
    valuation: "Bewertung & Handel",
    profitability: "Rentabilität & Wachstum",
    balanceSheet: "Bilanz",
    shareholderReturns: "Aktionärsrendite",
    marketCap: "Marktkapitalisierung",
    enterpriseValue: "Unternehmenswert",
    trailingPe: "KGV (TTM)",
    forwardPe: "Forward-KGV",
    priceToSales: "Kurs / Umsatz",
    priceToBook: "Kurs / Buchwert",
    pegRatio: "PEG-Verhältnis",
    beta: "Beta (5J monatlich)",
    eps: "Gewinn je Aktie (TTM)",
    forwardEps: "Erwarteter Gewinn je Aktie",
    roe: "Eigenkapitalrendite",
    debtToEquity: "Fremdkapital / Eigenkapital",
    operatingMargin: "Operative Marge",
    profitMargin: "Nettomarge",
    revenueGrowth: "Umsatzwachstum",
    earningsGrowth: "Gewinnwachstum",
    cash: "Barmittel",
    totalDebt: "Gesamtschulden",
    currentRatio: "Liquidität 3. Grades",
    quickRatio: "Liquidität 2. Grades",
    dividendRate: "Jährliche Dividende",
    dividendYield: "Dividendenrendite",
    analysts: "Analystenausblick",
    consensus: "Empfehlungstrend",
    target: "Kursziel für 12 Monate",
    currentPrice: "Aktueller Kurs",
    low: "Tief",
    average: "Durchschnitt",
    high: "Hoch",
    upside: "Potenzial bis zum Durchschnittsziel",
    strongBuy: "Starker Kauf",
    buy: "Kauf",
    hold: "Halten",
    sell: "Verkauf",
    strongSell: "Starker Verkauf",
    estimates: "Gewinn- und Umsatzschätzungen",
    revisions: "EPS-Schätzungsänderungen · letzte 30 Tage",
    epsTrend: "Aktuell gegenüber vor 30 Tagen",
    upRevisions: "Angehoben",
    downRevisions: "Gesenkt",
    surprises: "Überraschungen bei gemeldeten Ergebnissen",
    actualEps: "Gemeldeter EPS",
    estimatedEps: "Geschätzter EPS",
    surprisePercent: "Überraschung",
    retrieved: "Daten abgerufen",
    period: "Zeitraum",
    epsAverage: "EPS-Durchschnitt",
    epsRange: "EPS-Tief–Hoch",
    revenueAverage: "Umsatz-Durchschnitt",
    analystsCount: "Analysten",
    growth: "Wachstum",
    holders: "Eigentümer & Anteilseigner",
    insiderOwnership: "Insideranteil",
    institutionalOwnership: "Institutioneller Anteil",
    institutionsCount: "Berichtende Institutionen",
    institutions: "Größte institutionelle Anteilseigner",
    holder: "Anteilseigner",
    percentHeld: "% gehalten",
    value: "Gemeldeter Wert",
    reported: "Gemeldet",
    insiderHolders: "Insiderpositionen",
    relation: "Funktion",
    shares: "Aktien",
    unavailable: "Für diesen Abschnitt sind keine gemeldeten Daten verfügbar.",
    loading: "Unternehmensanalyse wird geladen…",
    loadFailed: "Unternehmensanalyse konnte nicht geladen werden.",
    retry: "Erneut versuchen",
    source:
      "Quelle: Yahoo Finance. Daten können verzögert oder unvollständig sein; keine Anlageberatung.",
  },
  es: {
    title: "Análisis de la empresa",
    desc: "Una visión más profunda de la valoración, los resultados, las previsiones y la propiedad.",
    statistics: "Datos clave",
    valuation: "Valoración y negociación",
    profitability: "Rentabilidad y crecimiento",
    balanceSheet: "Balance",
    shareholderReturns: "Rentabilidad para accionistas",
    marketCap: "Capitalización bursátil",
    enterpriseValue: "Valor de empresa",
    trailingPe: "PER (TTM)",
    forwardPe: "PER futuro",
    priceToSales: "Precio / ventas",
    priceToBook: "Precio / valor contable",
    pegRatio: "Ratio PEG",
    beta: "Beta (5 años mensual)",
    eps: "BPA (TTM)",
    forwardEps: "BPA previsto",
    roe: "Rentabilidad sobre patrimonio",
    debtToEquity: "Deuda / patrimonio",
    operatingMargin: "Margen operativo",
    profitMargin: "Margen neto",
    revenueGrowth: "Crecimiento de ingresos",
    earningsGrowth: "Crecimiento de beneficios",
    cash: "Efectivo y equivalentes",
    totalDebt: "Deuda total",
    currentRatio: "Ratio corriente",
    quickRatio: "Ratio de liquidez",
    dividendRate: "Dividendo anual",
    dividendYield: "Rentabilidad por dividendo",
    analysts: "Perspectiva de analistas",
    consensus: "Tendencia de recomendaciones",
    target: "Precio objetivo a 12 meses",
    currentPrice: "Precio actual",
    low: "Mínimo",
    average: "Media",
    high: "Máximo",
    upside: "Rentabilidad implícita hasta el objetivo medio",
    strongBuy: "Compra fuerte",
    buy: "Comprar",
    hold: "Mantener",
    sell: "Vender",
    strongSell: "Venta fuerte",
    estimates: "Estimaciones de beneficios e ingresos",
    revisions: "Revisiones de estimaciones de BPA · últimos 30 días",
    epsTrend: "Actual frente a hace 30 días",
    upRevisions: "Al alza",
    downRevisions: "A la baja",
    surprises: "Sorpresas de resultados publicados",
    actualEps: "BPA real",
    estimatedEps: "BPA estimado",
    surprisePercent: "Sorpresa",
    retrieved: "Datos obtenidos",
    period: "Período",
    epsAverage: "BPA medio",
    epsRange: "BPA mínimo–máximo",
    revenueAverage: "Ingresos medios",
    analystsCount: "Analistas",
    growth: "Crecimiento",
    holders: "Propiedad y accionistas",
    insiderOwnership: "Propiedad de directivos",
    institutionalOwnership: "Propiedad institucional",
    institutionsCount: "Instituciones que informan",
    institutions: "Mayores accionistas institucionales",
    holder: "Accionista",
    percentHeld: "% en propiedad",
    value: "Valor declarado",
    reported: "Declarado",
    insiderHolders: "Posiciones de directivos",
    relation: "Cargo",
    shares: "Acciones",
    unavailable: "No hay datos publicados disponibles para esta sección.",
    loading: "Cargando análisis…",
    loadFailed: "No se pudo cargar el análisis de la empresa.",
    retry: "Intentar de nuevo",
    source:
      "Fuente: Yahoo Finance. Los datos pueden estar retrasados o incompletos; no es asesoramiento financiero.",
  },
  it: {
    title: "Analisi aziendale",
    desc: "Una visione più approfondita di valutazione, risultati, aspettative degli analisti e proprietà.",
    statistics: "Statistiche principali",
    valuation: "Valutazione e negoziazione",
    profitability: "Redditività e crescita",
    balanceSheet: "Stato patrimoniale",
    shareholderReturns: "Rendimento per gli azionisti",
    marketCap: "Capitalizzazione di mercato",
    enterpriseValue: "Valore d'impresa",
    trailingPe: "P/E (TTM)",
    forwardPe: "P/E forward",
    priceToSales: "Prezzo / ricavi",
    priceToBook: "Prezzo / valore contabile",
    pegRatio: "Rapporto PEG",
    beta: "Beta (5 anni mensile)",
    eps: "Utile per azione (TTM)",
    forwardEps: "Utile per azione previsto",
    roe: "Rendimento del capitale",
    debtToEquity: "Debito / capitale",
    operatingMargin: "Margine operativo",
    profitMargin: "Margine netto",
    revenueGrowth: "Crescita dei ricavi",
    earningsGrowth: "Crescita degli utili",
    cash: "Liquidità e mezzi equivalenti",
    totalDebt: "Debito totale",
    currentRatio: "Indice di liquidità corrente",
    quickRatio: "Indice di liquidità immediata",
    dividendRate: "Dividendo annuale",
    dividendYield: "Rendimento da dividendo",
    analysts: "Prospettive degli analisti",
    consensus: "Andamento delle raccomandazioni",
    target: "Obiettivo di prezzo a 12 mesi",
    currentPrice: "Prezzo attuale",
    low: "Minimo",
    average: "Media",
    high: "Massimo",
    upside: "Rendimento implicito fino all'obiettivo medio",
    strongBuy: "Acquisto forte",
    buy: "Acquisto",
    hold: "Mantenere",
    sell: "Vendere",
    strongSell: "Vendita forte",
    estimates: "Stime di utili e ricavi",
    revisions: "Revisioni delle stime EPS · ultimi 30 giorni",
    epsTrend: "Attuale rispetto a 30 giorni fa",
    upRevisions: "Al rialzo",
    downRevisions: "Al ribasso",
    surprises: "Sorprese sugli utili pubblicati",
    actualEps: "EPS effettivo",
    estimatedEps: "EPS stimato",
    surprisePercent: "Sorpresa",
    retrieved: "Dati aggiornati",
    period: "Periodo",
    epsAverage: "EPS medio",
    epsRange: "EPS minimo–massimo",
    revenueAverage: "Ricavi medi",
    analystsCount: "Analisti",
    growth: "Crescita",
    holders: "Proprietà e azionisti",
    insiderOwnership: "Proprietà degli insider",
    institutionalOwnership: "Proprietà istituzionale",
    institutionsCount: "Istituzioni segnalanti",
    institutions: "Principali azionisti istituzionali",
    holder: "Azionista",
    percentHeld: "% detenuta",
    value: "Valore dichiarato",
    reported: "Dichiarato",
    insiderHolders: "Posizioni degli insider",
    relation: "Ruolo",
    shares: "Azioni",
    unavailable: "Nessun dato pubblicato disponibile per questa sezione.",
    loading: "Caricamento analisi aziendale…",
    loadFailed: "Impossibile caricare l'analisi aziendale.",
    retry: "Riprova",
    source:
      "Fonte: Yahoo Finance. I dati possono essere ritardati o incompleti; non è consulenza finanziaria.",
  },
} as const satisfies Record<Lang, Record<string, string>>;

export function ProCompanyResearch({ symbol, lang }: { symbol: string; lang: Lang }) {
  const c = COPY[lang];
  return (
    <ProGate title={c.title} desc={c.desc} preview={<BarsSilhouette />}>
      <ResearchPanels symbol={symbol} lang={lang} />
    </ProGate>
  );
}

function ResearchPanels({ symbol, lang }: { symbol: string; lang: Lang }) {
  const c = COPY[lang];
  const fetchStats = useServerFn(marketStats);
  const fetchResearch = useServerFn(marketCompanyResearch);
  const statsQuery = useQuery({
    queryKey: ["market-stats", symbol],
    queryFn: () => fetchStats({ data: { symbol } }),
    staleTime: 300_000,
  });
  const researchQuery = useQuery({
    queryKey: ["market-company-research", symbol],
    queryFn: () => fetchResearch({ data: { symbol } }),
    staleTime: 300_000,
  });
  const loc = languageLocale(lang);
  const stats = statsQuery.data;
  const research = researchQuery.data;
  const earningsHistory = research?.earningsHistory ?? [];
  const number = (value: number | null | undefined, digits = 1) =>
    value == null
      ? "—"
      : new Intl.NumberFormat(loc, { maximumFractionDigits: digits }).format(value);
  const percent = (value: number | null | undefined, alreadyPercent = false) =>
    value == null ? "—" : `${number(alreadyPercent ? value : value * 100)}%`;
  const money = (value: number | null | undefined, compact = false) =>
    value == null
      ? "—"
      : new Intl.NumberFormat(loc, {
          ...(stats?.currency ? { style: "currency" as const, currency: stats.currency } : {}),
          ...(compact ? { notation: "compact" as const, maximumFractionDigits: 2 } : {}),
          ...(!compact ? { maximumFractionDigits: 2 } : {}),
        }).format(value);
  const multiple = (value: number | null | undefined) =>
    value == null ? "—" : `${number(value, 2)}×`;
  const ratio = (value: number | null | undefined) => (value == null ? "—" : number(value, 2));
  const reportDate = (value: string | null) =>
    value ? new Date(value).toLocaleDateString(loc, { dateStyle: "medium" }) : "—";
  const fmtPeriod = (value: string) => value.replace(/^(\d+)([qym])$/, "$1 $2");
  const retrievedAt = research?.retrievedAt
    ? new Intl.DateTimeFormat(loc, { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(research.retrievedAt),
      )
    : null;

  if (statsQuery.isLoading || researchQuery.isLoading)
    return <p className="py-6 text-sm text-muted-foreground">{c.loading}</p>;
  if (statsQuery.isError || researchQuery.isError)
    return (
      <div className="space-y-3 py-4">
        <p role="alert" className="text-sm text-destructive">
          {c.loadFailed}
        </p>
        <Button
          variant="outline"
          onClick={() => void Promise.all([statsQuery.refetch(), researchQuery.refetch()])}
        >
          {c.retry}
        </Button>
      </div>
    );
  const hasOwnershipData =
    !!research &&
    (research.ownership.insiderPercent != null ||
      research.ownership.institutionalPercent != null ||
      research.ownership.institutions.length > 0 ||
      research.ownership.insiders.length > 0);
  if (
    !stats &&
    !research?.estimates.length &&
    !research?.earningsHistory.length &&
    !research?.recommendations.length &&
    !hasOwnershipData
  )
    return <p className="py-6 text-sm text-muted-foreground">{c.unavailable}</p>;

  const rows = (items: { label: string; value: string }[]) => (
    <dl className="divide-y divide-border/70">
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="text-right font-semibold tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
  const group = (title: string, icon: ReactNode, items: { label: string; value: string }[]) => (
    <section className="rounded-xl border border-border bg-background/70 p-4">
      <h4 className="mb-1 flex items-center gap-2 font-display text-sm font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </h4>
      {rows(items)}
    </section>
  );
  const recommendations = research?.recommendations ?? [];
  const latestRecommendation = recommendations[0];
  const voteLabels = ["strongBuy", "buy", "hold", "sell", "strongSell"] as const;
  const voteColors = [
    "bg-success",
    "bg-success/65",
    "bg-muted-foreground/50",
    "bg-destructive/65",
    "bg-destructive",
  ];
  const voteNames = [c.strongBuy, c.buy, c.hold, c.sell, c.strongSell];
  const totalVotes = latestRecommendation
    ? voteLabels.reduce((sum, key) => sum + latestRecommendation[key], 0)
    : 0;
  const targetLow = stats?.targetLow;
  const targetHigh = stats?.targetHigh;
  const currentPrice = stats?.currentPrice;
  const targetMean = stats?.target;
  const targetRangeValid =
    targetLow != null &&
    targetHigh != null &&
    currentPrice != null &&
    targetMean != null &&
    targetHigh > targetLow;
  const targetPosition = (value: number) =>
    Math.min(
      100,
      Math.max(0, ((value - (targetLow ?? 0)) / ((targetHigh ?? 0) - (targetLow ?? 0))) * 100),
    );
  const institutions = research?.ownership.institutions ?? [];
  const insiders = research?.ownership.insiders ?? [];
  const estimates = research?.estimates ?? [];
  const statGroups = [
    group(c.valuation, <ChartNoAxesCombined size={16} />, [
      { label: c.marketCap, value: money(stats?.marketCap, true) },
      { label: c.enterpriseValue, value: money(stats?.enterpriseValue, true) },
      { label: c.trailingPe, value: multiple(stats?.trailingPe) },
      { label: c.forwardPe, value: multiple(stats?.forwardPe) },
      { label: c.priceToSales, value: multiple(stats?.priceToSales) },
      { label: c.priceToBook, value: multiple(stats?.priceToBook) },
      { label: c.pegRatio, value: ratio(stats?.pegRatio) },
      { label: c.beta, value: ratio(stats?.beta) },
    ]),
    group(c.profitability, <BarChart3 size={16} />, [
      { label: c.eps, value: money(stats?.eps) },
      { label: c.forwardEps, value: money(stats?.forwardEps) },
      { label: c.roe, value: percent(stats?.returnOnEquity) },
      {
        label: c.debtToEquity,
        value: stats?.debtToEquity == null ? "—" : `${number(stats.debtToEquity)}%`,
      },
      { label: c.operatingMargin, value: percent(stats?.operatingMargins) },
      { label: c.profitMargin, value: percent(stats?.profitMargins) },
      { label: c.revenueGrowth, value: percent(stats?.revenueGrowth) },
      { label: c.earningsGrowth, value: percent(stats?.earningsGrowth) },
    ]),
    group(c.balanceSheet, <Building2 size={16} />, [
      { label: c.cash, value: money(stats?.cash, true) },
      { label: c.totalDebt, value: money(stats?.totalDebt, true) },
      { label: c.currentRatio, value: ratio(stats?.currentRatio) },
      { label: c.quickRatio, value: ratio(stats?.quickRatio) },
    ]),
    group(c.shareholderReturns, <UsersRound size={16} />, [
      { label: c.dividendRate, value: money(stats?.dividendRate) },
      { label: c.dividendYield, value: percent(stats?.dividendYield, true) },
    ]),
  ];

  return (
    <div className="space-y-8">
      <section id="statistics" className="scroll-mt-24 space-y-3">
        <SectionHeading icon={<ChartNoAxesCombined size={18} />} title={c.statistics} />
        <div className="grid gap-3 lg:grid-cols-2">{statGroups}</div>
      </section>

      <section id="analysis" className="scroll-mt-24 space-y-3">
        <SectionHeading icon={<BarChart3 size={18} />} title={c.analysts} />
        <div className="grid gap-3 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-background/70 p-4">
            <h4 className="mb-3 font-display text-sm font-semibold">{c.target}</h4>
            {targetRangeValid ? (
              <>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{c.currentPrice}</p>
                    <p className="mt-1 font-display text-2xl font-bold">{money(currentPrice)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{c.average}</p>
                    <p className="mt-1 font-display text-2xl font-bold text-primary">
                      {money(targetMean)}
                    </p>
                  </div>
                </div>
                <div className="relative mt-6 h-2 rounded-full bg-secondary">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-destructive/60 via-primary/50 to-success/70" />
                  <span
                    className="absolute -top-1.5 h-5 w-1 rounded-full bg-foreground"
                    style={{ left: `${targetPosition(currentPrice!)}%` }}
                    title={`${c.currentPrice}: ${money(currentPrice)}`}
                  />
                  <span
                    className="absolute -top-1 h-4 w-1 rounded-full bg-primary"
                    style={{ left: `${targetPosition(targetMean!)}%` }}
                    title={`${c.average}: ${money(targetMean)}`}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>
                    {c.low} {money(targetLow)}
                  </span>
                  <span>
                    {c.high} {money(targetHigh)}
                  </span>
                </div>
                {currentPrice! > 0 && (
                  <p className="mt-4 text-sm">
                    {c.upside}:{" "}
                    <strong
                      className={targetMean! >= currentPrice! ? "text-success" : "text-destructive"}
                    >
                      {percent((targetMean! / currentPrice! - 1) * 100, true)}
                    </strong>
                  </p>
                )}
              </>
            ) : (
              <p className="py-4 text-sm text-muted-foreground">{c.unavailable}</p>
            )}
          </section>
          <section className="rounded-xl border border-border bg-background/70 p-4">
            <h4 className="mb-3 font-display text-sm font-semibold">{c.consensus}</h4>
            {latestRecommendation && totalVotes > 0 ? (
              <>
                <div className="flex h-3 overflow-hidden rounded-full bg-secondary">
                  {voteLabels.map((key, index) =>
                    latestRecommendation[key] > 0 ? (
                      <span
                        key={key}
                        className={voteColors[index]}
                        style={{ width: `${(latestRecommendation[key] / totalVotes) * 100}%` }}
                        title={`${voteNames[index]}: ${latestRecommendation[key]}`}
                      />
                    ) : null,
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                  {voteLabels.map((key, index) => (
                    <div key={key} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <i className={`h-2 w-2 rounded-full ${voteColors[index]}`} />
                        {voteNames[index]}
                      </span>
                      <strong className="tabular-nums">{latestRecommendation[key]}</strong>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {recommendations.slice(0, 4).map((item) => (
                    <span key={item.period} className="mr-3">
                      {item.period}: {voteLabels.reduce((sum, key) => sum + item[key], 0)}
                    </span>
                  ))}
                </p>
              </>
            ) : (
              <p className="py-4 text-sm text-muted-foreground">{c.unavailable}</p>
            )}
          </section>
        </div>

        <section className="rounded-xl border border-border bg-background/70 p-4">
          <h4 className="mb-3 font-display text-sm font-semibold">{c.estimates}</h4>
          {estimates.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-border text-xs text-muted-foreground">
                  <tr>
                    {[
                      c.period,
                      c.epsAverage,
                      c.epsRange,
                      c.revenueAverage,
                      c.growth,
                      c.analystsCount,
                    ].map((label) => (
                      <th key={label} className="px-3 py-2 font-medium">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {estimates.map((item) => (
                    <tr key={item.period} className="hover:bg-secondary/40">
                      <th className="px-3 py-2.5 font-semibold">
                        {item.endDate
                          ? new Date(item.endDate).toLocaleDateString(loc, {
                              month: "short",
                              year: "numeric",
                            })
                          : fmtPeriod(item.period)}
                      </th>
                      <td className="px-3 py-2.5 tabular-nums">{money(item.epsAverage)}</td>
                      <td className="px-3 py-2.5 tabular-nums">
                        {item.epsLow == null || item.epsHigh == null
                          ? "—"
                          : `${money(item.epsLow)} – ${money(item.epsHigh)}`}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">
                        {money(item.revenueAverage, true)}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">{percent(item.epsGrowth)}</td>
                      <td className="px-3 py-2.5 tabular-nums">{number(item.analystCount, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">{c.unavailable}</p>
          )}
        </section>
        <section className="grid gap-3 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-background/70 p-4">
            <h4 className="mb-3 font-display text-sm font-semibold">{c.revisions}</h4>
            {estimates.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="border-b border-border text-xs text-muted-foreground">
                    <tr>
                      {[c.period, c.epsTrend, c.upRevisions, c.downRevisions].map((label) => (
                        <th key={label} className="px-3 py-2 font-medium">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {estimates.map((item) => (
                      <tr key={item.period}>
                        <th className="px-3 py-2.5 font-semibold">
                          {item.endDate
                            ? new Date(item.endDate).toLocaleDateString(loc, {
                                month: "short",
                                year: "numeric",
                              })
                            : fmtPeriod(item.period)}
                        </th>
                        <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                          {money(item.eps30DaysAgo)} → {money(item.epsCurrent)}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">
                          {number(item.revisionsUp30Days, 0)}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">
                          {number(item.revisionsDown30Days, 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-4 text-sm text-muted-foreground">{c.unavailable}</p>
            )}
          </section>
          <section className="rounded-xl border border-border bg-background/70 p-4">
            <h4 className="mb-3 font-display text-sm font-semibold">{c.surprises}</h4>
            {earningsHistory.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="border-b border-border text-xs text-muted-foreground">
                    <tr>
                      {[c.period, c.actualEps, c.estimatedEps, c.surprisePercent].map((label) => (
                        <th key={label} className="px-3 py-2 font-medium">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {earningsHistory.map((item) => (
                      <tr key={item.period}>
                        <th className="px-3 py-2.5 font-semibold">
                          {item.quarter ? reportDate(item.quarter) : fmtPeriod(item.period)}
                        </th>
                        <td className="px-3 py-2.5 tabular-nums">{money(item.epsActual)}</td>
                        <td className="px-3 py-2.5 tabular-nums">{money(item.epsEstimate)}</td>
                        <td className="px-3 py-2.5 tabular-nums">
                          {percent(item.surprisePercent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-4 text-sm text-muted-foreground">{c.unavailable}</p>
            )}
          </section>
        </section>
      </section>

      <section id="holders" className="scroll-mt-24 space-y-3">
        <SectionHeading icon={<UsersRound size={18} />} title={c.holders} />
        <div className="grid gap-3 sm:grid-cols-3">
          <OwnershipCard
            label={c.insiderOwnership}
            value={percent(research?.ownership.insiderPercent)}
          />
          <OwnershipCard
            label={c.institutionalOwnership}
            value={percent(research?.ownership.institutionalPercent)}
          />
          <OwnershipCard
            label={c.institutionsCount}
            value={number(research?.ownership.institutionsCount, 0)}
          />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <HolderTable
            title={c.institutions}
            headers={[c.holder, c.percentHeld, c.value, c.reported]}
            rows={institutions.map((item) => [
              item.name,
              percent(item.percentHeld),
              money(item.value, true),
              reportDate(item.reportDate),
            ])}
            empty={c.unavailable}
          />
          <HolderTable
            title={c.insiderHolders}
            headers={[c.holder, c.relation, c.shares, c.reported]}
            rows={insiders.map((item) => [
              item.name,
              item.relation || "—",
              number(item.shares, 0),
              reportDate(item.reportDate),
            ])}
            empty={c.unavailable}
          />
        </div>
      </section>
      <p className="text-xs text-muted-foreground">
        {c.source}
        {retrievedAt ? ` ${c.retrieved}: ${retrievedAt}.` : ""}
      </p>
    </div>
  );
}

function SectionHeading({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <h4 className="flex items-center gap-2 font-display text-base font-semibold">
      <span className="text-primary">{icon}</span>
      {title}
    </h4>
  );
}

function OwnershipCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/70 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function HolderTable({
  title,
  headers,
  rows,
  empty,
}: {
  title: string;
  headers: string[];
  rows: string[][];
  empty: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-background/70">
      <h4 className="px-4 pb-2 pt-4 font-display text-sm font-semibold">{title}</h4>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] text-left text-sm">
            <thead className="border-y border-border text-xs text-muted-foreground">
              <tr>
                {headers.map((header) => (
                  <th key={header} className="px-3 py-2 font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {rows.map((row) => (
                <tr key={row.join("|")} className="hover:bg-secondary/40">
                  {row.map((cell, index) =>
                    index === 0 ? (
                      <th
                        key={index}
                        className="max-w-48 truncate px-3 py-2.5 font-medium"
                        title={cell}
                      >
                        {cell}
                      </th>
                    ) : (
                      <td key={index} className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                        {cell}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-4 py-4 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}
