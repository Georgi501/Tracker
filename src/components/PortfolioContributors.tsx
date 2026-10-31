import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/AppShell";
import { CompanyLogo } from "@/components/CompanyLogo";
import { usePortfolio } from "@/lib/store";
import type { Lang } from "@/lib/i18n";

type Attribution = {
  unavailable: boolean;
  assetContributions: { assetId: string; amount: number }[];
};

const COPY: Record<Lang, { title: string; note: string; loading: string; empty: string }> = {
  en: {
    title: "Gain / loss contribution by asset",
    note: "Change in value after recorded buys and sales, for the selected period. Excludes dividends; this is not a return percentage.",
    loading: "Loading contribution data…",
    empty: "No asset-level contribution is available for this period.",
  },
  bg: {
    title: "Принос към печалбата или загубата по актив",
    note: "Промяна в стойността след отчетените покупки и продажби за избрания период. Не включва дивиденти и не е процентна доходност.",
    loading: "Зареждане на приноса по активи…",
    empty: "Няма налични данни за приноса на активите за този период.",
  },
  de: {
    title: "Gewinn-/Verlustbeitrag je Anlage",
    note: "Wertänderung nach erfassten Käufen und Verkäufen im gewählten Zeitraum. Ohne Dividenden; keine Rendite in Prozent.",
    loading: "Beitragsdaten werden geladen…",
    empty: "Für diesen Zeitraum ist kein Beitrag je Anlage verfügbar.",
  },
  es: {
    title: "Contribución a ganancias o pérdidas por activo",
    note: "Cambio de valor tras las compras y ventas registradas durante el periodo elegido. Excluye dividendos; no es un porcentaje de rentabilidad.",
    loading: "Cargando contribuciones por activo…",
    empty: "No hay contribuciones por activo disponibles para este periodo.",
  },
  it: {
    title: "Contributo a profitti o perdite per asset",
    note: "Variazione di valore al netto di acquisti e vendite registrati nel periodo selezionato. Esclude i dividendi; non è una percentuale di rendimento.",
    loading: "Caricamento dei contributi per asset…",
    empty: "Nessun contributo per asset disponibile per questo periodo.",
  },
};

export function PortfolioContributors({
  data,
  isLoading,
}: {
  data: Attribution | undefined;
  isLoading: boolean;
}) {
  const p = usePortfolio();
  const c = COPY[p.lang];
  if (!p.user || !p.holdings.length) return null;

  const contributions = (data?.assetContributions ?? [])
    .map((item) => ({
      ...item,
      asset: p.assets.find((asset) => asset.id === item.assetId),
    }))
    .filter(
      (item): item is typeof item & { asset: NonNullable<typeof item.asset> } =>
        !!item.asset && Number.isFinite(item.amount) && Math.abs(item.amount) >= 0.005,
    )
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 6);

  return (
    <Card className="min-w-0 lg:col-span-3">
      <h2 className="font-display font-semibold">{c.title}</h2>
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">{c.note}</p>
      {data?.unavailable ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertTriangle size={15} aria-hidden />
          {c.empty}
        </p>
      ) : contributions.length ? (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {contributions.map((item) => (
            <li
              key={item.assetId}
              className="flex min-w-0 items-center gap-2 rounded-xl border border-border p-3"
            >
              <CompanyLogo symbol={item.asset.symbol} type={item.asset.type} size={30} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                {item.asset.symbol}
              </span>
              <span
                className={`shrink-0 text-sm font-bold tabular-nums ${item.amount >= 0 ? "text-success" : "text-destructive"}`}
              >
                {p.money(item.amount, { sign: true })}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{isLoading ? c.loading : c.empty}</p>
      )}
    </Card>
  );
}
