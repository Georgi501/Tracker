import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Info } from "lucide-react";
import { useState } from "react";
import { AllocationBreakdown } from "@/components/AllocationBreakdown";
import { ProBadge } from "@/components/ProFeatures";
import { usePortfolio } from "@/lib/store";
import { languageLocale, type Lang } from "@/lib/i18n";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Sample portfolio — CapiSpot" },
      {
        name: "description",
        content: "See how a CapiSpot portfolio looks, using clearly labeled sample data.",
      },
    ],
  }),
  component: DemoPage,
});

// Illustrative sample only: not live quotes and not real accounts.
const SAMPLE = [
  { symbol: "VWCE", name: "Vanguard FTSE All-World", cls: "ETF", qty: 40, cost: 112, value: 128 },
  { symbol: "AAPL", name: "Apple Inc.", cls: "Stock", qty: 15, cost: 170, value: 215 },
  { symbol: "MSFT", name: "Microsoft Corp.", cls: "Stock", qty: 8, cost: 320, value: 410 },
  { symbol: "BTC", name: "Bitcoin", cls: "Crypto", qty: 0.05, cost: 42000, value: 64000 },
  { symbol: "BND", name: "Vanguard Total Bond", cls: "Bonds", qty: 30, cost: 74, value: 72 },
];

const COPY: Record<
  Lang,
  {
    badge: string;
    title: string;
    note: string;
    value: string;
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
  }
> = {
  en: {
    badge: "Sample data",
    title: "A preview of your portfolio",
    note: "These holdings and figures are made up for illustration. They are not live quotes and not a recommendation.",
    value: "Sample value",
    gain: "Sample gain",
    alloc: "Allocation",
    totalValue: "Total value",
    bonds: "Bonds",
    holdings: "Holdings",
    cols: ["Asset", "Qty", "Avg cost", "Value", "P/L"],
    heatmap: "Portfolio heatmap",
    heatmapNote:
      "Each tile shows portfolio weight and illustrative gain/loss versus sample average cost—not live or daily market performance.",
    cta: "Create your free portfolio",
    explore: "Explore markets",
    samplePreview: "Explore the Pro preview",
  },
  bg: {
    badge: "Примерни данни",
    title: "Преглед как изглежда портфолиото ти",
    note: "Тези позиции и числа са измислени за илюстрация. Не са реални котировки и не са препоръка.",
    value: "Примерна стойност",
    gain: "Примерна печалба",
    alloc: "Разпределение",
    totalValue: "Обща стойност",
    bonds: "Облигации",
    holdings: "Позиции",
    cols: ["Актив", "Бр.", "Ср. цена", "Стойност", "П/З"],
    heatmap: "Heatmap на портфолиото",
    heatmapNote:
      "Всяка плочка показва теглото и примерната печалба/загуба спрямо примерната средна цена — не реално или дневно пазарно представяне.",
    cta: "Създай безплатно портфолио",
    explore: "Разгледай пазарите",
    samplePreview: "Разгледай Pro прегледа",
  },
  de: {
    badge: "Beispieldaten",
    title: "Ein Einblick in dein Portfolio",
    note: "Diese Positionen und Werte dienen nur der Illustration. Sie sind keine Live-Kurse und keine Empfehlung.",
    value: "Beispielwert",
    gain: "Beispielgewinn",
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
  },
  es: {
    badge: "Datos de ejemplo",
    title: "Una vista previa de tu cartera",
    note: "Estas posiciones y cifras son ficticias y solo ilustrativas. No son cotizaciones en vivo ni una recomendación.",
    value: "Valor de ejemplo",
    gain: "Ganancia de ejemplo",
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
  },
  it: {
    badge: "Dati di esempio",
    title: "Un'anteprima del tuo portafoglio",
    note: "Queste posizioni e cifre sono inventate a scopo illustrativo. Non sono quotazioni in tempo reale né una raccomandazione.",
    value: "Valore di esempio",
    gain: "Guadagno di esempio",
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
            to="/auth"
            className="press inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground"
          >
            {c.cta}
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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card-interactive rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{c.value}</p>
          <p className="numeric-display mt-1 text-2xl font-bold sm:text-3xl">
            {usd(totalValue, locale)}
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
              {Math.abs((gain / totalCost) * 100).toFixed(1)}%
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
              const pl = ((r.value - r.cost) / r.cost) * 100;
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
                  <td
                    className={`numeric-display text-right font-semibold ${pl >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {pl >= 0 ? "+" : ""}
                    {pl.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

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
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => {
              const change = ((row.value - row.cost) / row.cost) * 100;
              const weight = (row.totalValue / totalValue) * 100;
              return (
                <div
                  key={row.symbol}
                  className={`flex min-h-24 flex-col justify-between rounded-xl p-3 ${
                    change >= 0
                      ? "bg-success/15 text-success"
                      : "bg-destructive/15 text-destructive"
                  }`}
                >
                  <span className="font-display font-bold">{row.symbol}</span>
                  <span className="text-xs text-foreground">
                    {weight.toFixed(1)}% · {change >= 0 ? "+" : ""}
                    {change.toFixed(1)}%
                  </span>
                </div>
              );
            })}
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
    </div>
  );
}
