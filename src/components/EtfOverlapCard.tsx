import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/AppShell";
import { usePortfolio } from "@/lib/store";
import { marketEtfHoldings } from "@/lib/market.functions";
import { calculateEtfOverlap } from "@/lib/etf-overlap";

const COPY = {
  en: {
    title: "ETF overlap",
    description:
      "Estimated portfolio exposure to the ETFs' provider-reported top holdings, including directly held stocks.",
    unavailable: "Provider holdings are unavailable for these ETFs.",
    partial:
      "Only reported top holdings are included; this is not a full look-through of each ETF.",
    loading: "Loading provider holdings…",
    weight: "Portfolio exposure",
    noEtfs: "No ETF positions to analyze.",
    retrieved: "Provider data retrieved",
    unavailableFunds: (symbols: string) => `Composition unavailable: ${symbols}`,
  },
  bg: {
    title: "Припокриване на ETF-и",
    description:
      "Приблизителна експозиция към водещите позиции на ETF-ите според доставчика, включително притежаваните директно акции.",
    unavailable: "Няма данни за състава на тези ETF-и от доставчика.",
    partial: "Включени са само публикуваните водещи позиции; това не е пълен анализ на фонда.",
    loading: "Зареждане на състава от доставчика…",
    weight: "Експозиция в портфейла",
    noEtfs: "Няма ETF позиции за анализ.",
    retrieved: "Данните от доставчика са получени",
    unavailableFunds: (symbols: string) => `Липсва състав: ${symbols}`,
  },
  de: {
    title: "ETF-Überschneidungen",
    description:
      "Geschätztes Portfolioengagement in den gemeldeten Top-Positionen der ETFs, einschließlich direkt gehaltener Aktien.",
    unavailable: "Für diese ETFs sind keine Anbieterbestände verfügbar.",
    partial:
      "Berücksichtigt werden nur gemeldete Top-Positionen, kein vollständiger ETF-Durchblick.",
    loading: "Anbieterbestände werden geladen…",
    weight: "Portfolioengagement",
    noEtfs: "Keine ETF-Positionen zur Analyse.",
    retrieved: "Anbieterdaten abgerufen",
    unavailableFunds: (symbols: string) => `Zusammensetzung nicht verfügbar: ${symbols}`,
  },
  es: {
    title: "Solapamiento de ETF",
    description:
      "Exposición estimada a las principales posiciones publicadas por el proveedor, incluidas las acciones directas.",
    unavailable: "El proveedor no ofrece posiciones para estos ETF.",
    partial: "Solo se incluyen las principales posiciones publicadas; no es un desglose completo.",
    loading: "Cargando posiciones del proveedor…",
    weight: "Exposición de cartera",
    noEtfs: "No hay posiciones de ETF para analizar.",
    retrieved: "Datos del proveedor obtenidos",
    unavailableFunds: (symbols: string) => `Composición no disponible: ${symbols}`,
  },
  it: {
    title: "Sovrapposizione ETF",
    description:
      "Esposizione stimata alle principali partecipazioni ETF comunicate dal provider, incluse le azioni detenute direttamente.",
    unavailable: "Le partecipazioni del provider non sono disponibili per questi ETF.",
    partial:
      "Sono incluse solo le principali partecipazioni comunicate; non è un’analisi completa.",
    loading: "Caricamento delle partecipazioni…",
    weight: "Esposizione del portafoglio",
    noEtfs: "Nessuna posizione ETF da analizzare.",
    retrieved: "Dati del provider ricevuti",
    unavailableFunds: (symbols: string) => `Composizione non disponibile: ${symbols}`,
  },
} as const;

export function EtfOverlapCard() {
  const p = usePortfolio();
  const copy = COPY[p.lang];
  const queryFn = useServerFn(marketEtfHoldings);
  const funds = p.holdings.filter(
    (holding) =>
      holding.asset.type === "etf" && Number.isFinite(holding.value) && holding.value > 0,
  );
  const symbols = funds.map((holding) => holding.asset.symbol);
  const requestedSymbols = symbols.slice(0, 10);
  const query = useQuery({
    queryKey: ["etf-holdings", requestedSymbols],
    queryFn: () => queryFn({ data: { symbols: requestedSymbols } }),
    enabled: requestedSymbols.length > 0,
    staleTime: 6 * 60 * 60 * 1000,
  });
  const results = calculateEtfOverlap(p.holdings, query.data?.funds ?? []);
  const available = new Set((query.data?.funds ?? []).map((fund) => fund.symbol));
  const missing = symbols.filter((symbol) => !available.has(symbol));

  return (
    <Card className="lg:col-span-3">
      <h3 className="font-display font-semibold">{copy.title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{copy.description}</p>
      {!funds.length ? (
        <p className="mt-4 text-sm text-muted-foreground">{copy.noEtfs}</p>
      ) : query.isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">{copy.loading}</p>
      ) : results.length ? (
        <ul className="mt-3 divide-y divide-border/60">
          {results.slice(0, 10).map((item) => (
            <li key={item.symbol} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0">
                <span className="font-semibold">{item.symbol}</span>
                <span className="ml-2 truncate text-muted-foreground">{item.name}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {item.sources.join(", ")}
                </span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums">
                <span className="sr-only">{copy.weight}: </span>
                {(item.weight * 100).toFixed(2)}%
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">{copy.unavailable}</p>
      )}
      {missing.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {copy.unavailableFunds(missing.join(", "))}
        </p>
      )}
      {query.data?.fetchedAt && (
        <p className="mt-2 text-xs text-muted-foreground">
          {copy.retrieved}: {new Date(query.data.fetchedAt).toLocaleString()}
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">{copy.partial}</p>
    </Card>
  );
}
