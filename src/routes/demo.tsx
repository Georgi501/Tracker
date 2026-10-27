import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Info } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ALLOC_COLORS } from "@/lib/palette";
import { usePortfolio } from "@/lib/store";

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

const COLORS = ALLOC_COLORS;

const COPY = {
  en: {
    badge: "Sample data",
    title: "A preview of your portfolio",
    note: "These holdings and figures are made up for illustration. They are not live quotes and not a recommendation.",
    value: "Sample value",
    gain: "Sample gain",
    alloc: "Allocation",
    holdings: "Holdings",
    cols: ["Asset", "Qty", "Avg cost", "Value", "P/L"],
    cta: "Create your free portfolio",
    explore: "Explore markets",
  },
  bg: {
    badge: "Примерни данни",
    title: "Преглед как изглежда портфолиото ти",
    note: "Тези позиции и числа са измислени за илюстрация. Не са реални котировки и не са препоръка.",
    value: "Примерна стойност",
    gain: "Примерна печалба",
    alloc: "Разпределение",
    holdings: "Позиции",
    cols: ["Актив", "Бр.", "Ср. цена", "Стойност", "П/З"],
    cta: "Създай безплатно портфолио",
    explore: "Разгледай пазарите",
  },
} as const;

const usd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

function DemoPage() {
  const p = usePortfolio();
  const c = p.lang === "bg" ? COPY.bg : COPY.en;
  const rows = SAMPLE.map((r) => ({
    ...r,
    totalValue: r.qty * r.value,
    totalCost: r.qty * r.cost,
  }));
  const totalValue = rows.reduce((s, r) => s + r.totalValue, 0);
  const totalCost = rows.reduce((s, r) => s + r.totalCost, 0);
  const gain = totalValue - totalCost;
  const byClass = [...new Set(rows.map((r) => r.cls))].map((cls) => ({
    name: cls,
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

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card-interactive rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{c.value}</p>
          <p className="font-display mt-1 text-2xl font-bold">{usd(totalValue)}</p>
        </div>
        <div className="card-interactive rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{c.gain}</p>
          <p className="font-display mt-1 text-2xl font-bold text-primary">
            +{usd(gain)} ({((gain / totalCost) * 100).toFixed(1)}%)
          </p>
        </div>
        <div className="card-interactive rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{c.alloc}</p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byClass}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={34}
                  outerRadius={56}
                  paddingAngle={3}
                  cornerRadius={5}
                >
                  {byClass.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => usd(v)} />
              </PieChart>
            </ResponsiveContainer>
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
                  <td className="text-right">{r.qty}</td>
                  <td className="text-right">{usd(r.cost)}</td>
                  <td className="text-right">{usd(r.totalValue)}</td>
                  <td className={`text-right ${pl >= 0 ? "text-primary" : "text-destructive"}`}>
                    {pl >= 0 ? "+" : ""}
                    {pl.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
