import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/AppShell";
import { ProBadge } from "@/components/ProFeatures";
import { CompanyLogo } from "@/components/CompanyLogo";
import { getPortfolioHistory } from "@/lib/history.functions";
import { historyReturn } from "@/lib/history";
import { lastWeek } from "@/lib/health";
import { pct, usePortfolio } from "@/lib/store";
import type { Lang } from "@/lib/i18n";

const copy: Record<
  Lang,
  {
    title: string;
    week: string;
    best: string;
    worst: string;
    today: string;
    na: string;
    flows: string;
  }
> = {
  en: {
    title: "Weekly digest",
    week: "Portfolio, last 7 days",
    best: "Strongest today",
    worst: "Weakest today",
    today: "daily move",
    na: "Not enough price history for the last 7 days.",
    flows: "Return excludes deposits and withdrawals.",
  },
  bg: {
    title: "Седмичен обзор",
    week: "Портфолио, последните 7 дни",
    best: "Най-силна днес",
    worst: "Най-слаба днес",
    today: "дневна промяна",
    na: "Няма достатъчно ценова история за последните 7 дни.",
    flows: "Доходността изключва вноски и тегления.",
  },
  de: {
    title: "Wochenrückblick",
    week: "Depot, letzte 7 Tage",
    best: "Stärkste heute",
    worst: "Schwächste heute",
    today: "Tagesbewegung",
    na: "Nicht genug Kurshistorie für 7 Tage.",
    flows: "Rendite ohne Ein- und Auszahlungen.",
  },
  es: {
    title: "Resumen semanal",
    week: "Cartera, últimos 7 días",
    best: "Más fuerte hoy",
    worst: "Más débil hoy",
    today: "movimiento diario",
    na: "No hay suficiente historial de 7 días.",
    flows: "La rentabilidad excluye aportaciones y retiros.",
  },
  it: {
    title: "Riepilogo settimanale",
    week: "Portafoglio, ultimi 7 giorni",
    best: "Più forte oggi",
    worst: "Più debole oggi",
    today: "variazione giornaliera",
    na: "Storico prezzi insufficiente per 7 giorni.",
    flows: "Il rendimento esclude versamenti e prelievi.",
  },
};

export function WeeklyDigest() {
  const p = usePortfolio();
  const c = copy[p.lang];
  const fn = useServerFn(getPortfolioHistory);
  const enabled = !!p.user && p.isPro && p.holdings.length > 0;
  const q = useQuery({
    queryKey: ["portfolio-history", p.user?.id, p.transactions, "1M", p.currency],
    queryFn: () => fn({ data: { period: "1M", currency: p.currency } }),
    enabled,
    staleTime: 60000,
  });
  if (!enabled) return null;

  const week = historyReturn(lastWeek(q.data?.points ?? []));
  const movers = p.holdings
    .filter((h) => h.value > 0 && Number.isFinite(h.dayChange) && h.value - h.dayChange > 0)
    .map((h) => ({ h, r: (h.dayChange / (h.value - h.dayChange)) * 100 }))
    .sort((a, b) => b.r - a.r);
  const best = movers[0];
  const worst = movers.length > 1 ? movers.at(-1) : undefined;

  const Mover = ({ m, label, up }: { m: NonNullable<typeof best>; label: string; up: boolean }) => (
    <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
      <CompanyLogo symbol={m.h.asset.symbol} type={m.h.asset.type} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {label}
        </div>
        <div className="truncate font-semibold">{m.h.asset.symbol}</div>
      </div>
      <span
        className={`tabular-nums font-semibold ${m.r >= 0 ? "text-success" : "text-destructive"}`}
      >
        {pct(m.r)}
      </span>
    </div>
  );

  return (
    <Card className="lg:col-span-3">
      <div className="mb-4 flex items-center gap-2">
        <CalendarDays size={18} className="text-primary" />
        <h3 className="font-display font-semibold">{c.title}</h3>
        <ProBadge />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-border p-3">
          <div className="text-xs text-muted-foreground">{c.week}</div>
          {q.isLoading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-muted" />
          ) : week == null ? (
            <p className="mt-1 text-sm text-muted-foreground">{c.na}</p>
          ) : (
            <>
              <div
                className={`font-display text-3xl font-bold tabular-nums ${week >= 0 ? "text-success" : "text-destructive"}`}
              >
                {pct(week)}
              </div>
              <p className="text-xs text-muted-foreground">{c.flows}</p>
            </>
          )}
        </div>
        {best && <Mover m={best} label={c.best} up />}
        {worst && <Mover m={worst} label={c.worst} up={false} />}
      </div>
    </Card>
  );
}
