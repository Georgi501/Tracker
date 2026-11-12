import { useId, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChartTooltipContent } from "@/components/ChartTooltipContent";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Sankey,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/AppShell";
import { FinancialBarChart, type ChartPoint } from "@/components/FinancialBarChart";
import { buildAnnualAxis, type AnnualSlot } from "@/lib/financial-series";
import { marketFinancialSeries, type FinancialSeriesRow } from "@/lib/market.functions";
import { languageLocale, type Lang } from "@/lib/i18n";

type Period = "annual" | "quarterly" | "trailing";
type MetricKey =
  "revenue" | "operatingIncome" | "netIncome" | "dilutedEps" | "operatingCashFlow" | "freeCashFlow";

const COPY = {
  en: {
    title: "Financial statements",
    desc: "Reported financial statements and company performance over time.",
    annual: "Annual",
    quarterly: "Quarterly",
    trailing: "TTM",
    periodLabel: "Statement period",
    rangeLabel: "History range",
    fiscalYear: (year: number) => `FY ${year}`,
    availability: (available: number, total: number) => `${available} of ${total} years with data`,
    noData: "No data",
    historyQuarterly: (available: number) =>
      `${available} quarterly period${available === 1 ? "" : "s"} available`,
    historyTtm: (available: number) =>
      `${available} TTM period${available === 1 ? "" : "s"} available`,
    history: "Reported financial history",
    period: "Period",
    years: (n: number) => `${n}Y`,
    revenue: "Revenue",
    operatingIncome: "Operating income",
    netIncome: "Net income",
    dilutedEps: "Diluted EPS",
    operatingCashFlow: "Operating cash flow",
    freeCashFlow: "Free cash flow",
    change: (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`,
    changeLabel: "Change between the first and last available values",
    changeUnavailable: "A percentage needs a positive start and a non-negative end.",
    previous: "Previous",
    latest: "Latest",
    showValues: "View values",
    noMetricData: "No data for this period.",
    unavailable: "No data for this period.",
    loadFailed: "Could not load financial data.",
    retry: "Try again",
    breakdown: "Revenue & expense breakdown",
    breakdownSubtitle: "Follow reported revenue through costs to operating and net income.",
    breakdownPeriod: "Breakdown period",
    costOfRevenue: "Cost of revenue",
    grossProfit: "Gross profit",
    operatingExpenseLabel: "Operating expenses",
    otherTaxes: "Other & taxes",
    breakdownUnavailable:
      "A revenue breakdown is unavailable because the reported totals are missing or include losses that this flow chart cannot represent.",
    breakdownNote:
      "Expense flows are calculated as differences between reported totals. Values use the company's reporting currency and are not adjusted for inflation.",
    source: "Source: Yahoo Finance. Data may be delayed or incomplete; not investment advice.",
  },
  bg: {
    title: "Финансови отчети",
    desc: "Отчетени финансови показатели и представяне на компанията във времето.",
    annual: "Годишно",
    quarterly: "Тримесечно",
    trailing: "TTM",
    periodLabel: "Период на отчета",
    rangeLabel: "Исторически период",
    fiscalYear: (year: number) => `Фин. г. ${year}`,
    availability: (available: number, total: number) => `${available} от ${total} години с данни`,
    noData: "Няма данни",
    historyQuarterly: (available: number) => `Налични са ${available} тримесечни периода.`,
    historyTtm: (available: number) => `Налични са ${available} TTM периода.`,
    history: "Исторически финансови отчети",
    period: "Период",
    years: (n: number) => `${n} г.`,
    revenue: "Приходи",
    operatingIncome: "Оперативна печалба",
    netIncome: "Нетна печалба",
    dilutedEps: "Разредена печалба на акция",
    operatingCashFlow: "Паричен поток от дейността",
    freeCashFlow: "Свободен паричен поток",
    change: (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`,
    changeLabel: "Промяна между първата и последната налична стойност",
    changeUnavailable: "За процент е нужна положителна начална и неотрицателна крайна стойност.",
    previous: "Предишна",
    latest: "Последна",
    showValues: "Виж стойностите",
    noMetricData: "Няма данни за този период.",
    unavailable: "Няма данни за този период.",
    loadFailed: "Финансовите данни не се заредиха.",
    retry: "Опитай отново",
    breakdown: "Разбивка на приходите и разходите",
    breakdownSubtitle:
      "Виж как отчетените приходи преминават през разходите до оперативната и нетната печалба.",
    breakdownPeriod: "Период на разбивката",
    costOfRevenue: "Себестойност на приходите",
    grossProfit: "Брутна печалба",
    operatingExpenseLabel: "Оперативни разходи",
    otherTaxes: "Други разходи и данъци",
    breakdownUnavailable:
      "Разбивката не е налична, защото липсват отчетени стойности или има загуба, която тази диаграма не може да изобрази.",
    breakdownNote:
      "Разходните потоци са изчислени като разлики между отчетените стойности. Данните са във валутата на отчетите и не са коригирани за инфлация.",
    source:
      "Източник: Yahoo Finance. Данните може да са забавени или непълни; това не е инвестиционен съвет.",
  },
  de: {
    title: "Finanzberichte",
    desc: "Berichtete Finanzdaten und Unternehmensentwicklung im Zeitverlauf.",
    annual: "Jährlich",
    quarterly: "Quartalsweise",
    trailing: "TTM",
    periodLabel: "Berichtszeitraum",
    rangeLabel: "Historischer Zeitraum",
    fiscalYear: (year: number) => `GJ ${year}`,
    availability: (available: number, total: number) =>
      `${available} von ${total} Jahren mit Daten`,
    noData: "Keine Daten",
    historyQuarterly: (available: number) => `${available} Quartalsperioden verfügbar`,
    historyTtm: (available: number) => `${available} TTM-Zeiträume verfügbar`,
    history: "Gemeldete Finanzhistorie",
    period: "Zeitraum",
    years: (n: number) => `${n}J`,
    revenue: "Umsatz",
    operatingIncome: "Betriebsergebnis",
    netIncome: "Nettogewinn",
    dilutedEps: "Verwässertes EPS",
    operatingCashFlow: "Operativer Cashflow",
    freeCashFlow: "Free Cashflow",
    change: (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`,
    changeLabel: "Veränderung zwischen dem ersten und letzten verfügbaren Wert",
    changeUnavailable:
      "Ein Prozentvergleich braucht einen positiven Start und einen nicht negativen Endwert.",
    previous: "Vorheriger",
    latest: "Aktuell",
    showValues: "Werte anzeigen",
    noMetricData: "Keine Daten für diesen Zeitraum.",
    unavailable: "Keine Daten für diesen Zeitraum.",
    loadFailed: "Finanzdaten konnten nicht geladen werden.",
    retry: "Erneut versuchen",
    breakdown: "Umsatz- und Kostenaufteilung",
    breakdownSubtitle:
      "Verfolge den gemeldeten Umsatz über die Kosten bis zum Betriebs- und Nettogewinn.",
    breakdownPeriod: "Zeitraum der Aufteilung",
    costOfRevenue: "Umsatzkosten",
    grossProfit: "Bruttogewinn",
    operatingExpenseLabel: "Betriebskosten",
    otherTaxes: "Sonstiges & Steuern",
    breakdownUnavailable:
      "Keine Aufteilung verfügbar, da gemeldete Werte fehlen oder Verluste in diesem Flussdiagramm nicht dargestellt werden können.",
    breakdownNote:
      "Kostenflüsse werden als Differenzen zwischen gemeldeten Summen berechnet. Werte sind nicht inflationsbereinigt.",
    source:
      "Quelle: Yahoo Finance. Daten können verzögert oder unvollständig sein; keine Anlageberatung.",
  },
  es: {
    title: "Estados financieros",
    desc: "Estados financieros publicados y evolución de la empresa.",
    annual: "Anual",
    quarterly: "Trimestral",
    trailing: "TTM",
    periodLabel: "Período del informe",
    rangeLabel: "Período histórico",
    fiscalYear: (year: number) => `AF ${year}`,
    availability: (available: number, total: number) => `${available} de ${total} años con datos`,
    noData: "Sin datos",
    historyQuarterly: (available: number) => `${available} períodos trimestrales disponibles`,
    historyTtm: (available: number) => `${available} períodos TTM disponibles`,
    history: "Historial financiero publicado",
    period: "Período",
    years: (n: number) => `${n}A`,
    revenue: "Ingresos",
    operatingIncome: "Resultado operativo",
    netIncome: "Beneficio neto",
    dilutedEps: "BPA diluido",
    operatingCashFlow: "Flujo de caja operativo",
    freeCashFlow: "Flujo de caja libre",
    change: (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`,
    changeLabel: "Cambio entre el primer y el último valor disponible",
    changeUnavailable: "El porcentaje requiere un inicio positivo y un final no negativo.",
    previous: "Anterior",
    latest: "Último",
    showValues: "Ver valores",
    noMetricData: "No hay datos para este período.",
    unavailable: "No hay datos para este período.",
    loadFailed: "No se pudieron cargar los datos financieros.",
    retry: "Intentar de nuevo",
    breakdown: "Desglose de ingresos y gastos",
    breakdownSubtitle:
      "Sigue los ingresos declarados a través de los gastos hasta el beneficio operativo y neto.",
    breakdownPeriod: "Período del desglose",
    costOfRevenue: "Coste de ingresos",
    grossProfit: "Beneficio bruto",
    operatingExpenseLabel: "Gastos operativos",
    otherTaxes: "Otros e impuestos",
    breakdownUnavailable:
      "No hay desglose porque faltan valores publicados o hay pérdidas que este gráfico no puede representar.",
    breakdownNote:
      "Los flujos de gastos se calculan como diferencias entre totales publicados. Los valores no están ajustados por inflación.",
    source:
      "Fuente: Yahoo Finance. Los datos pueden estar retrasados o incompletos; no es asesoramiento financiero.",
  },
  it: {
    title: "Bilanci",
    desc: "Dati finanziari dichiarati e andamento dell'azienda nel tempo.",
    annual: "Annuale",
    quarterly: "Trimestrale",
    trailing: "TTM",
    periodLabel: "Periodo del bilancio",
    rangeLabel: "Intervallo storico",
    fiscalYear: (year: number) => `Eserc. ${year}`,
    availability: (available: number, total: number) => `${available} su ${total} anni con dati`,
    noData: "Nessun dato",
    historyQuarterly: (available: number) => `${available} periodi trimestrali disponibili`,
    historyTtm: (available: number) => `${available} periodi TTM disponibili`,
    history: "Storico finanziario dichiarato",
    period: "Periodo",
    years: (n: number) => `${n}A`,
    revenue: "Ricavi",
    operatingIncome: "Risultato operativo",
    netIncome: "Utile netto",
    dilutedEps: "EPS diluito",
    operatingCashFlow: "Flusso di cassa operativo",
    freeCashFlow: "Flusso di cassa libero",
    change: (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`,
    changeLabel: "Variazione tra il primo e l'ultimo valore disponibile",
    changeUnavailable:
      "La percentuale richiede un valore iniziale positivo e uno finale non negativo.",
    previous: "Precedente",
    latest: "Ultimo",
    showValues: "Mostra valori",
    noMetricData: "Nessun dato per questo periodo.",
    unavailable: "Nessun dato per questo periodo.",
    loadFailed: "Impossibile caricare i dati finanziari.",
    retry: "Riprova",
    breakdown: "Ripartizione di ricavi e spese",
    breakdownSubtitle:
      "Segui i ricavi dichiarati attraverso i costi fino al reddito operativo e netto.",
    breakdownPeriod: "Periodo della ripartizione",
    costOfRevenue: "Costo dei ricavi",
    grossProfit: "Utile lordo",
    operatingExpenseLabel: "Spese operative",
    otherTaxes: "Altri e imposte",
    breakdownUnavailable:
      "Ripartizione non disponibile: mancano valori dichiarati o sono presenti perdite che questo grafico non può rappresentare.",
    breakdownNote:
      "I flussi di spesa sono calcolati come differenze tra i totali dichiarati. I valori non sono corretti per l'inflazione.",
    source:
      "Fonte: Yahoo Finance. I dati possono essere ritardati o incompleti; non è consulenza finanziaria.",
  },
} as const satisfies Record<Lang, Record<string, string | ((...args: number[]) => string)>>;

const METRICS: { key: MetricKey; label: MetricKey }[] = [
  { key: "revenue", label: "revenue" },
  { key: "operatingIncome", label: "operatingIncome" },
  { key: "netIncome", label: "netIncome" },
  { key: "dilutedEps", label: "dilutedEps" },
  { key: "operatingCashFlow", label: "operatingCashFlow" },
  { key: "freeCashFlow", label: "freeCashFlow" },
];

type FlowNode = { name: string; color: string };
type FlowData = { nodes: FlowNode[]; links: { source: number; target: number; value: number }[] };
type FinancialCopy = {
  [K in keyof (typeof COPY)["en"]]: (typeof COPY)["en"][K] extends (...args: number[]) => string
    ? (typeof COPY)["en"][K]
    : string;
};
type FlowNodeProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  payload?: { name?: string; color?: string; value?: number };
};

export function ProFinancials({ symbol, lang }: { symbol: string; lang: Lang }) {
  const c = COPY[lang];
  return (
    <Card>
      <div className="mb-4">
        <h2 className="font-display font-semibold">{c.title}</h2>
        <p className="text-sm text-muted-foreground">{c.desc}</p>
      </div>
      <Financials symbol={symbol} lang={lang} />
    </Card>
  );
}

function Financials({ symbol, lang }: { symbol: string; lang: Lang }) {
  const c = COPY[lang];
  const [period, setPeriod] = useState<Period>("annual");
  const [years, setYears] = useState(5);
  const fetchSeries = useServerFn(marketFinancialSeries);
  const query = useQuery({
    queryKey: ["market-financials", symbol, period, years],
    queryFn: () => fetchSeries({ data: { symbol, period, years } }),
    staleTime: 30 * 60_000,
  });
  const locale = languageLocale(lang);
  const axis = useMemo(
    () => (period === "annual" && query.data ? buildAnnualAxis(query.data.rows, years) : null),
    [period, years, query.data],
  );
  const rows = axis
    ? axis.flatMap((slot) => (slot.row ? [slot.row] : []))
    : (query.data?.rows ?? []);
  const requestedPeriods = years * 4;
  const compact = (value: number, digits = 1) =>
    new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: digits,
      ...(query.data?.currency
        ? { style: "currency" as const, currency: query.data.currency }
        : {}),
    }).format(value);
  const formatMetric = (key: MetricKey, value: number) =>
    key === "dilutedEps"
      ? new Intl.NumberFormat(locale, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          ...(query.data?.currency
            ? { style: "currency" as const, currency: query.data.currency }
            : {}),
        }).format(value)
      : compact(value);
  const periods: [Period, string][] = [
    ["annual", c.annual],
    ["quarterly", c.quarterly],
    ["trailing", c.trailing],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label={c.periodLabel} className="flex rounded-lg bg-secondary p-1">
          {periods.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={period === value}
              onClick={() => setPeriod(value)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${period === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div role="group" aria-label={c.rangeLabel} className="flex gap-1">
          {[3, 5, 10].map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={years === value ? "secondary" : "ghost"}
              aria-pressed={years === value}
              onClick={() => setYears(value)}
            >
              {c.years(value)}
            </Button>
          ))}
        </div>
      </div>

      {period !== "annual" && rows.length > 0 && rows.length < requestedPeriods && (
        <p role="status" className="text-xs text-muted-foreground">
          {period === "quarterly" ? c.historyQuarterly(rows.length) : c.historyTtm(rows.length)}
        </p>
      )}

      {query.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {METRICS.map((metric) => (
            <div key={metric.key} className="h-40 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="space-y-3 py-4">
          <p role="alert" className="text-sm text-destructive">
            {c.loadFailed}
          </p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            {c.retry}
          </Button>
        </div>
      ) : !rows.length ? (
        <p className="py-6 text-sm text-muted-foreground">{c.unavailable}</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {METRICS.map((metric) => (
              <MetricCard
                key={metric.key}
                rows={rows}
                metric={metric}
                title={c[metric.label]}
                format={(value) => formatMetric(metric.key, value)}
                locale={locale}
                period={period}
                axis={axis}
                copy={c}
              />
            ))}
          </div>
          <FinancialHistoryTable
            rows={rows}
            copy={c}
            format={(key, value) =>
              key === "dilutedEps" ? formatMetric("dilutedEps", value) : compact(value)
            }
          />
          <RevenueBreakdown
            rows={rows}
            currency={query.data?.currency ?? null}
            locale={locale}
            copy={c}
            period={period}
          />
          <p className="text-xs text-muted-foreground">{c.source}</p>
        </>
      )}
    </div>
  );
}

type StatementKey = Exclude<keyof FinancialSeriesRow, "date">;
const METRIC_CHART_COLORS: Record<MetricKey, string> = {
  revenue: "var(--chart-1)",
  operatingIncome: "var(--chart-2)",
  netIncome: "var(--chart-3)",
  dilutedEps: "var(--chart-4)",
  operatingCashFlow: "var(--chart-5)",
  freeCashFlow: "var(--success)",
};

function FinancialHistoryTable({
  rows,
  copy,
  format,
}: {
  rows: FinancialSeriesRow[];
  copy: FinancialCopy;
  format: (key: StatementKey, value: number) => string;
}) {
  const columns: { key: StatementKey; label: string }[] = [
    { key: "revenue", label: copy.revenue },
    { key: "costOfRevenue", label: copy.costOfRevenue },
    { key: "grossProfit", label: copy.grossProfit },
    { key: "operatingIncome", label: copy.operatingIncome },
    { key: "operatingExpense", label: copy.operatingExpenseLabel },
    { key: "netIncome", label: copy.netIncome },
    { key: "dilutedEps", label: copy.dilutedEps },
    { key: "operatingCashFlow", label: copy.operatingCashFlow },
    { key: "freeCashFlow", label: copy.freeCashFlow },
  ];
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-background/70">
      <h4 className="px-4 pb-2 pt-4 font-display text-sm font-semibold">{copy.history}</h4>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-y border-border text-xs text-muted-foreground">
            <tr>
              <th className="sticky left-0 bg-card px-3 py-2 font-medium">{copy.period}</th>
              {columns.map((column) => (
                <th key={column.key} className="whitespace-nowrap px-3 py-2 text-right font-medium">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {[...rows].reverse().map((row) => (
              <tr key={row.date} className="hover:bg-secondary/40">
                <th className="sticky left-0 bg-card px-3 py-2.5 font-semibold">{row.date}</th>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums"
                  >
                    {row[column.key] == null ? "—" : format(column.key, row[column.key]!)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MetricCard({
  rows,
  metric,
  title,
  format,
  locale,
  period,
  axis,
  copy,
}: {
  rows: FinancialSeriesRow[];
  metric: { key: MetricKey; label: MetricKey };
  title: string;
  format: (value: number) => string;
  locale: string;
  period: Period;
  axis: AnnualSlot[] | null;
  copy: FinancialCopy;
}) {
  const color = METRIC_CHART_COLORS[metric.key];
  const values = rows.flatMap((row) => {
    const value = row[metric.key];
    return value == null ? [] : [{ date: row.date, value }];
  });
  const first = values[0]?.value;
  const last = values.at(-1)?.value;
  const firstDate = values[0]?.date;
  const lastDate = values.at(-1)?.date;
  const change =
    values.length >= 2 && first != null && first > 0 && last != null && last >= 0
      ? (last / first - 1) * 100
      : null;
  const periodLabel = period === "quarterly" ? "short" : "medium";
  const formatDate = (date: string) => {
    const parsed = new Date(`${date}T12:00:00`);
    return Number.isNaN(parsed.getTime())
      ? date
      : parsed.toLocaleDateString(locale, { dateStyle: periodLabel });
  };
  const chartPoints: ChartPoint[] = axis
    ? axis.map((slot) => ({
        key: `${slot.year}-${slot.expectedDate}`,
        heading: copy.fiscalYear(slot.year),
        axisLabel: `’${String(slot.year).slice(-2)}`,
        value: slot.row?.[metric.key] ?? null,
      }))
    : values.map((point) => ({
        key: point.date,
        heading: formatDate(point.date),
        value: point.value,
      }));
  const dateRange =
    firstDate && lastDate
      ? firstDate === lastDate
        ? formatDate(lastDate)
        : `${formatDate(firstDate)} – ${formatDate(lastDate)}`
      : "";
  const changeDescription =
    change == null ? copy.changeUnavailable : `${copy.changeLabel}: ${dateRange}`;

  if (!values.length) {
    return (
      <Card className="border-border/70 bg-gradient-to-br from-card via-card to-secondary/20 p-4">
        <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
        <p className="mt-2 text-sm text-muted-foreground">{copy.noMetricData}</p>
      </Card>
    );
  }

  return (
    <Card className="group relative overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-secondary/20 p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
          {(axis ? values.length >= 1 : values.length >= 3) && last != null && (
            <p className="mt-1 font-display text-2xl font-bold tabular-nums tracking-tight">
              {format(last)}
            </p>
          )}
        </div>
        {values.length >= 2 && (
          <span
            aria-label={changeDescription}
            title={changeDescription}
            className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${change == null ? "bg-secondary text-muted-foreground" : change >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
          >
            {change == null ? "—" : copy.change(change)}
          </span>
        )}
      </div>

      {!axis && values.length === 1 && lastDate && last != null ? (
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <p className="font-display text-xl font-bold tabular-nums tracking-tight">
            {format(last)}
          </p>
          <time dateTime={lastDate} className="text-xs text-muted-foreground">
            {formatDate(lastDate)}
          </time>
        </div>
      ) : !axis && values.length === 2 ? (
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">{copy.previous}</p>
            <p className="truncate font-display text-lg font-bold tabular-nums tracking-tight">
              {format(values[0]!.value)}
            </p>
            <time
              dateTime={values[0]!.date}
              className="block truncate text-xs text-muted-foreground"
            >
              {formatDate(values[0]!.date)}
            </time>
          </div>
          <span aria-hidden="true" className="text-sm text-muted-foreground">
            →
          </span>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">{copy.latest}</p>
            <p className="truncate font-display text-lg font-bold tabular-nums tracking-tight">
              {format(values[1]!.value)}
            </p>
            <time
              dateTime={values[1]!.date}
              className="block truncate text-xs text-muted-foreground"
            >
              {formatDate(values[1]!.date)}
            </time>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-1 text-[11px] text-muted-foreground">{dateRange}</p>
          {axis && (
            <p className="text-[11px] text-muted-foreground">
              {copy.availability(values.length, axis.length)}
            </p>
          )}
          <FinancialBarChart
            points={chartPoints}
            color={color}
            name={title}
            ariaLabel={`${title} historical chart`}
            noDataLabel={copy.noData}
            format={format}
          />
          <details className="mt-1 text-xs">
            <summary className="w-fit cursor-pointer rounded text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              {copy.showValues}
            </summary>
            <ol
              aria-label={`${title} values by date`}
              className="mt-2 max-h-28 space-y-1 overflow-y-auto"
            >
              {chartPoints.map((point) => (
                <li key={point.key} className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{point.heading}</span>
                  <span className="font-medium tabular-nums">
                    {point.value == null ? copy.noData : format(point.value)}
                  </span>
                </li>
              ))}
            </ol>
          </details>
        </>
      )}
    </Card>
  );
}

function RevenueBreakdown({
  rows,
  currency,
  locale,
  copy,
  period,
}: {
  rows: FinancialSeriesRow[];
  currency: string | null;
  locale: string;
  copy: FinancialCopy;
  period: Period;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const periods = [...rows].reverse().filter(
    (
      item,
    ): item is FinancialSeriesRow & {
      revenue: number;
      grossProfit: number;
      operatingIncome: number;
      netIncome: number;
    } => {
      const { revenue, grossProfit, operatingIncome, netIncome } = item;
      return (
        revenue != null &&
        grossProfit != null &&
        operatingIncome != null &&
        netIncome != null &&
        revenue > 0 &&
        grossProfit >= 0 &&
        grossProfit <= revenue &&
        operatingIncome >= 0 &&
        operatingIncome <= grossProfit &&
        netIncome >= 0 &&
        netIncome <= operatingIncome
      );
    },
  );
  const row = periods.find((item) => item.date === selectedDate) ?? periods[0];
  const revenue = row?.revenue;
  const grossProfit = row?.grossProfit;
  const operatingIncome = row?.operatingIncome;
  const netIncome = row?.netIncome;
  const valid = row != null;

  const format = (value: number) =>
    new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: 1,
      ...(currency ? { style: "currency" as const, currency } : {}),
    }).format(value);
  const formatPeriod = (date: string) => {
    if (period === "annual") return date.slice(0, 4);
    const parsed = new Date(`${date}T12:00:00`);
    return Number.isNaN(parsed.getTime())
      ? date
      : new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(parsed);
  };
  const nodes: FlowNode[] = [
    { name: copy.revenue, color: "var(--chart-2)" },
    { name: copy.costOfRevenue, color: "var(--chart-4)" },
    { name: copy.grossProfit, color: "var(--chart-1)" },
    { name: copy.operatingExpenseLabel, color: "var(--chart-4)" },
    { name: copy.operatingIncome, color: "var(--success)" },
    { name: copy.otherTaxes, color: "var(--chart-4)" },
    { name: copy.netIncome, color: "var(--success)" },
  ];
  const highlights = [
    { name: copy.revenue, value: revenue, color: "var(--chart-2)" },
    { name: copy.grossProfit, value: grossProfit, color: "var(--chart-1)" },
    { name: copy.operatingIncome, value: operatingIncome, color: "var(--success)" },
    { name: copy.netIncome, value: netIncome, color: "var(--success)" },
  ];
  const flow: FlowData = {
    nodes,
    links: row
      ? [
          { source: 0, target: 1, value: row.revenue - row.grossProfit },
          { source: 0, target: 2, value: row.grossProfit },
          { source: 2, target: 3, value: row.grossProfit - row.operatingIncome },
          { source: 2, target: 4, value: row.operatingIncome },
          { source: 4, target: 5, value: row.operatingIncome - row.netIncome },
          { source: 4, target: 6, value: row.netIncome },
        ].filter((link) => link.value > 0)
      : [],
  };
  const renderNode = (props: FlowNodeProps) => {
    const x = props.x ?? 0;
    const y = props.y ?? 0;
    const width = props.width ?? 0;
    const height = props.height ?? 0;
    const name = props.payload?.name ?? "";
    const value = props.payload?.value;
    const right = (props.index ?? 0) % 2 === 1;
    return (
      <g>
        <title>
          {name}
          {value == null ? "" : `: ${format(value)}`}
        </title>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={5}
          fill={props.payload?.color ?? "var(--primary)"}
          stroke="var(--background)"
          strokeWidth={1.5}
        />
        <text
          x={right ? x + width + 6 : x - 6}
          y={y + Math.max(12, height / 2)}
          textAnchor={right ? "start" : "end"}
          fill="var(--foreground)"
          fontSize={11}
          fontWeight={500}
        >
          {name}
        </text>
      </g>
    );
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-card via-card to-primary/[0.06] p-4 shadow-md shadow-primary/[0.04] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="font-display font-semibold">{copy.breakdown}</h4>
          <p className="mt-1 text-xs text-muted-foreground">{copy.breakdownSubtitle}</p>
        </div>
        {row?.date && (
          <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {formatPeriod(row.date)}
          </span>
        )}
      </div>
      {valid ? (
        <>
          <div
            role="group"
            aria-label={copy.breakdownPeriod}
            className="relative mt-5 flex gap-3 overflow-x-auto pb-2 pt-0.5 before:absolute before:left-2 before:right-2 before:top-[7px] before:h-px before:bg-border/80"
          >
            {periods.map((item) => {
              const active = row.date === item.date;
              return (
                <button
                  key={item.date}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedDate(item.date)}
                  className="relative z-10 inline-flex min-w-14 shrink-0 flex-col items-center gap-1.5"
                >
                  <span
                    aria-hidden
                    className={`size-3 rounded-full border-2 border-background transition-all ${
                      active
                        ? "bg-primary ring-4 ring-primary/15"
                        : "bg-muted-foreground/50 hover:bg-primary/60"
                    }`}
                  />
                  <span
                    className={`whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold tabular-nums transition-colors ${
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {formatPeriod(item.date)}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            {highlights.map((item) => (
              <div
                key={item.name}
                className="min-w-0 rounded-xl border border-border/60 bg-background/55 px-3 py-2.5"
              >
                <p className="flex items-center gap-2 truncate text-xs text-muted-foreground">
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.name}
                </p>
                <p className="mt-1 truncate font-display text-base font-semibold tabular-nums tracking-tight sm:text-lg">
                  {item.value == null ? "—" : format(item.value)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 overflow-x-auto rounded-xl border border-border/50 bg-background/45 p-2 sm:p-3">
            <div
              className="h-[300px] min-w-[620px] sm:h-[330px] sm:min-w-0"
              role="img"
              aria-label={`${copy.breakdown} · ${row.date}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <Sankey
                  data={flow}
                  node={renderNode}
                  link={{
                    fill: "var(--primary)",
                    fillOpacity: 0.16,
                    stroke: "var(--primary)",
                    strokeOpacity: 0.28,
                  }}
                  nodeWidth={14}
                  nodePadding={26}
                  margin={{ top: 18, right: 118, bottom: 18, left: 118 }}
                  iterations={24}
                >
                  <Tooltip
                    formatter={(value) => format(Number(value))}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </Sankey>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <p className="py-6 text-sm text-muted-foreground">{copy.breakdownUnavailable}</p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">{copy.breakdownNote}</p>
    </section>
  );
}
