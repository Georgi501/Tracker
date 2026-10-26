import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { marketStats } from "@/lib/market.functions";
import { languageLocale, type Lang } from "@/lib/i18n";
import { ProGate, BarsSilhouette } from "@/components/ProFeatures";

const COPY = {
  en: {
    title: "Company research",
    desc: "Explore reported fundamentals, analyst data and dividend information for this company.",
    quality: "Fundamentals",
    roe: "Return on equity",
    debt: "Debt / equity",
    operatingMargin: "Operating margin",
    profitMargin: "Profit margin",
    growth: "Reported growth",
    revenue: "Revenue",
    earnings: "Earnings",
    analysts: "Analyst outlook",
    target: "Average 1-year target",
    recommendation: "Analyst view",
    returns: "Shareholder returns",
    dividend: "Annual dividend",
    yield: "Dividend yield",
    loading: "Loading company data…",
    unavailable: "Company data is unavailable.",
    loadFailed: "Could not load company data.",
    retry: "Try again",
    source: "Source: Yahoo Finance. Data may be delayed or incomplete; not investment advice.",
  },
  bg: {
    title: "Анализ на компанията",
    desc: "Разгледай отчетени фундаментални показатели, данни от анализатори и дивиденти.",
    quality: "Фундаментални показатели",
    roe: "Възвръщаемост на капитала",
    debt: "Дълг / собствен капитал",
    operatingMargin: "Оперативен марж",
    profitMargin: "Нетен марж",
    growth: "Отчетен ръст",
    revenue: "Приходи",
    earnings: "Печалба",
    analysts: "Анализаторска перспектива",
    target: "Средна целева цена (1 г.)",
    recommendation: "Оценка на анализаторите",
    returns: "Доходност за акционерите",
    dividend: "Годишен дивидент",
    yield: "Дивидентна доходност",
    loading: "Зареждане на данните за компанията…",
    unavailable: "Данните за компанията не са налични.",
    loadFailed: "Данните за компанията не се заредиха.",
    retry: "Опитай отново",
    source:
      "Източник: Yahoo Finance. Данните може да са забавени или непълни; това не е инвестиционен съвет.",
  },
  de: {
    title: "Unternehmensanalyse",
    desc: "Berichtete Fundamentaldaten, Analystendaten und Dividendeninformationen.",
    quality: "Fundamentaldaten",
    roe: "Eigenkapitalrendite",
    debt: "Verschuldungsgrad",
    operatingMargin: "Operative Marge",
    profitMargin: "Nettomarge",
    growth: "Berichtetes Wachstum",
    revenue: "Umsatz",
    earnings: "Gewinn",
    analysts: "Analystenausblick",
    target: "Durchschnittliches 1-Jahres-Kursziel",
    recommendation: "Analystenmeinung",
    returns: "Aktionärsrendite",
    dividend: "Jährliche Dividende",
    yield: "Dividendenrendite",
    loading: "Unternehmensdaten werden geladen…",
    unavailable: "Unternehmensdaten nicht verfügbar.",
    loadFailed: "Unternehmensdaten konnten nicht geladen werden.",
    retry: "Erneut versuchen",
    source:
      "Quelle: Yahoo Finance. Daten können verzögert oder unvollständig sein; keine Anlageberatung.",
  },
  es: {
    title: "Análisis de la empresa",
    desc: "Fundamentales publicados, datos de analistas e información sobre dividendos.",
    quality: "Fundamentales",
    roe: "Rentabilidad sobre patrimonio",
    debt: "Deuda / patrimonio",
    operatingMargin: "Margen operativo",
    profitMargin: "Margen neto",
    growth: "Crecimiento publicado",
    revenue: "Ingresos",
    earnings: "Beneficios",
    analysts: "Perspectiva de analistas",
    target: "Objetivo medio a 1 año",
    recommendation: "Opinión de analistas",
    returns: "Rentabilidad para accionistas",
    dividend: "Dividendo anual",
    yield: "Rentabilidad por dividendo",
    loading: "Cargando datos de la empresa…",
    unavailable: "Datos de la empresa no disponibles.",
    loadFailed: "No se pudieron cargar los datos de la empresa.",
    retry: "Intentar de nuevo",
    source:
      "Fuente: Yahoo Finance. Los datos pueden estar retrasados o incompletos; no es asesoramiento financiero.",
  },
  it: {
    title: "Analisi aziendale",
    desc: "Fondamentali dichiarati, dati degli analisti e informazioni sui dividendi.",
    quality: "Fondamentali",
    roe: "Rendimento del capitale",
    debt: "Debito / capitale",
    operatingMargin: "Margine operativo",
    profitMargin: "Margine netto",
    growth: "Crescita dichiarata",
    revenue: "Ricavi",
    earnings: "Utili",
    analysts: "Prospettive degli analisti",
    target: "Obiettivo medio a 1 anno",
    recommendation: "Opinione degli analisti",
    returns: "Rendimento per gli azionisti",
    dividend: "Dividendo annuale",
    yield: "Rendimento da dividendo",
    loading: "Caricamento dati aziendali…",
    unavailable: "Dati aziendali non disponibili.",
    loadFailed: "Impossibile caricare i dati aziendali.",
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
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["market-stats", symbol],
    queryFn: () => fetchStats({ data: { symbol } }),
    staleTime: 300_000,
  });
  const loc = languageLocale(lang);
  const number = (value: number | null | undefined, digits = 1) =>
    value == null
      ? "—"
      : new Intl.NumberFormat(loc, { maximumFractionDigits: digits }).format(value);
  const percent = (value: number | null | undefined) =>
    value == null ? "—" : `${number(value * 100)}%`;
  const money = (value: number | null | undefined) =>
    value == null
      ? "—"
      : data?.currency
        ? new Intl.NumberFormat(loc, {
            style: "currency",
            currency: data.currency,
            maximumFractionDigits: 2,
          }).format(value)
        : number(value, 2);
  const recommendation = data?.recommendation?.replaceAll("_", " ") ?? null;
  const panel = (title: string, rows: [string, string][]) => (
    <section className="rounded-xl border border-border bg-background/70 p-4">
      <h4 className="mb-3 font-display text-sm font-semibold">{title}</h4>
      <dl className="space-y-2">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-3 border-b border-border/70 pb-2 text-sm last:border-0 last:pb-0"
          >
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );

  if (isLoading) return <p className="py-6 text-sm text-muted-foreground">{c.loading}</p>;
  if (isError)
    return (
      <div className="space-y-3 py-4">
        <p role="alert" className="text-sm text-destructive">
          {c.loadFailed}
        </p>
        <Button variant="outline" onClick={() => void refetch()}>
          {c.retry}
        </Button>
      </div>
    );
  if (!data) return <p className="py-6 text-sm text-muted-foreground">{c.unavailable}</p>;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        {panel(c.quality, [
          [c.roe, percent(data.returnOnEquity)],
          [c.operatingMargin, percent(data.operatingMargins)],
          [c.profitMargin, percent(data.profitMargins)],
          [c.debt, data.debtToEquity == null ? "—" : `${number(data.debtToEquity)}%`],
        ])}
        {panel(c.analysts, [
          [c.target, money(data.target)],
          [c.recommendation, recommendation ?? "—"],
        ])}
        {panel(c.returns, [
          [c.dividend, money(data.dividendRate)],
          [c.yield, data.dividendYield == null ? "—" : `${number(data.dividendYield)}%`],
        ])}
      </div>
      <section className="rounded-xl border border-border bg-background/70 p-4">
        <h4 className="mb-3 font-display text-sm font-semibold">{c.growth}</h4>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{c.revenue}</dt>
            <dd className="font-semibold tabular-nums">{percent(data.revenueGrowth)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{c.earnings}</dt>
            <dd className="font-semibold tabular-nums">{percent(data.earningsGrowth)}</dd>
          </div>
        </dl>
      </section>
      <p className="text-xs text-muted-foreground">{c.source}</p>
    </div>
  );
}
