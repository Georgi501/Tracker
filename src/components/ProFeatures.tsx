import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Lock, Sparkles } from "lucide-react";
import { Card } from "@/components/AppShell";
import { pct, usePortfolio } from "@/lib/store";
import { proCopy } from "@/lib/pro-i18n";
import { fireProjection } from "@/lib/pro";
import { planCopy } from "@/lib/plan-i18n";

export function ProBadge() {
  return <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary"><Sparkles size={10} />Pro</span>;
}

/** Shows children for Pro users; free users see a blurred non-numeric silhouette and an upgrade call. */
export function ProGate({ title, desc, preview, children, className = "" }: { title: string; desc: string; preview: ReactNode; children: ReactNode; className?: string }) {
  const p = usePortfolio();
  const c = proCopy[p.lang];
  return (
    <Card className={className}>
      <div className="mb-3 flex items-center gap-2"><h3 className="font-display font-semibold">{title}</h3><ProBadge /></div>
      {p.isPro ? children : (
        <div className="relative overflow-hidden rounded-xl">
          <div aria-hidden className="pointer-events-none select-none blur-[3px] opacity-60">{preview}</div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/40 p-4 text-center">
            <Lock size={20} className="text-primary" />
            <p className="max-w-xs text-sm text-foreground">{desc}</p>
            <Link to="/pricing" className="press rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90">{c.unlock}</Link>
            <span className="text-xs font-medium text-muted-foreground">{planCopy[p.lang].gateNote}</span>
            <Link to="/pricing" className="text-xs font-semibold text-primary underline-offset-2 hover:underline">{planCopy[p.lang].seeWhat}</Link>
          </div>
        </div>
      )}
    </Card>
  );
}

/** Abstract silhouettes for locked previews — shapes only, never figures. */
export function HeatmapSilhouette() {
  const tiles = [["col-span-3 row-span-2", "bg-success/50"], ["col-span-2 row-span-2", "bg-destructive/40"], ["col-span-1", "bg-success/30"], ["col-span-1", "bg-success/60"], ["col-span-2", "bg-destructive/25"], ["col-span-2", "bg-success/40"], ["col-span-2", "bg-muted"]];
  return <div className="grid h-48 grid-cols-6 grid-rows-3 gap-1">{tiles.map(([s, c], i) => <div key={i} className={`${s} ${c} rounded-md`} />)}</div>;
}
export function BarsSilhouette() {
  const h = [30, 55, 80, 35, 50, 90, 30, 45, 85, 40, 60, 95];
  return <div className="flex h-48 items-end gap-1.5">{h.map((v, i) => <div key={i} className="flex-1 rounded-t-md bg-primary/50" style={{ height: `${v}%` }} />)}</div>;
}
export function CurveSilhouette() {
  return <svg viewBox="0 0 200 80" className="h-48 w-full"><path d="M0 75 C60 70 110 55 200 5" fill="none" stroke="var(--primary)" strokeWidth="3" /><line x1="0" y1="20" x2="200" y2="20" stroke="var(--muted-foreground)" strokeDasharray="4 4" /></svg>;
}

export function Heatmap() {
  const p = usePortfolio();
  const c = proCopy[p.lang];
  const items = p.holdings.filter((h) => Number.isFinite(h.value) && h.value > 0);
  const total = items.reduce((s, h) => s + h.value, 0);
  if (!items.length) return <p className="py-8 text-sm text-muted-foreground">{c.noHoldings}</p>;
  return (
    <div className="flex h-64 flex-wrap gap-1">
      {items.map((h) => {
        const w = h.value / total;
        const ch = h.asset.change24h;
        const strength = Number.isFinite(ch) ? Math.min(1, Math.abs(ch) / 3) : 0;
        const bg = !Number.isFinite(ch) ? "var(--muted)" : `color-mix(in oklab, ${ch >= 0 ? "var(--success)" : "var(--destructive)"} ${25 + strength * 60}%, var(--card))`;
        return (
          <div key={h.asset.id} title={`${h.asset.name} · ${p.money(h.value)}`} style={{ flexGrow: w * 100, flexBasis: `${Math.max(12, w * 100)}%`, background: bg }}
            className="flex min-h-16 flex-col items-center justify-center rounded-md p-1 text-center">
            <span className="font-display text-sm font-bold">{h.asset.symbol}</span>
            <span className="text-xs">{pct(ch)}</span>
            <span className="text-[10px] text-muted-foreground">{(w * 100).toFixed(1)}%</span>
          </div>
        );
      })}
    </div>
  );
}

export function FireCalculator() {
  const p = usePortfolio();
  const c = proCopy[p.lang];
  const rate = p.currency === "USD" ? 1 : p.eurPerUsd;
  const portfolio = p.holdings.reduce((s, h) => s + (Number.isFinite(h.value) ? h.value : 0), 0) * (rate ?? Number.NaN);
  const [current, setCurrent] = useState("");
  const [monthly, setMonthly] = useState("500");
  const [ret, setRet] = useState("6");
  const [spend, setSpend] = useState("24000");
  useEffect(() => { if (Number.isFinite(portfolio) && current === "") setCurrent(String(Math.round(portfolio))); }, [portfolio]);
  const r = fireProjection({ current: Number(current) || 0, monthly: Number(monthly) || 0, annualReturnPct: Number(ret) || 0, annualSpend: Number(spend) || 0 });
  const fmt = (v: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: p.currency, maximumFractionDigits: 0 }).format(v);
  const field = (label: string, v: string, set: (s: string) => void) => (
    <label className="text-xs text-muted-foreground">{label}
      <input type="number" inputMode="decimal" value={v} onChange={(e) => set(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
    </label>
  );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {field(`${c.current} (${p.currency})`, current, setCurrent)}
        {field(`${c.monthly} (${p.currency})`, monthly, setMonthly)}
        {field(c.returnPct, ret, setRet)}
        {field(`${c.spend} (${p.currency})`, spend, setSpend)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-secondary p-3"><p className="text-xs text-muted-foreground">{c.fireNumber}</p><p className="font-display text-xl font-bold">{fmt(r.target)}</p></div>
        <div className="rounded-xl bg-primary/10 p-3"><p className="text-xs text-muted-foreground">{c.fireIn}</p>
          <p className="font-display text-xl font-bold text-primary">{r.years === null ? c.never : `${r.years.toFixed(1)} ${c.years}`}</p></div>
      </div>
      <p className="text-xs text-muted-foreground">{c.assumption}</p>
    </div>
  );
}
