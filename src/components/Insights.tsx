import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Card } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { pct, usePortfolio } from "@/lib/store";
import { insightsCopy } from "@/lib/insights-i18n";
import { concentration, goalProjection, requiredMonthly, type DividendRow } from "@/lib/insights";
import { languageLocale } from "@/lib/i18n";

export function ConcentrationCard() {
  const p = usePortfolio();
  const c = insightsCopy[p.lang];
  const r = concentration(p.holdings);
  const label = { position: c.position_, sector: c.sector, currency: c.currency };
  return (
    <Card>
      <h3 className="font-display font-semibold">{c.concentration}</h3>
      <p className="mb-3 text-xs text-muted-foreground">{c.concHint}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
        {r.top.map((t) => (
          <div key={t.kind} className="rounded-xl bg-secondary p-3">
            <p className="text-xs text-muted-foreground">
              {c.largest} · {label[t.kind]}
            </p>
            <p className="truncate font-semibold">{t.name}</p>
            <p
              className={`font-display text-lg font-bold ${t.weight > t.limit ? "text-destructive" : ""}`}
            >
              {pct(t.weight, false)}
            </p>
          </div>
        ))}
      </div>
      <ul className="mt-3 space-y-1.5 text-sm">
        {r.warnings.map((w) => (
          <li key={w.kind + w.name} className="flex items-start gap-2 text-destructive">
            <AlertTriangle size={14} />
            {label[w.kind]} {w.name}: {pct(w.weight, false)} &gt; {w.limit}%
          </li>
        ))}
        {r.top.length > 0 && !r.warnings.length && (
          <li className="flex items-center gap-2 text-success">
            <CheckCircle2 size={14} />
            {c.ok}
          </li>
        )}
      </ul>
    </Card>
  );
}

export function DividendTable({ rows }: { rows: DividendRow[] }) {
  const p = usePortfolio();
  const c = insightsCopy[p.lang];
  return (
    <Card className="lg:col-span-3">
      <h3 className="font-display mb-2 font-semibold">{c.byPosition}</h3>
      {!rows.length ? (
        <p className="py-4 text-sm text-muted-foreground">—</p>
      ) : (
        <>
          <ul className="divide-y divide-border sm:hidden">
            {rows.map((r) => (
              <li
                key={r.symbol}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-1 py-2.5 text-sm"
              >
                <b className="truncate">{r.symbol}</b>
                <span className="text-right font-semibold">{p.money(r.income)}</span>
                <span className="col-span-2 text-xs text-muted-foreground">
                  {c.yieldCol} {pct(r.yieldPct, false)} · {c.yoc} {pct(r.yocPct, false)}
                </span>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2">{c.position}</th>
                  <th className="text-right">{c.income}</th>
                  <th className="text-right">{c.yieldCol}</th>
                  <th className="text-right">{c.yoc}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.symbol}>
                    <td className="py-2 font-semibold">{r.symbol}</td>
                    <td className="text-right">{p.money(r.income)}</td>
                    <td className="text-right">{pct(r.yieldPct, false)}</td>
                    <td className="text-right">{pct(r.yocPct, false)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

interface Goal {
  id: string;
  name: string;
  target: number;
  date: string;
  monthly: number;
  ret: number;
  currency: "EUR" | "USD";
}

export function GoalsCard() {
  const p = usePortfolio();
  const c = insightsCopy[p.lang];
  const qc = useQueryClient();
  const usd = p.holdings.reduce((s, h) => s + (Number.isFinite(h.value) ? h.value : 0), 0);
  const inCur = (cur: Goal["currency"]) => usd * (cur === "USD" ? 1 : (p.eurPerUsd ?? Number.NaN));
  const key = ["goals", p.user?.id];
  const q = useQuery({
    queryKey: key,
    enabled: !!p.user,
    queryFn: async (): Promise<Goal[]> => {
      const { data, error } = await supabase
        .from("goals")
        .select("id,name,target,target_date,monthly,annual_return,currency")
        .order("target_date");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        target: Number(r.target),
        date: r.target_date,
        monthly: Number(r.monthly),
        ret: Number(r.annual_return),
        currency: r.currency as Goal["currency"],
      }));
    },
  });
  const goals = q.data ?? [];
  const [f, setF] = useState({ name: "", target: "", date: "", monthly: "300", ret: "6" });
  const [err, setErr] = useState("");
  const fmt = (v: number, cur: string) =>
    Number.isFinite(v)
      ? new Intl.NumberFormat(languageLocale(p.lang), {
          style: "currency",
          currency: cur,
          maximumFractionDigits: 0,
        }).format(v)
      : "—";
  const add = useMutation({
    mutationFn: async () => {
      const target = Number(f.target);
      if (
        !f.name.trim() ||
        !(target > 0) ||
        !f.date ||
        f.date <= new Date().toISOString().slice(0, 10)
      )
        throw new Error("invalid");
      const { error } = await supabase.from("goals").insert({
        name: f.name.trim().slice(0, 60),
        target,
        target_date: f.date,
        monthly: Math.max(0, Number(f.monthly) || 0),
        annual_return: Math.max(-50, Math.min(50, Number(f.ret) || 0)),
        currency: p.currency,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setErr("");
      setF({ ...f, name: "", target: "" });
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => setErr(e.message === "invalid" ? c.invalid : c.saveError),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
  const input =
    "mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-base text-foreground sm:h-10 sm:text-sm";
  return (
    <Card className="lg:col-span-2">
      <h3 className="font-display font-semibold">{c.goals}</h3>
      <p className="mb-3 text-xs text-muted-foreground">{c.assumption}</p>
      {!p.user ? (
        <p className="text-sm text-muted-foreground">{c.signIn}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
            <label className="col-span-2 text-xs text-muted-foreground">
              {c.goalName}
              <input
                className={input}
                value={f.name}
                maxLength={60}
                onChange={(e) => setF({ ...f, name: e.target.value })}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              {c.target} ({p.currency})
              <input
                type="number"
                inputMode="decimal"
                min="0"
                className={input}
                value={f.target}
                onChange={(e) => setF({ ...f, target: e.target.value })}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              {c.date}
              <input
                type="date"
                className={input}
                value={f.date}
                onChange={(e) => setF({ ...f, date: e.target.value })}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              {c.monthly}
              <input
                type="number"
                inputMode="decimal"
                min="0"
                className={input}
                value={f.monthly}
                onChange={(e) => setF({ ...f, monthly: e.target.value })}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              {c.ret}
              <input
                type="number"
                inputMode="decimal"
                className={input}
                value={f.ret}
                onChange={(e) => setF({ ...f, ret: e.target.value })}
              />
            </label>
          </div>
          <Button
            className="mt-3 h-11 w-full sm:h-9 sm:w-auto"
            onClick={() => add.mutate()}
            disabled={add.isPending}
          >
            {c.add}
          </Button>
          {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
          {!goals.length && !q.isFetching && (
            <p className="mt-4 text-sm text-muted-foreground">{c.noGoals}</p>
          )}
          <ul className="mt-4 space-y-3">
            {goals.map((g) => {
              const cur = inCur(g.currency);
              const months = Math.max(0, (Date.parse(g.date) - Date.now()) / (30.4375 * 86400000));
              const known = Number.isFinite(cur);
              const [lo, base, hi] = [g.ret - 3, g.ret, g.ret + 3].map((r) =>
                known
                  ? goalProjection({ current: cur, monthly: g.monthly, annualReturnPct: r, months })
                  : Number.NaN,
              );
              const need = known
                ? requiredMonthly({
                    current: cur,
                    target: g.target,
                    annualReturnPct: g.ret,
                    months,
                  })
                : Number.NaN;
              const progress = known ? Math.min(100, (cur / g.target) * 100) : 0;
              const ok = base! >= g.target;
              return (
                <li key={g.id} className="rounded-xl border border-border p-3">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{g.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmt(g.target, g.currency)} ·{" "}
                        {new Date(g.date).toLocaleDateString(languageLocale(p.lang))}
                      </p>
                    </div>
                    <button
                      aria-label="Remove"
                      onClick={() => del.mutate(g.id)}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-secondary">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{known ? `${progress.toFixed(0)}% ${c.progress}` : "—"}</span>
                    {known && (
                      <span className={ok ? "text-success" : "text-destructive"}>
                        {ok ? c.onTrack : `${c.offTrack} ${fmt(need, g.currency)}${c.perMonth}`}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                    {[lo, base, hi].map((v, i) => (
                      <div
                        key={i}
                        className={`rounded-lg p-2 ${i === 1 ? "bg-primary/10" : "bg-secondary"}`}
                      >
                        <p className="text-muted-foreground">
                          {[`${g.ret - 3}%`, `${g.ret}%`, `${g.ret + 3}%`][i]}
                        </p>
                        <p className="font-semibold text-foreground">{fmt(v!, g.currency)}</p>
                      </div>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
}
