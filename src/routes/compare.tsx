import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/AppShell";
import { ProGate, BarsSilhouette } from "@/components/ProFeatures";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Input } from "@/components/ui/input";
import { marketStats, marketDcf, searchMarket } from "@/lib/market.functions";
import { dcfAnalysis, hasUsableDcfFundamentals, potentialUpside, scenario } from "@/lib/dcf";
import { usePortfolio } from "@/lib/store";
import { languageLocale, type Lang } from "@/lib/i18n";
import { isUsableQuote } from "@/lib/portfolio";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare stocks & ETFs head-to-head — Capispot" },
      {
        name: "description",
        content:
          "Put two stocks or ETFs side by side: valuation, P/E, dividends, beta and 52-week range from real market data, with no estimates for missing figures.",
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
      const [s, dcfResult] = await Promise.all([
        stats({ data: { symbol: symbol! } }),
        dcf({ data: { symbol: symbol! } })
          .then((data) => ({ data, failed: false }))
          .catch(() => ({ data: null, failed: true })),
      ]);
      const d = dcfResult.data;
      const assumptions = d ? scenario("base", d.revenueGrowth ?? 0.05) : null;
      const analysis =
        d && assumptions && hasUsableDcfFundamentals(d)
          ? dcfAnalysis({
              fcf: d.fcf,
              cash: d.cash,
              debt: d.debt,
              shares: d.shares,
              ...assumptions,
            })
          : null;
      const fair = analysis?.valuePerShare ?? null;
      const upside =
        fair != null && d && isUsableQuote(d.price, d.priceAsOf)
          ? potentialUpside(fair, d.price)
          : null;
      return { s, d, assumptions, analysis, fair, upside, dcfFailed: dcfResult.failed };
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
  const marketPrice = (x: R) => {
    const data = x?.d;
    if (
      !data ||
      data.price == null ||
      !data.currency ||
      !/^[A-Za-z]{3}$/.test(data.currency) ||
      !isUsableQuote(data.price, data.priceAsOf)
    )
      return "—";
    return `${num(data.price)} ${data.currency.toUpperCase()}`;
  };
  const fairValue = (x: R) => {
    const data = x?.d;
    if (x?.fair == null || !data?.currency) return "—";
    const date = data.priceAsOf
      ? new Intl.DateTimeFormat(loc, { dateStyle: "medium", timeZone: "UTC" }).format(
          new Date(data.priceAsOf),
        )
      : "—";
    return `${num(x.fair)} ${data.currency.toUpperCase()} · ${date}`;
  };
  const rows: [string, (x: R) => string, ((x: R) => number | null)?, boolean?][] = [
    [c.price, marketPrice],
    [c.fairValue, fairValue],
    [c.upside, (x) => pct(x?.upside), (x) => x?.upside ?? null, true],
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
  const dcfDetails = (x: R) => {
    const data = x?.d;
    const assumptions = x?.assumptions;
    const analysis = x?.analysis;
    const detailsCopy = DCF_DETAILS_COPY[p.lang === "bg" ? "bg" : "en"];
    const date = (value: string | null | undefined) =>
      value
        ? new Intl.DateTimeFormat(loc, { dateStyle: "medium", timeZone: "UTC" }).format(
            new Date(value),
          )
        : "—";
    const amount = (value: number | null | undefined, currency = data?.finCurrency) =>
      value == null
        ? "—"
        : `${new Intl.NumberFormat(loc, { maximumFractionDigits: 2 }).format(value)} ${currency ?? ""}`.trim();
    return (
      <details className="rounded-xl border border-border">
        <summary className="cursor-pointer px-3 py-3 text-sm font-semibold">
          {detailsCopy.title}
          {data?.symbol ? ` · ${data.symbol}` : ""}
        </summary>
        <div className="border-t border-border px-3 py-3 text-sm">
          <p className="mb-3 text-xs text-muted-foreground">{detailsCopy.method}</p>
          <dl className="grid gap-x-4 sm:grid-cols-2">
            <DcfDetail label={detailsCopy.price} value={amount(data?.price, data?.currency)} />
            <DcfDetail label={detailsCopy.priceDate} value={date(data?.priceAsOf)} />
            <DcfDetail label={detailsCopy.dataDate} value={date(data?.fetchedAt)} />
            <DcfDetail label={detailsCopy.fcf} value={amount(data?.fcf)} />
            <DcfDetail label={detailsCopy.cash} value={amount(data?.cash)} />
            <DcfDetail label={detailsCopy.debt} value={amount(data?.debt)} />
            <DcfDetail label={detailsCopy.shares} value={amount(data?.shares, "shares")} />
            <DcfDetail label={detailsCopy.financialCurrency} value={data?.finCurrency ?? "—"} />
            <DcfDetail
              label={detailsCopy.growth}
              value={assumptions ? pct(assumptions.growth) : "—"}
            />
            <DcfDetail
              label={detailsCopy.discount}
              value={assumptions ? pct(assumptions.discount) : "—"}
            />
            <DcfDetail
              label={detailsCopy.terminal}
              value={assumptions ? pct(assumptions.terminal) : "—"}
            />
            <DcfDetail
              label={detailsCopy.projectedCashFlows}
              value={amount(analysis?.presentValueOfCashFlows)}
            />
            <DcfDetail
              label={detailsCopy.terminalValue}
              value={amount(analysis?.presentValueOfTerminalValue)}
            />
            <DcfDetail
              label={detailsCopy.result}
              value={amount(analysis?.valuePerShare, data?.currency)}
            />
          </dl>
          {!analysis && <p className="mt-2 text-xs text-muted-foreground">{detailsCopy.missing}</p>}
        </div>
      </details>
    );
  };
  return (
    <div className="page-enter space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">{c.title}</h1>
        <p className="text-sm text-muted-foreground">{c.subtitle}</p>
        {!p.user && <p className="mt-2 text-sm text-muted-foreground">{c.guestNote}</p>}
      </div>
      <ProGate
        title={c.gateTitle}
        desc={c.gateDescription}
        unlocked={!p.user}
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
        {([qa, qb] as const).map((query, side) =>
          query.isSuccess && query.data.dcfFailed ? (
            <p key={`dcf-${side}`} role="status" className="mt-2 text-sm text-muted-foreground">
              {c.dcfLoadError}{" "}
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
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-2/5 bg-card" />
                <th className="p-2 text-left">{head(ra.data, qa.data?.d?.name)}</th>
                <th className="p-2 text-left">{head(rb.data, qb.data?.d?.name)}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, fmt, get, higher]) => (
                <tr key={label} className="border-t border-border">
                  <td className="sticky left-0 z-10 bg-card p-2 text-muted-foreground">{label}</td>
                  {([0, 1] as const).map((side) => (
                    <td
                      key={side}
                      className={`p-2 font-semibold tabular-nums ${win(get, higher, side) ? "text-success" : ""}`}
                    >
                      <span className="mb-1 block text-[10px] font-medium text-muted-foreground sm:hidden">
                        {(side ? rb.data : ra.data) ?? (side ? b : a).toUpperCase()}
                      </span>
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
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {dcfDetails(qa.data)}
          {dcfDetails(qb.data)}
        </div>
      </ProGate>
    </div>
  );
}

const COPY: Record<
  Lang,
  {
    title: string;
    subtitle: string;
    guestNote: string;
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
    dcfLoadError: string;
    loadError: string;
    retry: string;
    footnote: string;
  }
> = {
  en: {
    title: "Head-to-head comparison",
    subtitle: "Enter a ticker or name for two companies or ETFs.",
    guestNote: "The AAPL and MSFT example uses current provider data, not preset sample prices.",
    gateTitle: "Compare assets",
    gateDescription:
      "Compare market cap, P/E, EPS, dividend yield, revenue growth, beta, 52-week range and analyst targets. Simplified DCF estimates are shown for supported stocks when fundamentals are complete.",
    assetA: "Asset A",
    assetB: "Asset B",
    placeholderA: "Apple / AAPL",
    placeholderB: "Microsoft / MSFT",
    price: "Price",
    fairValue: "DCF estimate (base)",
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
    dcfLoadError: "DCF financial data could not be loaded.",
    loadError: "Some market data could not be loaded.",
    retry: "Try again",
    footnote:
      "Data from Yahoo Finance; “—” means unavailable or not comparable. DCF uses a simplified five-year model; upside is shown only with a fresh quote and matching currencies. Not investment advice.",
  },
  bg: {
    title: "Сравнение активи",
    subtitle: "Въведи тикер или име на две компании или ETF-а.",
    guestNote:
      "Примерът с AAPL и MSFT използва актуални данни от доставчика, а не зададени примерни цени.",
    gateTitle: "Сравни активи",
    gateDescription:
      "Сравни пазарна капитализация, P/E, EPS, дивидентна доходност, ръст на приходите, бета, 52-седмичен диапазон и цели на анализаторите. Опростена DCF оценка се показва за поддържани акции при пълни финансови данни.",
    assetA: "Актив A",
    assetB: "Актив B",
    placeholderA: "Apple / AAPL",
    placeholderB: "Microsoft / MSFT",
    price: "Цена",
    fairValue: "DCF оценка (базова)",
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
    dcfLoadError: "DCF финансовите данни не можаха да се заредят.",
    loadError: "Част от пазарните данни не можаха да се заредят.",
    retry: "Опитай отново",
    footnote:
      "Данни от Yahoo Finance; „—“ означава липсваща или несъпоставима стойност. DCF използва опростен петгодишен модел; потенциалът се показва само при актуална котировка и еднакви валути. Не е инвестиционен съвет.",
  },
  de: {
    title: "Direkter Vergleich",
    subtitle: "Gib ein Symbol oder einen Namen für zwei Unternehmen oder ETFs ein.",
    guestNote:
      "Der AAPL- und MSFT-Vergleich nutzt aktuelle Anbieterdaten statt festgelegter Beispielkurse.",
    gateTitle: "Werte vergleichen",
    gateDescription:
      "Vergleiche Marktkapitalisierung, KGV, EPS, Dividendenrendite, Umsatzwachstum, Beta, 52-Wochen-Spanne und Analystenziele. Vereinfachte DCF-Schätzungen erscheinen für unterstützte Aktien bei vollständigen Fundamentaldaten.",
    assetA: "Wert A",
    assetB: "Wert B",
    placeholderA: "Apple / AAPL",
    placeholderB: "Microsoft / MSFT",
    price: "Kurs",
    fairValue: "DCF-Schätzung (Basis)",
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
    dcfLoadError: "DCF-Finanzdaten konnten nicht geladen werden.",
    loadError: "Einige Marktdaten konnten nicht geladen werden.",
    retry: "Erneut versuchen",
    footnote:
      "Daten von Yahoo Finance; „—“ bedeutet nicht verfügbar oder nicht vergleichbar. DCF nutzt ein vereinfachtes Fünfjahresmodell; Potenzial wird nur bei aktuellem Kurs und übereinstimmenden Währungen angezeigt. Keine Anlageberatung.",
  },
  es: {
    title: "Comparación directa",
    subtitle: "Introduce el ticker o nombre de dos empresas o ETF.",
    guestNote:
      "El ejemplo de AAPL y MSFT utiliza datos actuales del proveedor, no precios inventados.",
    gateTitle: "Comparar activos",
    gateDescription:
      "Compara capitalización, PER, BPA, rentabilidad por dividendo, crecimiento de ingresos, beta, rango de 52 semanas y objetivos de analistas. Las estimaciones DCF simplificadas aparecen para acciones compatibles cuando los datos fundamentales están completos.",
    assetA: "Activo A",
    assetB: "Activo B",
    placeholderA: "Apple / AAPL",
    placeholderB: "Microsoft / MSFT",
    price: "Precio",
    fairValue: "Estimación DCF (base)",
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
    dcfLoadError: "No se pudieron cargar los datos financieros DCF.",
    loadError: "No se pudieron cargar algunos datos de mercado.",
    retry: "Reintentar",
    footnote:
      "Datos de Yahoo Finance; «—» significa que no está disponible o no es comparable. El DCF usa un modelo simplificado de cinco años; el potencial solo aparece con una cotización reciente y divisas coincidentes. No es asesoramiento financiero.",
  },
  it: {
    title: "Confronto diretto",
    subtitle: "Inserisci il ticker o il nome di due società o ETF.",
    guestNote: "L'esempio AAPL e MSFT usa dati aggiornati del provider, non prezzi preimpostati.",
    gateTitle: "Confronta asset",
    gateDescription:
      "Confronta capitalizzazione, P/E, EPS, rendimento da dividendo, crescita dei ricavi, beta, intervallo a 52 settimane e obiettivi degli analisti. Le stime DCF semplificate sono mostrate per azioni supportate con dati fondamentali completi.",
    assetA: "Asset A",
    assetB: "Asset B",
    placeholderA: "Apple / AAPL",
    placeholderB: "Microsoft / MSFT",
    price: "Prezzo",
    fairValue: "Stima DCF (base)",
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
    dcfLoadError: "Impossibile caricare i dati finanziari DCF.",
    loadError: "Impossibile caricare alcuni dati di mercato.",
    retry: "Riprova",
    footnote:
      "Dati di Yahoo Finance; “—” indica un dato non disponibile o non confrontabile. Il DCF usa un modello semplificato a cinque anni; il potenziale appare solo con quotazione recente e valute coincidenti. Non è consulenza finanziaria.",
  },
};

function DcfDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 justify-between gap-3 border-b border-border/60 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{value}</dd>
    </div>
  );
}

const DCF_DETAILS_COPY = {
  en: {
    title: "How is it calculated?",
    method:
      "Simplified two-stage DCF: five annual cash-flow projections, discounted at 9%, plus a 2.5% perpetual growth value; cash is added and debt deducted, then divided by shares outstanding.",
    price: "Market price",
    priceDate: "Quote date",
    dataDate: "Inputs retrieved",
    fcf: "Provider free cash flow",
    cash: "Cash",
    debt: "Total debt",
    shares: "Shares outstanding",
    financialCurrency: "Financial statement currency",
    growth: "Annual growth assumption",
    discount: "Discount rate",
    terminal: "Perpetual growth rate",
    projectedCashFlows: "Present value of projected cash flows",
    terminalValue: "Present value of terminal value",
    result: "Estimated value per share",
    missing: "A usable estimate requires complete inputs in a currency matching the quote.",
  },
  bg: {
    title: "Как е сметнато?",
    method:
      "Опростен двуетапен DCF: пет годишни прогнози на паричния поток, дисконтирани с 9%, плюс терминална стойност при постоянен ръст 2,5%; паричните средства се добавят, дългът се изважда, а резултатът се дели на броя акции.",
    price: "Пазарна цена",
    priceDate: "Дата на котировката",
    dataDate: "Дата на получаване на данните",
    fcf: "Свободен паричен поток",
    cash: "Парични средства",
    debt: "Общ дълг",
    shares: "Брой акции",
    financialCurrency: "Валута на финансовия отчет",
    growth: "Приет годишен ръст",
    discount: "Дисконтов процент",
    terminal: "Постоянен ръст",
    projectedCashFlows: "Настояща стойност на прогнозните потоци",
    terminalValue: "Настояща стойност на терминалната стойност",
    result: "Оценка на акция",
    missing: "Оценка се изчислява само при пълни данни във валута, съвпадаща с котировката.",
  },
} as const;
