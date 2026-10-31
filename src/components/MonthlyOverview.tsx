import { CalendarDays, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/AppShell";
import { CompanyLogo } from "@/components/CompanyLogo";
import { historyReturn, type PortfolioPoint } from "@/lib/history";
import { languageLocale, type Lang } from "@/lib/i18n";
import { pct, usePortfolio } from "@/lib/store";

type MonthlyHistory = {
  points: PortfolioPoint[];
  unavailable: boolean;
  assetReturns: { assetId: string; returnPct: number }[];
};

const COPY: Record<
  Lang,
  {
    title: string;
    return: string;
    valueChange: string;
    netPurchases: string;
    dividends: string;
    best: string;
    weakest: string;
    note: string;
    unavailable: string;
    error: string;
    retry: string;
    noMovers: string;
    loading: string;
  }
> = {
  en: {
    title: "Monthly overview",
    return: "Month-to-date return",
    valueChange: "Portfolio value change",
    netPurchases: "Net purchases (buys − sales)",
    dividends: "Dividends received",
    best: "Best held-asset price move",
    weakest: "Weakest held-asset price move",
    note: "Value change includes recorded buys and sales; return excludes those flows. Net purchases are trade amounts, not cash deposits. Leaders show price-only changes.",
    unavailable: "Historical prices are incomplete, so the monthly return is unavailable.",
    error: "The monthly overview could not be loaded.",
    retry: "Retry",
    noMovers: "No held-asset price history is available for this month.",
    loading: "Loading monthly data…",
  },
  bg: {
    title: "Месечен обзор",
    return: "Доходност от началото на месеца",
    valueChange: "Промяна в стойността",
    netPurchases: "Нетни покупки (покупки − продажби)",
    dividends: "Получени дивиденти",
    best: "Най-силен ценови ръст сред активите",
    weakest: "Най-слаб ценови резултат сред активите",
    note: "Промяната в стойността включва записаните покупки и продажби; доходността ги изключва. Нетните покупки са стойности на сделки, не парични вноски. Лидерите показват само промяна в цената.",
    unavailable: "Историческите цени са непълни и месечната доходност не е налична.",
    error: "Месечният обзор не можа да се зареди.",
    retry: "Опитай отново",
    noMovers: "Няма налична месечна ценова история за държаните активи.",
    loading: "Зареждане на месечните данни…",
  },
  de: {
    title: "Monatsübersicht",
    return: "Rendite seit Monatsbeginn",
    valueChange: "Wertänderung",
    netPurchases: "Nettokäufe (Käufe − Verkäufe)",
    dividends: "Erhaltene Dividenden",
    best: "Stärkste Kursbewegung gehaltener Werte",
    weakest: "Schwächste Kursbewegung gehaltener Werte",
    note: "Die Wertänderung enthält erfasste Käufe und Verkäufe; die Rendite bereinigt diese Flüsse. Nettokäufe sind Handelsbeträge, keine Einzahlungen. Gewinner zeigen nur Kursänderungen.",
    unavailable: "Die Kurshistorie ist unvollständig; die Monatsrendite ist nicht verfügbar.",
    error: "Die Monatsübersicht konnte nicht geladen werden.",
    retry: "Erneut versuchen",
    noMovers: "Keine monatliche Kurshistorie für gehaltene Werte verfügbar.",
    loading: "Monatsdaten werden geladen…",
  },
  es: {
    title: "Resumen mensual",
    return: "Rentabilidad desde el inicio del mes",
    valueChange: "Cambio del valor",
    netPurchases: "Compras netas (compras − ventas)",
    dividends: "Dividendos recibidos",
    best: "Mayor subida entre los activos en cartera",
    weakest: "Mayor caída entre los activos en cartera",
    note: "El cambio del valor incluye compras y ventas registradas; la rentabilidad excluye esos flujos. Las compras netas son importes de operaciones, no depósitos. Los líderes muestran solo cambios de precio.",
    unavailable:
      "El historial de precios está incompleto y la rentabilidad mensual no está disponible.",
    error: "No se pudo cargar el resumen mensual.",
    retry: "Reintentar",
    noMovers: "No hay historial mensual disponible para los activos en cartera.",
    loading: "Cargando datos mensuales…",
  },
  it: {
    title: "Riepilogo mensile",
    return: "Rendimento da inizio mese",
    valueChange: "Variazione del valore",
    netPurchases: "Acquisti netti (acquisti − vendite)",
    dividends: "Dividendi ricevuti",
    best: "Miglior variazione di prezzo tra gli asset detenuti",
    weakest: "Peggior variazione di prezzo tra gli asset detenuti",
    note: "La variazione del valore include acquisti e vendite registrati; il rendimento esclude questi flussi. Gli acquisti netti sono importi delle operazioni, non depositi. I migliori mostrano solo variazioni di prezzo.",
    unavailable: "Lo storico dei prezzi è incompleto e il rendimento mensile non è disponibile.",
    error: "Impossibile caricare il riepilogo mensile.",
    retry: "Riprova",
    noMovers: "Storico mensile non disponibile per gli asset detenuti.",
    loading: "Caricamento dei dati mensili…",
  },
};

export function MonthlyOverview({
  data,
  isLoading,
  isError,
  onRetry,
}: {
  data: MonthlyHistory | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const p = usePortfolio();
  const c = COPY[p.lang];
  if (!p.user || !p.holdings.length) return null;

  const now = new Date();
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const points = data?.points ?? [];
  const beforeMonth = points.filter((point) => point.t < monthStart).at(-1);
  const monthPoints = points.filter((point) => point.t >= monthStart);
  const returnPoints = [...(beforeMonth ? [beforeMonth] : []), ...monthPoints];
  const monthlyReturn = historyReturn(returnPoints);
  const monthValueChange =
    beforeMonth && monthPoints.length ? monthPoints.at(-1)!.v - beforeMonth.v : Number.NaN;
  const contributions = monthPoints.reduce((sum, point) => sum + point.flow, 0);
  const monthStartDate = new Date(monthStart).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  const dividends = p.transactions
    .filter(
      (transaction) =>
        transaction.kind === "dividend" &&
        transaction.date >= monthStartDate &&
        transaction.date <= today,
    )
    .reduce(
      (sum, transaction) => sum + transaction.quantity * transaction.price - (transaction.fee ?? 0),
      0,
    );
  const returns = (data?.assetReturns ?? [])
    .map((item) => ({
      ...item,
      asset: p.assets.find((asset) => asset.id === item.assetId),
    }))
    .filter((item) => item.asset && Number.isFinite(item.returnPct))
    .sort((a, b) => b.returnPct - a.returnPct);
  const best = returns[0];
  const weakest = returns.at(-1);
  const locale = languageLocale(p.lang);
  const monthName = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(now);

  const mover = (item: (typeof returns)[number] | undefined, up: boolean, label: string) => {
    if (!item?.asset) return null;
    const Icon = up ? TrendingUp : TrendingDown;
    return (
      <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border p-3">
        <CompanyLogo symbol={item.asset.symbol} type={item.asset.type} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] text-muted-foreground">{label}</p>
          <p className="truncate text-sm font-semibold">{item.asset.symbol}</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 text-sm font-bold tabular-nums ${item.returnPct >= 0 ? "text-success" : "text-destructive"}`}
        >
          <Icon size={14} aria-hidden />
          {pct(item.returnPct)}
        </span>
      </div>
    );
  };

  return (
    <Card className="min-w-0 lg:col-span-3">
      <div className="mb-3 flex items-center gap-2">
        <CalendarDays size={18} className="text-primary" aria-hidden />
        <h2 className="font-display font-semibold">{c.title}</h2>
        <span className="ml-auto text-xs text-muted-foreground">{monthName}</span>
      </div>
      {isError ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">{c.error}</span>
          <button
            type="button"
            onClick={onRetry}
            className="font-semibold text-primary hover:underline"
          >
            {c.retry}
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">{c.return}</p>
              <p
                className={`mt-1 text-xl font-bold tabular-nums ${monthlyReturn == null ? "" : monthlyReturn >= 0 ? "text-success" : "text-destructive"}`}
              >
                {isLoading && !data ? "…" : monthlyReturn == null ? "—" : pct(monthlyReturn)}
              </p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">{c.valueChange}</p>
              <p className="mt-1 text-xl font-bold tabular-nums">
                {data && !data.unavailable && Number.isFinite(monthValueChange)
                  ? p.money(monthValueChange, { sign: true })
                  : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">{c.netPurchases}</p>
              <p className="mt-1 text-xl font-bold tabular-nums">
                {isLoading
                  ? "…"
                  : data && !data.unavailable
                    ? p.money(contributions, { sign: true })
                    : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">{c.dividends}</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{p.money(dividends)}</p>
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {isLoading ? c.loading : data?.unavailable ? c.unavailable : c.note}
          </p>
          {returns.length > 0 ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {mover(best, true, c.best)}
              {weakest !== best && mover(weakest, false, c.weakest)}
            </div>
          ) : !isLoading && !data?.unavailable ? (
            <p className="mt-3 text-xs text-muted-foreground">{c.noMovers}</p>
          ) : null}
        </>
      )}
    </Card>
  );
}
