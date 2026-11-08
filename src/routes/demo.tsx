import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Info } from "lucide-react";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AllocationBreakdown } from "@/components/AllocationBreakdown";
import { ChartTooltipContent } from "@/components/ChartTooltipContent";
import { ProBadge } from "@/components/ProFeatures";
import { dcfCopy } from "@/components/DcfCalculator";
import { dcfAnalysis, scenario } from "@/lib/dcf";
import { usePortfolio } from "@/lib/store";
import { languageLocale, type Lang } from "@/lib/i18n";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Sample portfolio — CapiSpot" },
      {
        name: "description",
        content:
          "See how a CapiSpot portfolio looks, with clearly labeled sample data: allocation, performance, dividends and holdings across brokers. No account needed.",
      },
    ],
  }),
  component: DemoPage,
});

// Illustrative sample only: not live quotes and not real accounts.
const SAMPLE = [
  { symbol: "VWCE", name: "Vanguard FTSE All-World", cls: "ETF", qty: 40, cost: 112, value: 128 },
  { symbol: "AAPL", name: "Apple Inc.", cls: "Stock", qty: 15, cost: 170, value: 215 },
  { symbol: "MSFT", name: "Microsoft Corp.", cls: "Stock", qty: 8, cost: 290, value: 410 },
  { symbol: "BTC", name: "Bitcoin", cls: "Crypto", qty: 0.05, cost: 42000, value: 64000 },
  { symbol: "BND", name: "Vanguard Total Bond", cls: "Bonds", qty: 30, cost: 74, value: 72 },
];

const SAMPLE_HISTORY = [
  { month: "2026-05", value: 14650 },
  { month: "2026-06", value: 15180 },
  { month: "2026-07", value: 14920 },
  { month: "2026-08", value: 15940 },
  { month: "2026-09", value: 16230 },
  { month: "2026-10", value: 16985 },
];

const SAMPLE_DIVIDENDS = [
  { date: "2026-09-15", symbol: "AAPL", name: "Apple Inc.", amount: 3.75 },
  { date: "2026-09-15", symbol: "MSFT", name: "Microsoft Corp.", amount: 6.64 },
  { date: "2026-07-14", symbol: "BND", name: "Vanguard Total Bond", amount: 18.6 },
];

const COPY: Record<
  Lang,
  {
    badge: string;
    title: string;
    note: string;
    value: string;
    costBasis: string;
    gain: string;
    alloc: string;
    totalValue: string;
    bonds: string;
    holdings: string;
    cols: [string, string, string, string, string];
    heatmap: string;
    heatmapNote: string;
    cta: string;
    explore: string;
    samplePreview: string;
    openPortfolio: string;
    dcfNote: string;
    tryDemo: string;
    historyTitle: string;
    historyNote: string;
    dividendsTitle: string;
    dividendsNote: string;
    dividendAmount: string;
  }
> = {
  en: {
    badge: "Sample data",
    title: "A preview of your portfolio",
    note: "These holdings and figures are made up for illustration. They are not live quotes and not a recommendation.",
    value: "Sample value",
    costBasis: "Sample cost basis",
    gain: "Sample gain / loss",
    alloc: "Allocation",
    totalValue: "Total value",
    bonds: "Bonds",
    holdings: "Holdings",
    cols: ["Asset", "Qty", "Avg cost", "Value", "Gain / loss"],
    heatmap: "Portfolio heatmap",
    heatmapNote:
      "Each tile shows portfolio weight and illustrative gain/loss versus sample average cost—not live or daily market performance.",
    cta: "Create your free portfolio",
    explore: "Explore markets",
    samplePreview: "Explore the Pro preview",
    openPortfolio: "Open your portfolio",
    dcfNote:
      "Fictional company and assumptions, shown only to illustrate how the DCF scenarios work. Not a forecast or investment advice.",
    tryDemo: "Try the demo without an account",
    historyTitle: "Portfolio value over time",
    historyNote: "Illustrative monthly values, not actual account history.",
    dividendsTitle: "Example dividends",
    dividendsNote: "Illustrative entries—not confirmed payouts or a forecast.",
    dividendAmount: "Amount",
  },
  bg: {
    badge: "Примерни данни",
    title: "Примерно инвестиционно портфолио",
    note: "Позициите и стойностите са примерни; не са реални котировки или инвестиционна препоръка.",
    value: "Примерна стойност",
    costBasis: "Обща себестойност",
    gain: "Примерна печалба / загуба",
    alloc: "Разпределение",
    totalValue: "Обща стойност",
    bonds: "Облигации",
    holdings: "Позиции",
    cols: ["Актив", "Бр.", "Ср. цена", "Стойност", "Печ. / загуба"],
    heatmap: "Топлинна карта на портфейла",
    heatmapNote:
      "Всяка плочка показва дела на позицията и примерната печалба или загуба спрямо средната ѝ цена — не реална или дневна доходност.",
    cta: "Създай безплатно портфолио",
    explore: "Разгледай пазарите",
    samplePreview: "Виж Pro функциите",
    openPortfolio: "Отвори портфейла си",
    dcfNote:
      "Измислена компания и примерни стойности, които показват как работи DCF анализът. Не са прогноза или инвестиционен съвет.",
    tryDemo: "Пробвай демото без регистрация",
    historyTitle: "Стойност на портфейла във времето",
    historyNote: "Примерни месечни стойности — не са история от реален портфейл.",
    dividendsTitle: "Примерни дивиденти",
    dividendsNote: "Илюстративни записи — не са потвърдени плащания или прогноза.",
    dividendAmount: "Сума",
  },
  de: {
    badge: "Beispieldaten",
    title: "Ein Einblick in dein Portfolio",
    note: "Diese Positionen und Werte dienen nur der Illustration. Sie sind keine Live-Kurse und keine Empfehlung.",
    value: "Beispielwert",
    costBasis: "Beispiel-Einstandskosten",
    gain: "Beispielgewinn / -verlust",
    alloc: "Aufteilung",
    totalValue: "Gesamtwert",
    bonds: "Anleihen",
    holdings: "Positionen",
    cols: ["Wert", "Menge", "Ø Kosten", "Wert", "G/V"],
    heatmap: "Portfolio-Heatmap",
    heatmapNote:
      "Jede Kachel zeigt das Portfolio-Gewicht und den illustrativen Gewinn/Verlust gegenüber den Beispiel-Einstandskosten – keine Live- oder Tagesentwicklung.",
    cta: "Kostenloses Portfolio erstellen",
    explore: "Märkte entdecken",
    samplePreview: "Pro-Vorschau entdecken",
    openPortfolio: "Portfolio öffnen",
    dcfNote:
      "Fiktives Unternehmen und fiktive Annahmen, nur zur Veranschaulichung der DCF-Szenarien. Keine Prognose und keine Anlageberatung.",
    tryDemo: "Demo ohne Registrierung ansehen",
    historyTitle: "Portfolio-Wert im Zeitverlauf",
    historyNote: "Illustrative Monatswerte, kein tatsächlicher Kontoverlauf.",
    dividendsTitle: "Beispieldividenden",
    dividendsNote: "Illustrative Einträge – keine bestätigten Auszahlungen oder Prognose.",
    dividendAmount: "Betrag",
  },
  es: {
    badge: "Datos de ejemplo",
    title: "Una vista previa de tu cartera",
    note: "Estas posiciones y cifras son ficticias y solo ilustrativas. No son cotizaciones en vivo ni una recomendación.",
    value: "Valor de ejemplo",
    costBasis: "Coste de compra de ejemplo",
    gain: "Ganancia / pérdida de ejemplo",
    alloc: "Distribución",
    totalValue: "Valor total",
    bonds: "Bonos",
    holdings: "Posiciones",
    cols: ["Activo", "Cant.", "Coste medio", "Valor", "P/G"],
    heatmap: "Mapa de calor de la cartera",
    heatmapNote:
      "Cada bloque muestra el peso en la cartera y la ganancia/pérdida ilustrativa frente al coste medio de ejemplo; no es rendimiento diario ni en vivo.",
    cta: "Crea tu cartera gratis",
    explore: "Explorar mercados",
    samplePreview: "Explora la vista previa Pro",
    openPortfolio: "Abrir tu cartera",
    dcfNote:
      "Empresa y supuestos ficticios, solo para ilustrar cómo funcionan los escenarios DCF. No es una previsión ni asesoramiento de inversión.",
    tryDemo: "Prueba la demo sin registrarte",
    historyTitle: "Valor de la cartera a lo largo del tiempo",
    historyNote: "Valores mensuales ilustrativos, no son el historial de una cuenta real.",
    dividendsTitle: "Dividendos de ejemplo",
    dividendsNote: "Datos ilustrativos, no son pagos confirmados ni una previsión.",
    dividendAmount: "Importe",
  },
  it: {
    badge: "Dati di esempio",
    title: "Un'anteprima del tuo portafoglio",
    note: "Queste posizioni e cifre sono inventate a scopo illustrativo. Non sono quotazioni in tempo reale né una raccomandazione.",
    value: "Valore di esempio",
    costBasis: "Costo d'acquisto di esempio",
    gain: "Guadagno / perdita di esempio",
    alloc: "Allocazione",
    totalValue: "Valore totale",
    bonds: "Obbligazioni",
    holdings: "Posizioni",
    cols: ["Asset", "Qtà", "Costo medio", "Valore", "P/L"],
    heatmap: "Mappa del portafoglio",
    heatmapNote:
      "Ogni riquadro mostra il peso in portafoglio e il guadagno/perdita illustrativo rispetto al costo medio di esempio, non l'andamento reale o giornaliero.",
    cta: "Crea il tuo portafoglio gratuito",
    explore: "Esplora i mercati",
    samplePreview: "Scopri l'anteprima Pro",
    openPortfolio: "Apri il tuo portafoglio",
    dcfNote:
      "Azienda e ipotesi fittizie, usate solo per illustrare come funzionano gli scenari DCF. Non è una previsione né una consulenza di investimento.",
    tryDemo: "Prova la demo senza registrarti",
    historyTitle: "Valore del portafoglio nel tempo",
    historyNote: "Valori mensili illustrativi, non sono la cronologia di un conto reale.",
    dividendsTitle: "Dividendi di esempio",
    dividendsNote: "Dati illustrativi, non sono pagamenti confermati né previsioni.",
    dividendAmount: "Importo",
  },
};

const usd = (n: number, locale: string) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

function DemoPage() {
  const p = usePortfolio();
  const c = COPY[p.lang];
  const [showHeatmap, setShowHeatmap] = useState(true);
  const locale = languageLocale(p.lang);
  const rows = SAMPLE.map((r) => ({
    ...r,
    totalValue: r.qty * r.value,
    totalCost: r.qty * r.cost,
  }));
  const totalValue = rows.reduce((s, r) => s + r.totalValue, 0);
  const totalCost = rows.reduce((s, r) => s + r.totalCost, 0);
  const gain = totalValue - totalCost;
  const gainPercent = (gain / totalCost) * 100;
  const monthLabel = (month: string) =>
    new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(
      new Date(`${month}-01T00:00:00.000Z`),
    );
  const dateLabel = (date: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(`${date}T00:00:00.000Z`));
  const classLabels: Record<string, string> = {
    ETF: p.t("etf"),
    Stock: p.t("stock"),
    Crypto: p.t("crypto"),
    Bonds: c.bonds,
  };
  const byClass = [...new Set(rows.map((r) => r.cls))].map((cls) => ({
    name: classLabels[cls] ?? cls,
    value: rows.filter((r) => r.cls === cls).reduce((s, r) => s + r.totalValue, 0),
  }));
  const heatRows = rows
    .map((r) => ({
      ...r,
      weight: (r.totalValue / totalValue) * 100,
      change: ((r.totalValue - r.totalCost) / r.totalCost) * 100,
    }))
    .sort((a, b) => b.weight - a.weight);
  const dc = dcfCopy[p.lang];
  const baseGrowth = 0.08;
  const dcfCases = (["bear", "base", "bull"] as const).map((key) => {
    const assumptions = scenario(key, baseGrowth);
    const result = dcfAnalysis({
      fcf: 10000,
      cash: 8000,
      debt: 4000,
      shares: 1000,
      ...assumptions,
    });
    return { key, label: dc[key], assumptions, result };
  });
  const dcfPrice = 135;

  return (
    <div className="flex flex-col gap-5">
      <section className="rise rounded-3xl border border-border bg-card p-4 sm:p-6">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-foreground/10 px-3 py-1 text-xs font-semibold">
          <Info className="size-3.5" />
          {c.badge}
        </span>
        <h1 className="font-display mt-3 text-balance text-2xl font-bold md:text-4xl">{c.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{c.note}</p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Link
            to="/demo"
            hash="portfolio-preview"
            className="press inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground"
          >
            {c.tryDemo}
            <ArrowRight className="size-4" />
          </Link>
          <Link
            to={p.user ? "/holdings" : "/auth"}
            className="press inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 py-2 font-semibold hover:bg-accent"
          >
            {p.user ? c.openPortfolio : c.cta}
            <ArrowRight className="size-4" />
          </Link>
          <Link
            to="/markets"
            className="press inline-flex min-h-10 items-center rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            {c.explore}
          </Link>
        </div>
      </section>

      <div id="portfolio-preview" className="grid scroll-mt-24 gap-4 md:grid-cols-3">
        <div className="card-interactive rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{c.value}</p>
          <p className="numeric-display mt-1 text-2xl font-bold sm:text-3xl">
            {usd(totalValue, locale)}
          </p>
        </div>
        <div className="card-interactive rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{c.costBasis}</p>
          <p className="numeric-display mt-1 text-2xl font-bold sm:text-3xl">
            {usd(totalCost, locale)}
          </p>
        </div>
        <div className="card-interactive rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{c.gain}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p
              className={`numeric-display text-2xl font-bold sm:text-3xl ${
                gain >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {gain >= 0 ? "+" : "−"}
              {usd(Math.abs(gain), locale)}
            </p>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums sm:text-sm ${
                gain >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              }`}
            >
              {gain >= 0 ? "+" : "−"}
              {Math.abs(gainPercent).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      <section className="card-interactive overflow-x-auto rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display mb-3 text-lg font-semibold">{c.holdings}</h2>
        <table className="w-full min-w-[480px] text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              {c.cols.map((h, i) => (
                <th key={h} className={`pb-2 font-medium ${i ? "text-right" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const rowGain = r.totalValue - r.totalCost;
              const pl = (rowGain / r.totalCost) * 100;
              return (
                <tr key={r.symbol} className="border-t border-border">
                  <td className="py-2">
                    <span className="font-semibold">{r.symbol}</span>
                    <span className="ml-2 text-muted-foreground">{r.name}</span>
                  </td>
                  <td className="numeric-display text-right">{r.qty}</td>
                  <td className="numeric-display text-right">{usd(r.cost, locale)}</td>
                  <td className="numeric-display text-right font-semibold">
                    {usd(r.totalValue, locale)}
                  </td>
                  <td className="text-right">
                    <span
                      className={`numeric-display block font-semibold ${pl >= 0 ? "text-success" : "text-destructive"}`}
                    >
                      {rowGain >= 0 ? "+" : "−"}
                      {usd(Math.abs(rowGain), locale)}
                    </span>
                    <span
                      className={`numeric-display text-xs font-medium ${pl >= 0 ? "text-success" : "text-destructive"}`}
                    >
                      {pl >= 0 ? "+" : "−"}
                      {Math.abs(pl).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.65fr)]">
        <section
          aria-labelledby="sample-history-title"
          className="card-interactive rounded-2xl border border-border bg-card p-4 sm:p-5"
        >
          <h2 id="sample-history-title" className="font-display text-lg font-semibold">
            {c.historyTitle}
          </h2>
          <div className="mt-4 h-56" role="img" aria-label={c.historyTitle}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={SAMPLE_HISTORY} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickFormatter={monthLabel}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={20}
                />
                <YAxis
                  domain={["dataMin - 1000", "dataMax + 1000"]}
                  width={56}
                  tickFormatter={(value: number) =>
                    new Intl.NumberFormat(locale, {
                      style: "currency",
                      currency: "USD",
                      notation: "compact",
                      maximumFractionDigits: 0,
                    }).format(value)
                  }
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={(props) => (
                    <ChartTooltipContent
                      {...props}
                      formatValue={(value) => usd(Number(value), locale)}
                      formatLabel={(label) => monthLabel(String(label))}
                    />
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={c.value}
                  stroke="var(--primary)"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "var(--primary)" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{c.historyNote}</p>
        </section>

        <section
          aria-labelledby="sample-dividends-title"
          className="card-interactive rounded-2xl border border-border bg-card p-4 sm:p-5"
        >
          <h2 id="sample-dividends-title" className="font-display text-lg font-semibold">
            {c.dividendsTitle}
          </h2>
          <ul className="mt-3 divide-y divide-border">
            {SAMPLE_DIVIDENDS.map((dividend) => (
              <li
                key={`${dividend.date}-${dividend.symbol}`}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {dividend.symbol} · {dividend.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{dateLabel(dividend.date)}</p>
                </div>
                <span
                  aria-label={`${c.dividendAmount}: ${usd(dividend.amount, locale)}`}
                  className="numeric-display shrink-0 text-sm font-semibold text-success"
                >
                  +{usd(dividend.amount, locale)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">{c.dividendsNote}</p>
        </section>
      </div>

      <section
        id="pro-preview"
        className="card-interactive scroll-mt-6 rounded-2xl border border-border bg-card p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">{c.samplePreview}</h2>
          <ProBadge />
        </div>
        <div className="my-4 flex flex-wrap gap-2" aria-label={c.samplePreview}>
          <button
            type="button"
            aria-pressed={!showHeatmap}
            onClick={() => setShowHeatmap(false)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${!showHeatmap ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}
          >
            {c.alloc}
          </button>
          <button
            type="button"
            aria-pressed={showHeatmap}
            onClick={() => setShowHeatmap(true)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${showHeatmap ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}
          >
            {c.heatmap}
          </button>
        </div>
        {showHeatmap ? (
          <div className="flex flex-col gap-2" role="list">
            {[heatRows.slice(0, 3), heatRows.slice(3)].map((line, lineIndex) => (
              <div
                key={lineIndex}
                className={`flex flex-col gap-2 sm:flex-row ${lineIndex === 0 ? "sm:h-52" : "sm:h-32"}`}
              >
                {line.map((row) => {
                  const up = row.change >= 0;
                  const tone = up ? "var(--success)" : "var(--destructive)";
                  const strength = Math.min(60, 22 + Math.abs(row.change) * 0.9);
                  return (
                    <div
                      key={row.symbol}
                      role="listitem"
                      style={{
                        flexGrow: row.weight,
                        flexBasis: 0,
                        background: `linear-gradient(145deg, color-mix(in oklab, ${tone} ${strength + 14}%, transparent), color-mix(in oklab, ${tone} ${strength - 10}%, transparent))`,
                        borderColor: `color-mix(in oklab, ${tone} 55%, transparent)`,
                      }}
                      className="flex min-h-24 flex-col justify-between rounded-xl border p-3 transition-transform hover:scale-[1.015]"
                    >
                      <div>
                        <span className="font-display text-lg font-bold text-foreground">
                          {row.symbol}
                        </span>
                        <span className="block truncate text-xs text-foreground/70">
                          {row.name}
                        </span>
                      </div>
                      <div className="flex items-end justify-between gap-2 text-foreground">
                        <span className="numeric-display text-sm font-semibold">
                          {row.weight.toFixed(1)}%
                        </span>
                        <span
                          className={`numeric-display rounded-full bg-background/60 px-2 py-0.5 text-xs font-bold ${up ? "text-success" : "text-destructive"}`}
                        >
                          {up ? "▲ +" : "▼ "}
                          {row.change.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <AllocationBreakdown
            data={byClass}
            totalLabel={c.totalValue}
            formatValue={(value) => usd(value, locale)}
          />
        )}
        {showHeatmap && <p className="mt-3 text-xs text-muted-foreground">{c.heatmapNote}</p>}
      </section>

      <section
        id="dcf-preview"
        className="card-interactive scroll-mt-6 rounded-2xl border border-border bg-card p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">{dc.intrinsic} (DCF)</h2>
          <ProBadge />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {dcfCases.map(({ key, label, assumptions, result }) => {
            const gap = result ? result.valuePerShare / dcfPrice - 1 : null;
            return (
              <div
                key={key}
                className={`rounded-xl border p-4 ${key === "base" ? "border-primary bg-primary/10" : "border-border bg-background/40"}`}
              >
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <p className="numeric-display mt-1 text-3xl font-bold">
                  {result ? usd(result.valuePerShare, languageLocale(p.lang)) : "—"}
                </p>
                {gap !== null && (
                  <p
                    className={`numeric-display mt-1 text-sm font-semibold ${gap >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {gap >= 0 ? "+" : "−"}
                    {Math.abs(gap * 100).toFixed(1)}% · {dc.price}{" "}
                    {usd(dcfPrice, languageLocale(p.lang))}
                  </p>
                )}
                <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {(
                    [
                      [dc.growth, assumptions.growth],
                      [dc.discount, assumptions.discount],
                      [dc.terminal, assumptions.terminal],
                    ] as const
                  ).map(([name, value]) => (
                    <div key={name} className="flex justify-between gap-2">
                      <dt>{name}</dt>
                      <dd className="numeric-display font-semibold text-foreground">
                        {(value * 100).toFixed(1)}%
                      </dd>
                    </div>
                  ))}
                  {result && (
                    <div className="flex justify-between gap-2">
                      <dt>{dc.terminalShare}</dt>
                      <dd className="numeric-display font-semibold text-foreground">
                        {(result.terminalValueShare * 100).toFixed(0)}%
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{c.dcfNote}</p>
      </section>
    </div>
  );
}
