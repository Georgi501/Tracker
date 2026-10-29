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
import { languageLocale, type Lang } from "@/lib/i18n";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare stocks & ETFs head-to-head — Capispot" },
      {
        name: "description",
        content:
          "Put two stocks or ETFs side by side: valuation, P/E, dividends, beta and 52-week range from real market data.",
      },
      { property: "og:title", content: "Head-to-head asset comparison — Capispot" },
      {
        property: "og:description",
        content: "Compare two companies or ETFs side by side with real market data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
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
      const r = await search({ data: { query: t } });
      const list = r.assets;
      const exact = list.find((x) => x.symbol.toUpperCase() === t.toUpperCase());
      const resolved = exact?.symbol ?? list[0]?.symbol;
      if (resolved) return resolved;
      if (SYM.test(t)) return t.toUpperCase();
      if (r.unavailable) throw new Error("Market search is unavailable");
      return null;
    },
  });
}

function useAsset(symbol: string | null | undefined) {
  const stats = useServerFn(marketStats);
  const dcf = useServerFn(marketDcf);
  return useQuery({
    queryKey: ["compare", symbol],
    enabled: !!symbol,
    staleTime: 300_000,
    queryFn: async () => {
      const [s, d] = await Promise.all([
        stats({ data: { symbol: symbol! } }),
        dcf({ data: { symbol: symbol! } }).catch(() => null),
      ]);
      let fair: number | null = null;
      if (
        d &&
        d.fcf &&
        d.shares &&
        d.price &&
        d.fcf > 0 &&
        (!d.finCurrency || d.finCurrency === d.currency)
      ) {
        const g = d.revenueGrowth ?? d.earningsGrowth;
        if (g != null)
          fair = dcfValue({
            fcf: d.fcf,
            ...scenario("base", g),
            cash: d.cash ?? 0,
            debt: d.debt ?? 0,
            shares: d.shares,
          });
      }
      return { s, d, fair };
    },
  });
}

function Compare() {
  const p = usePortfolio();
  const c = COPY[p.lang];
  const [a, setA] = useState("AAPL");
  const [b, setB] = useState("MSFT");
  const ra = useResolved(a);
  const rb = useResolved(b);
  const qa = useAsset(ra.data);
  const qb = useAsset(rb.data);
  const loc = languageLocale(p.lang);
  const num = (v: number | null | undefined, d = 2) =>
    v == null
      ? "—"
      : new Intl.NumberFormat(loc, { maximumFractionDigits: d, minimumFractionDigits: d }).format(
          v,
        );
  const cap = (v: number | null | undefined) =>
    v == null
      ? "—"
      : new Intl.NumberFormat(loc, { notation: "compact", maximumFractionDigits: 2 }).format(v);
  const pct = (v: number | null | undefined) => (v == null ? "—" : `${num(v * 100, 1)}%`);
  type R = typeof qa.data;
  const rows: [string, (x: R) => string, ((x: R) => number | null)?, boolean?][] = [
    [c.price, (x) => `${num(x?.d?.price ?? x?.s?.previousClose)} ${x?.s?.currency ?? ""}`],
    [c.fairValue, (x) => num(x?.fair)],
    [
      c.upside,
      (x) => (x?.fair && x?.d?.price ? pct(valuationGap(x.fair, x.d.price)) : "—"),
      (x) => (x?.fair && x?.d?.price ? valuationGap(x.fair, x.d.price) : null),
      true,
    ],
    [c.marketCap, (x) => cap(x?.s?.marketCap)],
    ["P/E (TTM)", (x) => num(x?.s?.pe), (x) => x?.s?.pe ?? null, false],
    ["EPS (TTM)", (x) => num(x?.s?.eps)],
    [
      c.dividendYield,
      (x) => (x?.s?.dividendYield == null ? "—" : `${num(x.s.dividendYield)}%`),
      (x) => x?.s?.dividendYield ?? null,
      true,
    ],
    [c.revenueGrowth, (x) => pct(x?.d?.revenueGrowth), (x) => x?.d?.revenueGrowth ?? null, true],
    [c.beta, (x) => num(x?.s?.beta), (x) => x?.s?.beta ?? null, false],
    [c.range52, (x) => (x?.s?.low52 == null ? "—" : `${num(x.s.low52)} – ${num(x.s.high52)}`)],
    [c.analystTarget, (x) => num(x?.s?.target)],
  ];
  const win = (
    get: ((x: R) => number | null) | undefined,
    higher: boolean | undefined,
    side: 0 | 1,
  ) => {
    if (!get) return false;
    const va = get(qa.data),
      vb = get(qb.data);
    if (va == null || vb == null || va === vb) return false;
    const aWins = higher ? va > vb : va < vb;
    return side === 0 ? aWins : !aWins;
  };
  const head = (sym: string | null | undefined, name?: string) => (
    <div className="flex items-center gap-2">
      {sym && <CompanyLogo symbol={sym} size={32} />}
      <div className="min-w-0">
        <div className="font-semibold">{sym ?? "—"}</div>
        <div className="truncate text-xs text-muted-foreground">{name ?? ""}</div>
      </div>
    </div>
  );
  return (
    <div className="page-enter space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">{c.title}</h1>
        <p className="text-sm text-muted-foreground">{c.subtitle}</p>
      </div>
      <ProGate
        title={c.gateTitle}
        desc={c.gateDescription}
        preview={
          <div className="flex min-h-80 items-center">
            <BarsSilhouette />
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Input
            aria-label={c.assetA}
            value={a}
            onChange={(e) => setA(e.target.value)}
            placeholder={c.placeholderA}
          />
          <Input
            aria-label={c.assetB}
            value={b}
            onChange={(e) => setB(e.target.value)}
            placeholder={c.placeholderB}
          />
        </div>
        {[ra, rb].map((query, side) =>
          query.isError ? (
            <div key={side} role="alert" className="mt-2 text-sm text-destructive">
              {c.searchError}{" "}
              <button
                type="button"
                onClick={() => void query.refetch()}
                className="font-semibold underline"
              >
                {c.retry}
              </button>
            </div>
          ) : query.isSuccess && query.data === null ? (
            <p key={side} role="status" className="mt-2 text-sm text-muted-foreground">
              {c.notFound}
            </p>
          ) : null,
        )}
        {([qa, qb] as const).map((query, side) =>
          query.isSuccess && query.data.s == null && (side ? rb.data : ra.data) ? (
            <p key={side} role="status" className="mt-2 text-sm text-muted-foreground">
              {c.statsUnavailable}{" "}
              <button
                type="button"
                onClick={() => void query.refetch()}
                className="font-semibold underline"
              >
                {c.retry}
              </button>
            </p>
          ) : null,
        )}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="w-2/5" />
                <th className="p-2 text-left">{head(ra.data, qa.data?.d?.name)}</th>
                <th className="p-2 text-left">{head(rb.data, qb.data?.d?.name)}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, fmt, get, higher]) => (
                <tr key={label} className="border-t border-border">
                  <td className="p-2 text-muted-foreground">{label}</td>
                  {([0, 1] as const).map((side) => (
                    <td
                      key={side}
                      className={`p-2 font-semibold tabular-nums ${win(get, higher, side) ? "text-success" : ""}`}
                    >
                      {(side ? qb : qa).isLoading
                        ? "…"
                        : (side ? qb : qa).isError
                          ? c.loadError
                          : fmt(side ? qb.data : qa.data)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(qa.isError || qb.isError) && (
          <div role="alert" className="mt-2 text-sm text-destructive">
            {c.loadError}{" "}
            <button
              type="button"
              onClick={() => void Promise.all([qa.refetch(), qb.refetch()])}
              className="font-semibold underline"
            >
              {c.retry}
            </button>
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">{c.footnote}</p>
      </ProGate>
    </div>
  );
}

const COPY: Record<
  Lang,
  {
    title: string;
    subtitle: string;
    gateTitle: string;
    gateDescription: string;
    assetA: string;
    assetB: string;
    placeholderA: string;
    placeholderB: string;
    price: string;
    fairValue: string;
    upside: string;
    marketCap: string;
    dividendYield: string;
    revenueGrowth: string;
    beta: string;
    range52: string;
    analystTarget: string;
    searchError: string;
    notFound: string;
    statsUnavailable: string;
    loadError: string;
    retry: string;
    footnote: string;
  }
> = {
  en: {
    title: "Head-to-head comparison",
    subtitle: "Enter a ticker or name for two companies or ETFs.",
    gateTitle: "Compare assets",
    gateDescription:
      "Compare market cap, P/E, EPS, dividend yield, revenue growth, beta, 52-week range and analyst targets. DCF fair value and upside appear when supported by available real market data.",
    assetA: "Asset A",
    assetB: "Asset B",
    placeholderA: "Apple / AAPL",
    placeholderB: "Microsoft / MSFT",
    price: "Price",
    fairValue: "Fair value (DCF, base)",
    upside: "Upside to fair value",
    marketCap: "Market cap",
    dividendYield: "Dividend yield",
    revenueGrowth: "Revenue growth",
    beta: "Beta (risk)",
    range52: "52-week range",
    analystTarget: "Analyst target",
    searchError: "Unable to search the market.",
    notFound: "No matching asset found.",
    statsUnavailable: "Statistics are unavailable for this asset.",
    loadError: "Some market data could not be loaded.",
    retry: "Try again",
    footnote:
      "Data from Yahoo Finance; “—” means the figure is unavailable. DCF is a simplified model (9% discount, 2.5% terminal growth) — not investment advice.",
  },
  bg: {
    title: "Сравнение активи",
    subtitle: "Въведи тикер или име на две компании или ETF-а.",
    gateTitle: "Сравни активи",
    gateDescription:
      "Сравни пазарна капитализация, P/E, EPS, дивидентна доходност, ръст на приходите, бета, 52-седмичен диапазон и цели на анализаторите. DCF оценка и потенциален ръст се показват при налични реални пазарни данни.",
    assetA: "Актив A",
    assetB: "Актив B",
    placeholderA: "Apple / AAPL",
    placeholderB: "Microsoft / MSFT",
    price: "Цена",
    fairValue: "Справедлива цена (DCF, базов)",
    upside: "Потенциал до справедливата цена",
    marketCap: "Пазарна капитализация",
    dividendYield: "Дивидентна доходност",
    revenueGrowth: "Ръст на приходите",
    beta: "Бета (риск)",
    range52: "52-седмичен диапазон",
    analystTarget: "Целева цена на анализаторите",
    searchError: "Търсенето на пазара не е достъпно.",
    notFound: "Няма намерен съвпадащ актив.",
    statsUnavailable: "Няма налични показатели за този актив.",
    loadError: "Част от пазарните данни не можаха да се заредят.",
    retry: "Опитай отново",
    footnote:
      "Данни от Yahoo Finance; „—“ означава, че показателят липсва. DCF е опростен модел (9% дисконтов процент, 2,5% терминален ръст) — не е инвестиционен съвет.",
  },
  de: {
    title: "Direkter Vergleich",
    subtitle: "Gib ein Symbol oder einen Namen für zwei Unternehmen oder ETFs ein.",
    gateTitle: "Werte vergleichen",
    gateDescription:
      "Vergleiche Marktkapitalisierung, KGV, EPS, Dividendenrendite, Umsatzwachstum, Beta, 52-Wochen-Spanne und Analystenziele. DCF-Fair-Value und Aufwärtspotenzial erscheinen nur bei verfügbaren realen Marktdaten.",
    assetA: "Wert A",
    assetB: "Wert B",
    placeholderA: "Apple / AAPL",
    placeholderB: "Microsoft / MSFT",
    price: "Kurs",
    fairValue: "Fairer Wert (DCF, Basis)",
    upside: "Potenzial zum fairen Wert",
    marketCap: "Marktkapitalisierung",
    dividendYield: "Dividendenrendite",
    revenueGrowth: "Umsatzwachstum",
    beta: "Beta (Risiko)",
    range52: "52-Wochen-Spanne",
    analystTarget: "Analystenziel",
    searchError: "Die Marktsuche ist nicht verfügbar.",
    notFound: "Kein passender Wert gefunden.",
    statsUnavailable: "Für diesen Wert sind keine Kennzahlen verfügbar.",
    loadError: "Einige Marktdaten konnten nicht geladen werden.",
    retry: "Erneut versuchen",
    footnote:
      "Daten von Yahoo Finance; „—“ bedeutet, dass der Wert nicht verfügbar ist. DCF ist ein vereinfachtes Modell (9 % Diskontsatz, 2,5 % Terminalwachstum) — keine Anlageberatung.",
  },
  es: {
    title: "Comparación directa",
    subtitle: "Introduce el ticker o nombre de dos empresas o ETF.",
    gateTitle: "Comparar activos",
    gateDescription:
      "Compara capitalización, PER, BPA, rentabilidad por dividendo, crecimiento de ingresos, beta, rango de 52 semanas y objetivos de analistas. El valor razonable DCF y su potencial solo aparecen cuando hay datos reales disponibles.",
    assetA: "Activo A",
    assetB: "Activo B",
    placeholderA: "Apple / AAPL",
    placeholderB: "Microsoft / MSFT",
    price: "Precio",
    fairValue: "Valor razonable (DCF, base)",
    upside: "Potencial hasta el valor razonable",
    marketCap: "Capitalización bursátil",
    dividendYield: "Rentabilidad por dividendo",
    revenueGrowth: "Crecimiento de ingresos",
    beta: "Beta (riesgo)",
    range52: "Rango de 52 semanas",
    analystTarget: "Objetivo de analistas",
    searchError: "La búsqueda de mercado no está disponible.",
    notFound: "No se encontró ningún activo coincidente.",
    statsUnavailable: "No hay estadísticas disponibles para este activo.",
    loadError: "No se pudieron cargar algunos datos de mercado.",
    retry: "Reintentar",
    footnote:
      "Datos de Yahoo Finance; «—» significa que el dato no está disponible. El DCF es un modelo simplificado (9 % de descuento, 2,5 % de crecimiento terminal), no asesoramiento financiero.",
  },
  it: {
    title: "Confronto diretto",
    subtitle: "Inserisci il ticker o il nome di due società o ETF.",
    gateTitle: "Confronta asset",
    gateDescription:
      "Confronta capitalizzazione, P/E, EPS, rendimento da dividendo, crescita dei ricavi, beta, intervallo a 52 settimane e obiettivi degli analisti. Il fair value DCF e il potenziale sono mostrati solo con dati di mercato reali disponibili.",
    assetA: "Asset A",
    assetB: "Asset B",
    placeholderA: "Apple / AAPL",
    placeholderB: "Microsoft / MSFT",
    price: "Prezzo",
    fairValue: "Fair value (DCF, base)",
    upside: "Potenziale rispetto al fair value",
    marketCap: "Capitalizzazione",
    dividendYield: "Rendimento da dividendo",
    revenueGrowth: "Crescita dei ricavi",
    beta: "Beta (rischio)",
    range52: "Intervallo a 52 settimane",
    analystTarget: "Obiettivo degli analisti",
    searchError: "La ricerca di mercato non è disponibile.",
    notFound: "Nessun asset corrispondente trovato.",
    statsUnavailable: "Statistiche non disponibili per questo asset.",
    loadError: "Impossibile caricare alcuni dati di mercato.",
    retry: "Riprova",
    footnote:
      "Dati di Yahoo Finance; “—” indica un dato non disponibile. Il DCF è un modello semplificato (sconto 9%, crescita terminale 2,5%), non è consulenza finanziaria.",
  },
};
