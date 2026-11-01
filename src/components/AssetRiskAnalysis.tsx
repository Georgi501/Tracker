import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/AppShell";
import { usePortfolio } from "@/lib/store";
import { assetRiskAnalysis } from "@/lib/tools";
import { getAssetRiskHistory } from "@/lib/market.functions";
import type { Lang } from "@/lib/i18n";

const COPY: Record<
  Lang,
  {
    title: string;
    note: string;
    loading: string;
    missing: string;
    error: string;
    contribution: string;
    observations: string;
    coverage: (count: number) => string;
  }
> = {
  en: {
    title: "Asset correlation & risk contribution",
    note: "Based on up to one year of provider daily closes, converted to USD with dated FX. Correlation is not a forecast.",
    loading: "Loading real price history…",
    missing: "Not enough overlapping real history for at least two holdings.",
    error: "Price history is unavailable; try again later.",
    contribution: "Risk contribution",
    observations: "daily observations",
    coverage: (count: number) =>
      `${count} holdings analyzed. Daily price returns exclude dividends.`,
  },
  bg: {
    title: "Корелация и принос към риска",
    note: "По реални дневни котировки за до една година, конвертирани в USD с датиран валутен курс. Корелацията не е прогноза.",
    loading: "Зареждане на реална ценова история…",
    missing: "Няма достатъчно припокриваща се история за поне две позиции.",
    error: "Ценовата история не е налична. Опитай отново по-късно.",
    contribution: "Принос към риска",
    observations: "дневни наблюдения",
    coverage: (count: number) =>
      `Анализирани позиции: ${count}. Дневните ценови доходности не включват дивиденти.`,
  },
  de: {
    title: "Korrelation & Risikobeitrag",
    note: "Basierend auf bis zu einem Jahr tatsächlicher Tageskurse, mit datiertem FX in USD umgerechnet. Korrelation ist keine Prognose.",
    loading: "Reale Kursdaten werden geladen…",
    missing: "Zu wenig gemeinsame Historie für mindestens zwei Positionen.",
    error: "Kursdaten nicht verfügbar; bitte später erneut versuchen.",
    contribution: "Risikobeitrag",
    observations: "Tagesbeobachtungen",
    coverage: (count: number) =>
      `${count} Positionen analysiert. Tagesrenditen schließen Dividenden aus.`,
  },
  es: {
    title: "Correlación y contribución al riesgo",
    note: "Basado en hasta un año de cierres diarios reales, convertidos a USD con FX fechado. La correlación no es una previsión.",
    loading: "Cargando historial real…",
    missing: "No hay suficiente historial coincidente para dos posiciones.",
    error: "Historial no disponible; inténtalo más tarde.",
    contribution: "Contribución al riesgo",
    observations: "observaciones diarias",
    coverage: (count: number) =>
      `${count} posiciones analizadas. Los rendimientos diarios no incluyen dividendos.`,
  },
  it: {
    title: "Correlazione e contributo al rischio",
    note: "Basato su un massimo di un anno di chiusure giornaliere reali, convertite in USD con FX datato. La correlazione non è una previsione.",
    loading: "Caricamento dello storico reale…",
    missing: "Storico sovrapposto insufficiente per almeno due posizioni.",
    error: "Storico prezzi non disponibile; riprova più tardi.",
    contribution: "Contributo al rischio",
    observations: "osservazioni giornaliere",
    coverage: (count: number) =>
      `${count} posizioni analizzate. I rendimenti giornalieri escludono i dividendi.`,
  },
};

export function AssetRiskAnalysis() {
  const p = usePortfolio();
  const copy = COPY[p.lang];
  const run = useServerFn(getAssetRiskHistory);
  const assets = p.holdings
    .flatMap((holding) => {
      const type = holding.asset.type;
      return (type === "stock" || type === "etf" || type === "crypto") && holding.value > 0
        ? [{ symbol: holding.asset.symbol, type, weight: holding.value }]
        : [];
    })
    .slice(0, 12);
  const query = useQuery({
    queryKey: [
      "asset-risk-history",
      p.user?.id,
      assets.map((asset) => [asset.symbol, asset.weight]),
    ],
    queryFn: () => run({ data: { assets } }),
    enabled: !!p.user && assets.length >= 2,
    staleTime: 6 * 60 * 60_000,
  });
  const analysis = query.data ? assetRiskAnalysis(query.data) : null;
  return (
    <Card className="lg:col-span-2">
      <h3 className="font-display font-semibold">{copy.title}</h3>
      <p className="mb-3 text-xs text-muted-foreground">{copy.note}</p>
      {query.isError ? (
        <p className="text-sm text-destructive">{copy.error}</p>
      ) : query.isPending ? (
        <p className="text-sm text-muted-foreground">{copy.loading}</p>
      ) : !analysis ? (
        <p className="text-sm text-muted-foreground">{copy.missing}</p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {copy.coverage(analysis.correlations.length)} · {analysis.observations}{" "}
            {copy.observations} · {copy.contribution} (% of portfolio volatility)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr>
                  <th className="text-left font-medium">Asset</th>
                  {analysis.correlations.map((item) => (
                    <th key={item.symbol} className="px-2 text-right font-medium">
                      {item.symbol}
                    </th>
                  ))}
                  <th className="px-2 text-right font-medium">Risk</th>
                </tr>
              </thead>
              <tbody>
                {analysis.correlations.map((row) => {
                  const contribution =
                    analysis.contributions.find((item) => item.symbol === row.symbol)?.share ?? 0;
                  return (
                    <tr key={row.symbol} className="border-t border-border">
                      <th className="py-2 text-left font-medium">{row.symbol}</th>
                      {row.values.map((cell) => (
                        <td key={cell.symbol} className="px-2 text-right tabular-nums">
                          {cell.value.toFixed(2)}
                        </td>
                      ))}
                      <td className="px-2 text-right tabular-nums">
                        {(contribution * 100).toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
