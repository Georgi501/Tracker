import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/AppShell";
import { ProGate, BarsSilhouette } from "@/components/ProFeatures";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Input } from "@/components/ui/input";
import { marketStats, marketDcf, searchMarket } from "@/lib/market.functions";
import { dcfValue, scenario, valuationGap } from "@/lib/dcf";
import { usePortfolio } from "@/lib/store";
import { languageLocale } from "@/lib/i18n";

export const Route = createFileRoute("/compare")({
  head: () => ({ meta: [
    { title: "Compare stocks & ETFs head-to-head — Dividend Drift" },
    { name: "description", content: "Put two stocks or ETFs side by side: valuation, P/E, dividends, beta and 52-week range from real market data." },
    { property: "og:title", content: "Head-to-head asset comparison — Dividend Drift" },
    { property: "og:description", content: "Compare two companies or ETFs side by side with real market data." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Compare,
});

const SYM = /^[A-Za-z0-9.^:=_-]{1,20}$/;

function useResolved(term: string) {
  const search = useServerFn(searchMarket);
  return useQuery({
    queryKey: ["compare-resolve", term.trim().toUpperCase()],
    enabled: term.trim().length >= 1,
    staleTime: 300_000,
    queryFn: async () => {
      const t = term.trim();
      const r = await search({ data: { query: t } }).catch(() => null);
      const list = r?.assets ?? [];
      const exact = list.find((x) => x.symbol.toUpperCase() === t.toUpperCase());
      return exact?.symbol ?? list[0]?.symbol ?? (SYM.test(t) ? t.toUpperCase() : null);
    },
  });
}

function useAsset(symbol: string | null | undefined) {
  const stats = useServerFn(marketStats); const dcf = useServerFn(marketDcf);
  return useQuery({
    queryKey: ["compare", symbol], enabled: !!symbol, staleTime: 300_000,
    queryFn: async () => {
      const [s, d] = await Promise.all([stats({ data: { symbol: symbol! } }), dcf({ data: { symbol: symbol! } }).catch(() => null)]);
      let fair: number | null = null;
      if (d && d.fcf && d.shares && d.price && d.fcf > 0 && (!d.finCurrency || d.finCurrency === d.currency)) {
        const g = d.revenueGrowth ?? d.earningsGrowth;
        if (g != null) fair = dcfValue({ fcf: d.fcf, ...scenario("base", g), cash: d.cash ?? 0, debt: d.debt ?? 0, shares: d.shares });
      }
      return { s, d, fair };
    },
  });
}

function Compare() {
  const p = usePortfolio();
  const bg = p.lang === "bg";
  const [a, setA] = useState("AAPL"); const [b, setB] = useState("MSFT");
  const ra = useResolved(a); const rb = useResolved(b);
  const qa = useAsset(ra.data); const qb = useAsset(rb.data);
  const loc = languageLocale(p.lang);
  const num = (v: number | null | undefined, d = 2) => (v == null ? "—" : new Intl.NumberFormat(loc, { maximumFractionDigits: d, minimumFractionDigits: d }).format(v));
  const cap = (v: number | null | undefined) => (v == null ? "—" : new Intl.NumberFormat(loc, { notation: "compact", maximumFractionDigits: 2 }).format(v));
  const pct = (v: number | null | undefined) => (v == null ? "—" : `${num(v * 100, 1)}%`);
  type R = typeof qa.data;
  const rows: [string, (x: R) => string, ((x: R) => number | null)?, boolean?][] = [
    [bg ? "Цена" : "Price", (x) => `${num(x?.d?.price ?? x?.s?.previousClose)} ${x?.s?.currency ?? ""}`],
    [bg ? "Справедлива цена (DCF, база)" : "Fair value (DCF, base)", (x) => num(x?.fair)],
    [bg ? "Подценяване" : "Upside to fair value", (x) => (x?.fair && x?.d?.price ? pct(valuationGap(x.fair, x.d.price)) : "—"), (x) => (x?.fair && x?.d?.price ? valuationGap(x.fair, x.d.price) : null), true],
    [bg ? "Пазарна капитализация" : "Market cap", (x) => cap(x?.s?.marketCap)],
    ["P/E (TTM)", (x) => num(x?.s?.pe), (x) => x?.s?.pe ?? null, false],
    ["EPS (TTM)", (x) => num(x?.s?.eps)],
    [bg ? "Дивидентна доходност" : "Dividend yield", (x) => (x?.s?.dividendYield == null ? "—" : `${num(x.s.dividendYield)}%`), (x) => x?.s?.dividendYield ?? null, true],
    [bg ? "Ръст на приходите" : "Revenue growth", (x) => pct(x?.d?.revenueGrowth), (x) => x?.d?.revenueGrowth ?? null, true],
    [bg ? "Бета (риск)" : "Beta (risk)", (x) => num(x?.s?.beta), (x) => x?.s?.beta ?? null, false],
    [bg ? "52-седмичен диапазон" : "52-week range", (x) => (x?.s?.low52 == null ? "—" : `${num(x.s.low52)} – ${num(x.s.high52)}`)],
    [bg ? "Целева цена на анализаторите" : "Analyst target", (x) => num(x?.s?.target)],
  ];
  const win = (get: ((x: R) => number | null) | undefined, higher: boolean | undefined, side: 0 | 1) => {
    if (!get) return false;
    const va = get(qa.data), vb = get(qb.data);
    if (va == null || vb == null || va === vb) return false;
    const aWins = higher ? va > vb : va < vb;
    return side === 0 ? aWins : !aWins;
  };
  const head = (sym: string | null | undefined, name?: string) => (
    <div className="flex items-center gap-2">{sym && <CompanyLogo symbol={sym} size={32} />}<div className="min-w-0"><div className="font-semibold">{sym ?? "—"}</div><div className="truncate text-xs text-muted-foreground">{name ?? ""}</div></div></div>
  );
  return (
    <div className="page-enter space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">{bg ? "Сравнение един срещу друг" : "Head-to-head comparison"}</h1>
        <p className="text-sm text-muted-foreground">{bg ? "Въведи тикер или име на две компании или ETF-а." : "Enter a ticker or name for two companies or ETFs."}</p>
      </div>
      <ProGate title={bg ? "Сравни активи" : "Compare assets"} desc={bg ? "Сравнението на активи е част от Pro." : "Asset comparison is part of Pro."} preview={<BarsSilhouette />}>
        <div className="grid grid-cols-2 gap-3">
          <Input aria-label="Asset A" value={a} onChange={(e) => setA(e.target.value)} placeholder="Apple / AAPL" />
          <Input aria-label="Asset B" value={b} onChange={(e) => setB(e.target.value)} placeholder="Microsoft / MSFT" />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th className="w-2/5" /><th className="p-2 text-left">{head(ra.data, qa.data?.d?.name)}</th><th className="p-2 text-left">{head(rb.data, qb.data?.d?.name)}</th></tr></thead>
            <tbody>
              {rows.map(([label, fmt, get, higher]) => (
                <tr key={label} className="border-t border-border">
                  <td className="p-2 text-muted-foreground">{label}</td>
                  {([0, 1] as const).map((side) => (
                    <td key={side} className={`p-2 font-semibold tabular-nums ${win(get, higher, side) ? "text-success" : ""}`}>{(side ? qb : qa).isLoading ? "…" : fmt(side ? qb.data : qa.data)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{bg ? "Данни от Yahoo Finance; „—“ означава, че показателят липсва. DCF е опростен модел (9% дисконт, 2.5% терминален ръст) — не е инвестиционен съвет." : "Data from Yahoo Finance; “—” means the figure is unavailable. DCF is a simplified model (9% discount, 2.5% terminal growth) — not investment advice."}</p>
      </ProGate>
    </div>
  );
}
