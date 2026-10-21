import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CompanyLogo } from "@/components/CompanyLogo";
import { KeyStats } from "@/components/KeyStats";
import { CHART_RANGES, marketDetails, marketExtended, marketQuote, type ChartRange } from "@/lib/market.functions";
import { languageLocale, type Lang } from "@/lib/i18n";

type T = "stock" | "etf" | "crypto";
const L = {
  en: { noChart: "Chart data is not available.", noQuote: "Live price unavailable", asOf: "As of", period: "in period", atClose: "At close:", pre: "Pre-market", post: "After hours" },
  bg: { noChart: "Няма данни за графиката.", noQuote: "Няма текуща цена", asOf: "Към", period: "за периода", atClose: "При затваряне:", pre: "Преди отваряне", post: "След затваряне" },
};

export function QuoteHero({ symbol, name, type, lang }: { symbol: string; name: string; type: T; lang: Lang }) {
  const c = lang === "bg" ? L.bg : L.en;
  const loc = languageLocale(lang);
  const quoteFn = useServerFn(marketQuote);
  const detailsFn = useServerFn(marketDetails);
  const extFn = useServerFn(marketExtended);
  const [range, setRange] = useState<ChartRange>("1D");
  const q = useQuery({ queryKey: ["market-quote", symbol, type], queryFn: () => quoteFn({ data: { symbol, type } }), staleTime: 60_000, refetchInterval: 60_000 });
  const ch = useQuery({ queryKey: ["market-details", symbol, type, range], queryFn: () => detailsFn({ data: { symbol, type, range } }), staleTime: range === "1D" ? 60_000 : 600_000 });
  const usListing = type !== "crypto" && !symbol.includes(".");
  const e = useQuery({ queryKey: ["market-ext", symbol], queryFn: () => extFn({ data: { symbol } }), enabled: usListing, staleTime: 60_000, refetchInterval: 60_000 });
  const ext = e.data?.ext ?? null;
  const quote = q.data?.quote ?? null;
  const cur = quote?.currency ?? ch.data?.currency ?? "USD";
  const money = (v: number) => new Intl.NumberFormat(loc, { style: "currency", currency: cur, maximumFractionDigits: 2 }).format(v);
  const num = (v: number) => new Intl.NumberFormat(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  const closes = ch.data?.closes ?? [];
  const first = closes[0]?.c, last = closes.at(-1)?.c;
  const periodPct = first && last ? (last / first - 1) * 100 : null;
  const up = periodPct == null ? (quote?.change ?? 0) >= 0 : periodPct >= 0;
  const color = up ? "var(--success, var(--primary))" : "var(--destructive)";
  const change = quote?.change ?? null;
  const absChange = quote && change != null ? quote.price - quote.price / (1 + change / 100) : null;
  const intraday = range === "1D" || range === "1W";
  const fmtT = (t: number) => new Date(t).toLocaleString(loc, intraday ? { hour: "2-digit", minute: "2-digit", ...(range === "1W" ? { day: "numeric", month: "short" } : {}) } : { day: "numeric", month: "short", year: range === "1M" || range === "3M" ? undefined : "2-digit" });

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <CompanyLogo symbol={symbol} type={type} />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{type.toUpperCase()} · {cur}</p>
          <h1 className="truncate font-display text-xl font-bold sm:text-2xl">{name}{name.toUpperCase() !== symbol && <span className="text-muted-foreground"> ({symbol})</span>}</h1>
        </div>
      </div>
      <div className="mt-4">
        {q.isLoading ? <div className="h-12 w-56 animate-pulse rounded-md bg-muted" /> : quote ? (
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <p className="flex flex-wrap items-baseline gap-x-3 tabular-nums">
                <span className="font-display text-4xl font-bold">{num(quote.price)}</span>
                {change != null && absChange != null && <span className={`text-xl font-semibold ${change >= 0 ? "text-success" : "text-destructive"}`}>{change >= 0 ? "+" : ""}{num(absChange)} ({change >= 0 ? "+" : ""}{num(change)}%)</span>}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{ext ? c.atClose : c.asOf} {new Date(quote.at).toLocaleString(loc, { dateStyle: "medium", timeStyle: "short" })} · {quote.source}</p>
            </div>
            {ext && (
              <div>
                <p className="flex flex-wrap items-baseline gap-x-2 tabular-nums">
                  <span className="font-display text-2xl font-bold">{num(ext.price)}</span>
                  <span className={`text-base font-semibold ${ext.change >= 0 ? "text-success" : "text-destructive"}`}>{ext.change >= 0 ? "+" : ""}{num(ext.change)} ({ext.change >= 0 ? "+" : ""}{num(ext.changePct)}%)</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{ext.session === "pre" ? `🌅 ${c.pre}` : `🌙 ${c.post}`}: {new Date(ext.at).toLocaleString(loc, { timeStyle: "short" })}</p>
              </div>
            )}
          </div>
        ) : <p className="text-sm text-muted-foreground">{c.noQuote}</p>}
      </div>
      <div className="mt-4 rounded-xl border border-border p-3">
        <div role="group" className="mb-2 flex flex-wrap items-center gap-1">
          {CHART_RANGES.map((r) => (
            <button key={r} type="button" aria-pressed={r === range} onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${r === range ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>{r === "MAX" ? "Max" : r}</button>
          ))}
          {periodPct != null && <span className={`ml-auto text-sm font-semibold tabular-nums ${up ? "text-success" : "text-destructive"}`}>{up ? "+" : ""}{num(periodPct)}% {c.period}</span>}
        </div>
        {ch.isFetching && !ch.data ? <div className="h-72 animate-pulse rounded-md bg-muted" /> : closes.length > 1 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={closes} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <defs><linearGradient id="qh-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.35} /><stop offset="100%" stopColor={color} stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} tickFormatter={fmtT} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={40} />
                <YAxis orientation="right" domain={["auto", "auto"]} tickFormatter={(v: number) => num(v)} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={64} />
                {first != null && <ReferenceLine y={first} stroke="var(--muted-foreground)" strokeDasharray="4 4" strokeOpacity={0.6} />}
                <Tooltip labelFormatter={(t) => new Date(Number(t)).toLocaleString(loc, { dateStyle: "medium", timeStyle: intraday ? "short" : undefined })}
                  formatter={(v) => [money(Number(v)), symbol]} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="c" stroke={color} strokeWidth={2} fill="url(#qh-fill)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="py-10 text-center text-sm text-muted-foreground">{c.noChart}</p>}
      </div>
      {type !== "crypto" && <KeyStats symbol={symbol} lang={lang} />}
    </section>
  );
}
