import { languageLocale } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Card } from "@/components/AppShell";
import { pct, usePortfolio } from "@/lib/store";
import { totalDividends } from "@/lib/portfolio";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDividendEvents } from "@/lib/dividends.functions";
import { toolsCopy } from "@/lib/tools-i18n";
import { BarsSilhouette, ProGate } from "@/components/ProFeatures";
import { proCopy } from "@/lib/pro-i18n";
import { monthlyIncome } from "@/lib/pro";
import { useEffect, useState } from "react";
import { DividendTable } from "@/components/Insights";
import { dividendRows } from "@/lib/insights";
import { ChartDataTable } from "@/components/ChartDataTable";
import type { Lang } from "@/lib/i18n";

const EMPTY_COPY: Record<
  Lang,
  { title: string; body: string; signIn: string; sample: string; add: string }
> = {
  en: {
    title: "Dividend insights need a portfolio",
    body: "Add stocks or ETFs to see confirmed dividend history and upcoming events. Estimates are never substituted for missing event data.",
    signIn: "Create a free account",
    sample: "Explore a sample portfolio",
    add: "Add your first holding",
  },
  bg: {
    title: "За анализ на дивидентите е нужно портфолио",
    body: "Добави акции или ETF-и, за да видиш потвърдената история и предстоящите събития. Липсващите данни не се заместват с прогнози.",
    signIn: "Създай безплатен профил",
    sample: "Разгледай примерно портфолио",
    add: "Добави първата си позиция",
  },
  de: {
    title: "Für Dividendenanalysen brauchst du ein Portfolio",
    body: "Füge Aktien oder ETFs hinzu, um bestätigte Dividenden und kommende Termine zu sehen. Fehlende Ereignisdaten werden nicht geschätzt.",
    signIn: "Kostenloses Konto erstellen",
    sample: "Beispielportfolio ansehen",
    add: "Erste Position hinzufügen",
  },
  es: {
    title: "El análisis de dividendos necesita una cartera",
    body: "Añade acciones o ETF para ver el historial confirmado y los próximos eventos. No estimamos los datos que faltan.",
    signIn: "Crear una cuenta gratis",
    sample: "Explorar una cartera de ejemplo",
    add: "Añadir tu primera posición",
  },
  it: {
    title: "Per analizzare i dividendi serve un portafoglio",
    body: "Aggiungi azioni o ETF per vedere la cronologia confermata e i prossimi eventi. I dati mancanti non vengono stimati.",
    signIn: "Crea un account gratuito",
    sample: "Esplora un portafoglio di esempio",
    add: "Aggiungi la prima posizione",
  },
};

export const Route = createFileRoute("/dividends")({
  head: () => ({
    meta: [
      { title: "Dividends — Capispot Portfolio Tracker" },
      {
        name: "description",
        content: "Dividend calendar, projected annual income and dividend yield.",
      },
      { property: "og:title", content: "Dividends — Capispot" },
      {
        property: "og:description",
        content: "Upcoming and past dividend payouts with yield analytics.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dividends,
});

function Dividends() {
  const p = usePortfolio();
  const locale = languageLocale(p.lang);
  const total = p.holdings.reduce((s, h) => s + h.value, 0);
  const c = toolsCopy[p.lang];
  const empty = EMPTY_COPY[p.lang];
  const held = p.holdings.filter(
    (h) => h.quantity > 0 && (h.asset.type === "stock" || h.asset.type === "etf"),
  );
  const divFn = useServerFn(getDividendEvents);
  const events = useQuery({
    queryKey: ["dividend-events", held.map((h) => h.asset.symbol).join(",")],
    queryFn: () => divFn({ data: { symbols: held.map((h) => h.asset.symbol) } }),
    enabled: held.length > 0,
    staleTime: 3600000,
  });
  const toUsd = (amount: number, cur: string | null) =>
    cur === "USD" ? amount : cur === "EUR" && p.eurPerUsd ? amount / p.eurPerUsd : Number.NaN;
  const info = events.data ?? [];
  const annual =
    held.length && info.length
      ? held.reduce((s, h) => {
          const e = info.find((x) => x.symbol === h.asset.symbol);
          const per = (e?.paid ?? []).reduce((a, d) => a + d.amount, 0);
          return s + (per ? toUsd(per, e?.currency ?? null) * h.quantity : 0);
        }, 0)
      : Number.NaN;
  const upcoming = info
    .filter((e) => e.exDate || e.payDate)
    .map((e) => ({
      symbol: e.symbol,
      name: held.find((h) => h.asset.symbol === e.symbol)?.asset.name ?? "",
      date: new Date((e.payDate ?? e.exDate)!),
      kind: e.payDate ? c.payDate : c.exDate,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const past = p.transactions
    .filter((t) => t.kind === "dividend")
    .sort((a, b) => b.date.localeCompare(a.date));
  const bySymbol = new Map(p.assets.map((a) => [a.id, a]));
  const posRows = dividendRows(
    held.map((h) => {
      const e = info.find((x) => x.symbol === h.asset.symbol);
      return {
        symbol: h.asset.symbol,
        quantity: h.quantity,
        value: h.value,
        costBasis: h.costBasis,
        paidUsdPerShare: toUsd(
          (e?.paid ?? []).reduce((a, d) => a + d.amount, 0),
          e?.currency ?? null,
        ),
      };
    }),
  );
  const pc = proCopy[p.lang];
  const months = monthlyIncome(
    held.map((h) => {
      const e = info.find((x) => x.symbol === h.asset.symbol);
      return {
        quantity: h.quantity,
        toUsd: (a: number) => toUsd(a, e?.currency ?? null),
        paid: e?.paid ?? [],
      };
    }),
  );
  const hasIncome = months.some((v) => v > 0);
  const monthly = hasIncome
    ? months.map((v, i) => ({
        m: new Date(2026, i, 1).toLocaleDateString(locale, { month: "short" }),
        v,
      }))
    : [];
  const [goal, setGoal] = useState("");
  useEffect(() => {
    try {
      setGoal(localStorage.getItem("folio-income-goal") ?? "");
    } catch {
      /* ignore */
    }
  }, []);
  const saveGoal = (v: string) => {
    setGoal(v);
    try {
      localStorage.setItem("folio-income-goal", v);
    } catch {
      /* ignore */
    }
  };
  const rate = p.currency === "USD" ? 1 : p.eurPerUsd;
  const avg = (months.reduce((a, b) => a + b, 0) / 12) * (rate ?? Number.NaN);
  const progress =
    Number(goal) > 0 && Number.isFinite(avg) ? Math.min(100, (avg / Number(goal)) * 100) : null;
  const fmtD = (d: Date) =>
    d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });

  if (!p.user || (!p.holdings.length && !p.transactions.length))
    return (
      <Card className="mx-auto max-w-2xl py-10 text-center">
        <h1 className="font-display text-2xl font-bold">{p.t("dividends")}</h1>
        <h2 className="mt-4 font-display text-xl font-semibold">{empty.title}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {empty.body}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {p.user ? (
            <Link
              to="/holdings"
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              {empty.add}
            </Link>
          ) : (
            <>
              <Link
                to="/auth"
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                {empty.signIn}
              </Link>
              <Link
                to="/demo"
                className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold"
              >
                {empty.sample}
              </Link>
            </>
          )}
        </div>
      </Card>
    );

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <h1 className="font-display text-2xl font-bold lg:col-span-3">{p.t("dividends")}</h1>
      <Stat label={c.trailingIncome} value={p.money(annual)} />
      <Stat label={p.t("yield")} value={pct((annual / total) * 100, false)} />
      <Stat label={p.t("received")} value={p.money(totalDividends(p.transactions))} />
      <ProGate
        className="lg:col-span-3"
        title={pc.income}
        desc={pc.incomeDesc}
        preview={<BarsSilhouette />}
      >
        <div className="mb-3 flex flex-wrap items-end gap-4">
          <label className="text-xs text-muted-foreground">
            {pc.goal} ({p.currency})
            <input
              type="number"
              min="0"
              value={goal}
              onChange={(e) => saveGoal(e.target.value)}
              className="mt-1 block w-32 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
            />
          </label>
          <div className="text-sm">
            <span className="text-muted-foreground">{pc.avgMonth}: </span>
            <b>{hasIncome ? p.money(avg / (rate ?? 1)) : "—"}</b>
          </div>
          {progress !== null && hasIncome && (
            <div className="min-w-48 flex-1">
              <div className="h-2 rounded-full bg-secondary">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {progress.toFixed(0)}% {pc.goalProgress}
              </p>
            </div>
          )}
        </div>
        {!hasIncome && <p className="py-8 text-sm text-muted-foreground">{p.t("noPeriodData")}</p>}
        <div
          role="img"
          aria-label={`${p.t("monthly")} ${p.t("chart")}, ${monthly.length} ${p.t("dataPoints")}${monthly.length ? `, ${p.t("latestValue")} ${p.money(monthly.at(-1)!.v)}` : ""}.`}
          className="h-52"
        >
          <ResponsiveContainer>
            <BarChart data={monthly}>
              <XAxis
                dataKey="m"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <Tooltip
                cursor={{ fill: "var(--secondary)" }}
                formatter={(v: number) => p.money(v)}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--foreground)",
                }}
              />
              <Bar dataKey="v" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ChartDataTable
          summary={p.t("viewChartData")}
          caption={`${p.t("monthly")} ${p.t("chart")}`}
          headers={[p.t("date"), p.t("value")]}
          rows={monthly.map((item) => [item.m, p.money(item.v)])}
        />
      </ProGate>
      <DividendTable rows={posRows} />
      <Card className="lg:col-span-2">
        <h3 className="font-display mb-2 font-semibold">{p.t("upcoming")}</h3>
        <ul className="divide-y divide-border">
          {upcoming.slice(0, 12).map((e, i) => (
            <li key={i} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="w-24 text-muted-foreground">{fmtD(e.date)}</span>
              <span className="flex-1 font-semibold">
                {e.symbol} <span className="font-normal text-muted-foreground">{e.name}</span>
              </span>
              <span className="text-xs text-muted-foreground">{e.kind}</span>
            </li>
          ))}
        </ul>
        {!upcoming.length && (
          <p className="py-6 text-sm text-muted-foreground">
            {events.isFetching ? "…" : c.noUpcoming}
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">{c.dividendSource}</p>
      </Card>
      <Card>
        <h3 className="font-display mb-2 font-semibold">{p.t("past")}</h3>
        <ul className="divide-y divide-border">
          {past.map((t) => (
            <li key={t.id} className="flex justify-between py-2.5 text-sm">
              <span>
                <b>{bySymbol.get(t.assetId)?.symbol}</b>{" "}
                <span className="text-muted-foreground">{fmtD(new Date(t.date))}</span>
              </span>
              <span className="font-semibold">
                {p.moneyFor(t.price * t.quantity, bySymbol.get(t.assetId))}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="numeric-display mt-1 text-3xl font-bold">{value}</p>
    </Card>
  );
}
