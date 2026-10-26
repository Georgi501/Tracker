import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bar, BarChart, ResponsiveContainer, Sankey, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/AppShell";
import { ProGate, BarsSilhouette } from "@/components/ProFeatures";
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
    years: (n: number) => `${n}Y`,
    revenue: "Revenue",
    operatingIncome: "Operating income",
    netIncome: "Net income",
    dilutedEps: "Diluted EPS",
    operatingCashFlow: "Operating cash flow",
    freeCashFlow: "Free cash flow",
    change: (n: number, years: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}% · ${years}Y`,
    unavailable: "Reported financial data is not available for this period.",
    loadFailed: "Could not load financial data.",
    retry: "Try again",
    breakdown: "Revenue & expense breakdown",
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
    years: (n: number) => `${n} г.`,
    revenue: "Приходи",
    operatingIncome: "Оперативна печалба",
    netIncome: "Нетна печалба",
    dilutedEps: "Разредена печалба на акция",
    operatingCashFlow: "Паричен поток от дейността",
    freeCashFlow: "Свободен паричен поток",
    change: (n: number, years: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}% · ${years} г.`,
    unavailable: "Няма отчетени финансови данни за този период.",
    loadFailed: "Финансовите данни не се заредиха.",
    retry: "Опитай отново",
    breakdown: "Разбивка на приходите и разходите",
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
    years: (n: number) => `${n}J`,
    revenue: "Umsatz",
    operatingIncome: "Betriebsergebnis",
    netIncome: "Nettogewinn",
    dilutedEps: "Verwässertes EPS",
    operatingCashFlow: "Operativer Cashflow",
    freeCashFlow: "Free Cashflow",
    change: (n: number, years: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}% · ${years}J`,
    unavailable: "Für diesen Zeitraum sind keine Finanzdaten verfügbar.",
    loadFailed: "Finanzdaten konnten nicht geladen werden.",
    retry: "Erneut versuchen",
    breakdown: "Umsatz- und Kostenaufteilung",
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
    years: (n: number) => `${n}A`,
    revenue: "Ingresos",
    operatingIncome: "Resultado operativo",
    netIncome: "Beneficio neto",
    dilutedEps: "BPA diluido",
    operatingCashFlow: "Flujo de caja operativo",
    freeCashFlow: "Flujo de caja libre",
    change: (n: number, years: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}% · ${years}A`,
    unavailable: "No hay datos financieros publicados para este período.",
    loadFailed: "No se pudieron cargar los datos financieros.",
    retry: "Intentar de nuevo",
    breakdown: "Desglose de ingresos y gastos",
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
    years: (n: number) => `${n}A`,
    revenue: "Ricavi",
    operatingIncome: "Risultato operativo",
    netIncome: "Utile netto",
    dilutedEps: "EPS diluito",
    operatingCashFlow: "Flusso di cassa operativo",
    freeCashFlow: "Flusso di cassa libero",
    change: (n: number, years: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}% · ${years}A`,
    unavailable: "Dati finanziari dichiarati non disponibili per questo periodo.",
    loadFailed: "Impossibile caricare i dati finanziari.",
    retry: "Riprova",
    breakdown: "Ripartizione di ricavi e spese",
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
    <ProGate title={c.title} desc={c.desc} preview={<BarsSilhouette />}>
      <Financials symbol={symbol} lang={lang} />
    </ProGate>
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
  const rows = query.data?.rows ?? [];
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
      <div className="flex flex-wrap items-center justify-between gap-3">
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
                rangeLabel={c.years(years)}
              />
            ))}
          </div>
          <RevenueBreakdown
            rows={rows}
            currency={query.data?.currency ?? null}
            locale={locale}
            copy={c}
          />
          <p className="text-xs text-muted-foreground">{c.source}</p>
        </>
      )}
    </div>
  );
}

function MetricCard({
  rows,
  metric,
  title,
  format,
  locale,
  period,
  rangeLabel,
}: {
  rows: FinancialSeriesRow[];
  metric: { key: MetricKey; label: MetricKey };
  title: string;
  format: (value: number) => string;
  locale: string;
  period: Period;
  rangeLabel: string;
}) {
  const values = rows.flatMap((row) => {
    const value = row[metric.key];
    return value == null ? [] : [{ date: row.date, value }];
  });
  const first = values[0]?.value;
  const last = values.at(-1)?.value;
  const change = first != null && first > 0 && last != null ? (last / first - 1) * 100 : null;
  const periodLabel = period === "quarterly" ? "short" : "medium";
  return (
    <Card className="overflow-hidden p-4">
      <div className="flex min-h-12 items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold">{title}</h4>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">
            {last == null ? "—" : format(last)}
          </p>
        </div>
        {change != null && (
          <span
            className={`rounded-md px-2 py-1 text-xs font-semibold ${change >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
          >
            {change > 0 ? "+" : ""}
            {change.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="mt-3 h-16" aria-label={`${title} historical chart`}>
        {values.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={values}>
              <Tooltip
                labelFormatter={(date) =>
                  new Date(String(date)).toLocaleDateString(locale, { dateStyle: periodLabel })
                }
                formatter={(value) => [format(Number(value)), title]}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="value"
                fill="var(--primary)"
                fillOpacity={0.65}
                radius={[2, 2, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="pt-4 text-xs text-muted-foreground">—</p>
        )}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {values.at(-1)?.date ?? ""}
        {change != null && ` · ${rangeLabel} ${change > 0 ? "+" : ""}${change.toFixed(1)}%`}
      </p>
    </Card>
  );
}

function RevenueBreakdown({
  rows,
  currency,
  locale,
  copy,
}: {
  rows: FinancialSeriesRow[];
  currency: string | null;
  locale: string;
  copy: FinancialCopy;
}) {
  const row = [...rows]
    .reverse()
    .find(
      (item) =>
        item.revenue != null &&
        item.grossProfit != null &&
        item.operatingIncome != null &&
        item.netIncome != null,
    );
  const revenue = row?.revenue;
  const grossProfit = row?.grossProfit;
  const operatingIncome = row?.operatingIncome;
  const netIncome = row?.netIncome;
  const valid =
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
    netIncome <= operatingIncome;

  const format = (value: number) =>
    new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: 1,
      ...(currency ? { style: "currency" as const, currency } : {}),
    }).format(value);
  const nodes: FlowNode[] = [
    { name: copy.revenue, color: "var(--chart-2)" },
    { name: copy.costOfRevenue, color: "var(--chart-4)" },
    { name: copy.grossProfit, color: "var(--chart-2)" },
    { name: copy.operatingExpenseLabel, color: "var(--chart-4)" },
    { name: copy.operatingIncome, color: "var(--success)" },
    { name: copy.otherTaxes, color: "var(--chart-4)" },
    { name: copy.netIncome, color: "var(--success)" },
  ];
  const flow: FlowData = {
    nodes,
    links: valid
      ? [
          { source: 0, target: 1, value: revenue - grossProfit },
          { source: 0, target: 2, value: grossProfit },
          { source: 2, target: 3, value: grossProfit - operatingIncome },
          { source: 2, target: 4, value: operatingIncome },
          { source: 4, target: 5, value: operatingIncome - netIncome },
          { source: 4, target: 6, value: netIncome },
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
          rx={3}
          fill={props.payload?.color ?? "var(--primary)"}
        />
        <text
          x={right ? x + width + 6 : x - 6}
          y={y + Math.max(12, height / 2)}
          textAnchor={right ? "start" : "end"}
          fill="var(--foreground)"
          fontSize={11}
        >
          {name}
        </text>
      </g>
    );
  };

  return (
    <section className="rounded-xl border border-border bg-background/70 p-4">
      <h4 className="font-display font-semibold">{copy.breakdown}</h4>
      {valid ? (
        <div className="mt-2 overflow-x-auto">
          <div className="h-[340px] min-w-[640px]">
            <ResponsiveContainer width="100%" height="100%">
              <Sankey
                data={flow}
                node={renderNode}
                link={{ fill: "none", stroke: "var(--primary)", strokeOpacity: 0.2 }}
                nodeWidth={12}
                nodePadding={22}
                margin={{ top: 12, right: 105, bottom: 12, left: 105 }}
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
      ) : (
        <p className="py-6 text-sm text-muted-foreground">{copy.breakdownUnavailable}</p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">{copy.breakdownNote}</p>
    </section>
  );
}
