import { Card } from "@/components/AppShell";
import { CompanyOverview } from "@/components/CompanyOverview";
import { CompanyProfileDetails } from "@/components/CompanyProfileDetails";
import { QuoteHero } from "@/components/QuoteHero";
import { Button } from "@/components/ui/button";
import { InvestmentJournal } from "@/components/InvestmentJournal";
import { resolveEtfExposureProfile } from "@/lib/etf-overlap";
import { languageLocale, type Lang } from "@/lib/i18n";
import { assetSummary } from "@/lib/journey";
import { searchCatalog } from "@/lib/market-search";
import { searchMarket } from "@/lib/market.functions";
import { projectedBondCoupon } from "@/lib/portfolio";
import { pct, usePortfolio } from "@/lib/store";
import { useSectionAnchor } from "@/lib/use-section-anchor";
import { readBondCouponDates, writeBondCouponDate } from "@/lib/watchlist";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  ChartNoAxesCombined,
  CircleDollarSign,
  Layers,
  Newspaper,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/asset/$symbol")({
  validateSearch: (search) =>
    z
      .object({
        from: z.literal("markets").optional().catch(undefined),
        q: z.string().max(60).optional().catch(undefined),
      })
      .parse(search),
  head: ({ params }) => {
    const symbol = params.symbol.toUpperCase();
    const catalogMatch = searchCatalog(symbol).find((item) => item.symbol.toUpperCase() === symbol);
    const ogParams = new URLSearchParams({ type: "asset", symbol });
    if (catalogMatch?.name) ogParams.set("name", catalogMatch.name);
    if (catalogMatch?.type) {
      ogParams.set(
        "sector",
        catalogMatch.type === "etf" ? "ETF" : catalogMatch.type === "crypto" ? "Crypto" : "Stock",
      );
    }
    const ogImage = `https://capispot.com/api/og?${ogParams.toString()}`;
    return {
      meta: [
        { title: `${params.symbol} — quote, charts and position details | CapiSpot` },
        {
          name: "description",
          content: `Your ${params.symbol} position: P&L, dividends, transaction history, company overview and investing journal.`,
        },
        { property: "og:title", content: `${params.symbol} — CapiSpot` },
        {
          property: "og:description",
          content: "Position details, history, news and your investment thesis in one place.",
        },
        { property: "og:type", content: "website" },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: ogImage },
      ],
    };
  },
  component: AssetPage,
});

const C = {
  en: {
    back: "Holdings",
    backMarkets: "Markets",
    qty: "Quantity",
    avg: "Average cost",
    value: "Value",
    pnl: "Unrealized P&L",
    bought: "Invested",
    sold: "Sold",
    div: "Dividends received",
    since: "Holding since",
    history: "Transactions",
    journal: "Investing journal",
    thesis: "Why I own it",
    horizon: "Horizon",
    review: "Review date",
    save: "Save",
    saved: "Journal saved",
    due: "Review is due — is your thesis still valid?",
    none: "You don't hold this asset.",
    add: "Add it to your portfolio",
    loading: "Loading asset details…",
    unavailable: "Asset details are currently unavailable.",
    notFound: "We couldn't find this asset.",
    signIn: "Sign in to keep a journal.",
    buy: "Buy",
    sell: "Sell",
    dividend: "Dividend",
    noMarketData: "This asset type does not have market quotes or company research.",
    cash: "Cash",
    realEstate: "Real estate",
    valuationTitle: "Dated manual valuations",
    valuationDescription:
      "Record a per-unit value in USD. It is not a market quote; historical charts carry the last mark forward for up to 90 days.",
    valuationDate: "Valuation date",
    valuationPrice: "Value per unit (USD)",
    valuationNote: "Source / note (optional)",
    saveValuation: "Save valuation",
    savingValuation: "Saving…",
    valuationSaved: "Valuation saved",
    valuationHistory: "Recorded valuations",
    noValuations: "No dated valuations recorded.",
  },
  bg: {
    back: "Позиции",
    backMarkets: "Пазари",
    qty: "Количество",
    avg: "Средна цена",
    value: "Стойност",
    pnl: "Нереализирана P&L",
    bought: "Инвестирано",
    sold: "Продадено",
    div: "Получени дивиденти",
    since: "Държиш от",
    history: "Сделки",
    journal: "Инвестиционен дневник",
    thesis: "Защо го притежавам",
    horizon: "Хоризонт",
    review: "Дата за преглед",
    save: "Запази",
    saved: "Дневникът е запазен",
    due: "Време е за преглед — още ли е валидна тезата ти?",
    none: "Не притежаваш този актив.",
    add: "Добави го към портфолиото си",
    loading: "Зареждане на информацията за актива…",
    unavailable: "Информацията за актива временно не е налична.",
    notFound: "Не намерихме този актив.",
    signIn: "Влез, за да водиш дневник.",
    buy: "Покупка",
    sell: "Продажба",
    dividend: "Дивидент",
    noMarketData: "За този тип актив няма пазарни котировки или фирмено проучване.",
    cash: "Парични средства",
    realEstate: "Недвижим имот",
    valuationTitle: "Ръчни оценки по дата",
    valuationDescription:
      "Запиши стойност за единица в USD. Това не е пазарна котировка; в историческата графика последната оценка се пренася до 90 дни.",
    valuationDate: "Дата на оценката",
    valuationPrice: "Стойност за единица (USD)",
    valuationNote: "Източник / бележка (по избор)",
    saveValuation: "Запази оценката",
    savingValuation: "Запазване…",
    valuationSaved: "Оценката е запазена",
    valuationHistory: "Записани оценки",
    noValuations: "Няма записани оценки по дата.",
  },
  de: {
    back: "Positionen",
    backMarkets: "Märkte",
    qty: "Menge",
    avg: "Durchschnittskosten",
    value: "Wert",
    pnl: "Nicht realisierter Gewinn/Verlust",
    bought: "Investiert",
    sold: "Verkauft",
    div: "Erhaltene Dividenden",
    since: "Im Bestand seit",
    history: "Transaktionen",
    journal: "Anlagejournal",
    thesis: "Warum ich den Wert halte",
    horizon: "Anlagehorizont",
    review: "Prüfdatum",
    save: "Speichern",
    saved: "Journal gespeichert",
    due: "Prüfung fällig — ist deine These noch gültig?",
    none: "Du hältst diesen Wert nicht.",
    add: "Zum Portfolio hinzufügen",
    loading: "Wertpapierdaten werden geladen…",
    unavailable: "Wertpapierdaten sind derzeit nicht verfügbar.",
    notFound: "Dieses Wertpapier wurde nicht gefunden.",
    signIn: "Melde dich an, um ein Journal zu führen.",
    buy: "Kauf",
    sell: "Verkauf",
    dividend: "Dividende",
    noMarketData: "Für diesen Anlagetyp sind keine Marktkurse oder Unternehmensanalysen verfügbar.",
    cash: "Bargeld",
    realEstate: "Immobilien",
    valuationTitle: "Manuelle Bewertungen mit Datum",
    valuationDescription:
      "Erfasse einen Wert je Einheit in USD. Dies ist kein Marktkurs; historische Diagramme führen die letzte Bewertung bis zu 90 Tage fort.",
    valuationDate: "Bewertungsdatum",
    valuationPrice: "Wert je Einheit (USD)",
    valuationNote: "Quelle / Notiz (optional)",
    saveValuation: "Bewertung speichern",
    savingValuation: "Wird gespeichert…",
    valuationSaved: "Bewertung gespeichert",
    valuationHistory: "Erfasste Bewertungen",
    noValuations: "Keine datierten Bewertungen erfasst.",
  },
  es: {
    back: "Posiciones",
    backMarkets: "Mercados",
    qty: "Cantidad",
    avg: "Coste medio",
    value: "Valor",
    pnl: "Ganancia/pérdida no realizada",
    bought: "Invertido",
    sold: "Vendido",
    div: "Dividendos recibidos",
    since: "En cartera desde",
    history: "Transacciones",
    journal: "Diario de inversión",
    thesis: "Por qué lo tengo",
    horizon: "Horizonte",
    review: "Fecha de revisión",
    save: "Guardar",
    saved: "Diario guardado",
    due: "Toca revisar: ¿sigue vigente tu tesis?",
    none: "No tienes este activo.",
    add: "Añadir a tu cartera",
    loading: "Cargando los datos del activo…",
    unavailable: "Los datos del activo no están disponibles ahora.",
    notFound: "No encontramos este activo.",
    signIn: "Inicia sesión para llevar un diario.",
    buy: "Compra",
    sell: "Venta",
    dividend: "Dividendo",
    noMarketData: "Este tipo de activo no dispone de cotizaciones ni análisis de empresas.",
    cash: "Efectivo",
    realEstate: "Inmobiliario",
    valuationTitle: "Valoraciones manuales con fecha",
    valuationDescription:
      "Registra un valor por unidad en USD. No es una cotización de mercado; el gráfico histórico mantiene la última valoración hasta 90 días.",
    valuationDate: "Fecha de valoración",
    valuationPrice: "Valor por unidad (USD)",
    valuationNote: "Fuente / nota (opcional)",
    saveValuation: "Guardar valoración",
    savingValuation: "Guardando…",
    valuationSaved: "Valoración guardada",
    valuationHistory: "Valoraciones registradas",
    noValuations: "No hay valoraciones fechadas.",
  },
  it: {
    back: "Posizioni",
    backMarkets: "Mercati",
    qty: "Quantità",
    avg: "Costo medio",
    value: "Valore",
    pnl: "Profitto/perdita non realizzato",
    bought: "Investito",
    sold: "Venduto",
    div: "Dividendi ricevuti",
    since: "In portafoglio dal",
    history: "Transazioni",
    journal: "Diario degli investimenti",
    thesis: "Perché lo possiedo",
    horizon: "Orizzonte",
    review: "Data di revisione",
    save: "Salva",
    saved: "Diario salvato",
    due: "È il momento di rivedere: la tua tesi è ancora valida?",
    none: "Non possiedi questo asset.",
    add: "Aggiungi al portafoglio",
    loading: "Caricamento dei dati dell'asset…",
    unavailable: "I dati dell'asset non sono disponibili al momento.",
    notFound: "Asset non trovato.",
    signIn: "Accedi per tenere un diario.",
    buy: "Acquisto",
    sell: "Vendita",
    dividend: "Dividendo",
    noMarketData: "Questo tipo di asset non dispone di quotazioni o analisi aziendali.",
    cash: "Liquidità",
    realEstate: "Immobili",
    valuationTitle: "Valutazioni manuali datate",
    valuationDescription:
      "Registra un valore per unità in USD. Non è una quotazione di mercato; il grafico storico mantiene l'ultima valutazione fino a 90 giorni.",
    valuationDate: "Data della valutazione",
    valuationPrice: "Valore per unità (USD)",
    valuationNote: "Fonte / nota (facoltativa)",
    saveValuation: "Salva valutazione",
    savingValuation: "Salvataggio…",
    valuationSaved: "Valutazione salvata",
    valuationHistory: "Valutazioni registrate",
    noValuations: "Nessuna valutazione datata registrata.",
  },
};

const ETF_OVERLAP_CTA: Record<Lang, { label: (symbol: string) => string; button: string }> = {
  en: {
    label: (s) => `See how ${s} overlaps by sector and region with other US & UCITS ETFs.`,
    button: "Compare ETF overlap",
  },
  bg: {
    label: (s) => `Виж как ${s} се припокрива по сектори и региони с други US и UCITS ETF-и.`,
    button: "Сравни ETF припокриването",
  },
  de: {
    label: (s) =>
      `Sieh, wie sich ${s} nach Sektor und Region mit anderen US- & UCITS-ETFs überschneidet.`,
    button: "ETF-Überschneidung prüfen",
  },
  es: {
    label: (s) =>
      `Comprueba cómo se solapa ${s} por sector y región con otros ETFs de EE. UU. y UCITS.`,
    button: "Comparar solapamiento ETF",
  },
  it: {
    label: (s) => `Scopri come ${s} si sovrappone per settore e area con altri ETF US e UCITS.`,
    button: "Confronta sovrapposizione ETF",
  },
};

const RESEARCH_NAV: Record<
  Lang,
  readonly (readonly [string, string, typeof ChartNoAxesCombined])[]
> = {
  en: [
    ["overview", "Overview", ChartNoAxesCombined],
    ["financials", "Financials", CircleDollarSign],
    ["statistics", "Key statistics", BarChart3],
    ["analysis", "Analysis", ChartNoAxesCombined],
    ["valuation", "DCF valuation", CircleDollarSign],
    ["holders", "Holders", UsersRound],
    ["news", "News", Newspaper],
  ],
  bg: [
    ["overview", "Общ преглед", ChartNoAxesCombined],
    ["financials", "Финанси", CircleDollarSign],
    ["statistics", "Показатели", BarChart3],
    ["analysis", "Анализ", ChartNoAxesCombined],
    ["valuation", "DCF оценка", CircleDollarSign],
    ["holders", "Акционери", UsersRound],
    ["news", "Новини", Newspaper],
  ],
  de: [
    ["overview", "Übersicht", ChartNoAxesCombined],
    ["financials", "Finanzen", CircleDollarSign],
    ["statistics", "Kennzahlen", BarChart3],
    ["analysis", "Analyse", ChartNoAxesCombined],
    ["valuation", "DCF-Bewertung", CircleDollarSign],
    ["holders", "Anteilseigner", UsersRound],
    ["news", "Nachrichten", Newspaper],
  ],
  es: [
    ["overview", "Resumen", ChartNoAxesCombined],
    ["financials", "Finanzas", CircleDollarSign],
    ["statistics", "Estadísticas", BarChart3],
    ["analysis", "Análisis", ChartNoAxesCombined],
    ["valuation", "Valoración DCF", CircleDollarSign],
    ["holders", "Accionistas", UsersRound],
    ["news", "Noticias", Newspaper],
  ],
  it: [
    ["overview", "Panoramica", ChartNoAxesCombined],
    ["financials", "Finanze", CircleDollarSign],
    ["statistics", "Statistiche", BarChart3],
    ["analysis", "Analisi", ChartNoAxesCombined],
    ["valuation", "Valutazione DCF", CircleDollarSign],
    ["holders", "Azionisti", UsersRound],
    ["news", "Notizie", Newspaper],
  ],
};

const BOND_REMINDER_COPY: Record<Lang, { nextCoupon: string; saveDate: string; note: string }> = {
  en: {
    nextCoupon: "Next confirmed coupon date",
    saveDate: "Save reminder date",
    note: "Enter the next confirmed date yourself. Reminders run only while CapiSpot is open.",
  },
  bg: {
    nextCoupon: "Следваща потвърдена купонна дата",
    saveDate: "Запази датата за напомняне",
    note: "Въведи следващата потвърдена дата. Напомнянията работят само докато CapiSpot е отворен.",
  },
  de: {
    nextCoupon: "Nächster bestätigter Kupontermin",
    saveDate: "Erinnerungstermin speichern",
    note: "Gib den nächsten bestätigten Termin selbst ein. Erinnerungen laufen nur bei geöffnetem CapiSpot.",
  },
  es: {
    nextCoupon: "Próxima fecha de cupón confirmada",
    saveDate: "Guardar fecha del aviso",
    note: "Introduce tú la próxima fecha confirmada. Los avisos solo funcionan con CapiSpot abierto.",
  },
  it: {
    nextCoupon: "Prossima data cedola confermata",
    saveDate: "Salva data promemoria",
    note: "Inserisci tu la prossima data confermata. I promemoria funzionano solo con CapiSpot aperto.",
  },
};

function AssetPage() {
  const { symbol } = Route.useParams();
  const { from, q } = Route.useSearch();
  const p = usePortfolio();
  const c = C[p.lang];
  const today = new Date().toISOString().slice(0, 10);
  const hash = useLocation({ select: (location) => location.hash });
  const sectionRef = useSectionAnchor(hash, symbol);
  const activeResearchSection = hash || "overview";
  const [bondPrice, setBondPrice] = useState("");
  const [snapshotTarget, setSnapshotTarget] = useState<HTMLDivElement | null>(null);
  const [savingBondPrice, setSavingBondPrice] = useState(false);
  const [valuationDate, setValuationDate] = useState(() => today);
  const [valuationPrice, setValuationPrice] = useState("");
  const [valuationNote, setValuationNote] = useState("");
  const [savingValuation, setSavingValuation] = useState(false);
  const [bondCouponDate, setBondCouponDate] = useState("");
  const h = p.holdings.find((x) => x.asset.symbol.toUpperCase() === symbol.toUpperCase());
  const catalogAsset = searchCatalog(symbol).find(
    (candidate) => candidate.symbol.toUpperCase() === symbol.toUpperCase(),
  );
  const portfolioAsset =
    h?.asset ??
    p.assets.find((a) => a.symbol.toUpperCase() === symbol.toUpperCase()) ??
    catalogAsset;
  const resolveAsset = useServerFn(searchMarket);
  const assetQuery = useQuery({
    queryKey: ["public-asset", symbol.toUpperCase()],
    queryFn: () => resolveAsset({ data: { query: symbol } }),
    enabled: !portfolioAsset,
    staleTime: 300_000,
  });
  const asset =
    portfolioAsset ??
    assetQuery.data?.assets.find(
      (candidate) => candidate.symbol.toUpperCase() === symbol.toUpperCase(),
    );
  const bondAsset = asset?.type === "bond" ? asset : null;
  const bondAssetId = bondAsset?.id;
  const bondPriceValue = bondAsset?.price;
  useEffect(() => {
    setBondPrice(
      bondPriceValue !== undefined && Number.isFinite(bondPriceValue) ? String(bondPriceValue) : "",
    );
  }, [bondAssetId, bondPriceValue]);
  useEffect(() => {
    setBondCouponDate(bondAssetId ? (readBondCouponDates()[bondAssetId] ?? "") : "");
  }, [bondAssetId]);
  const assetId = asset && "id" in asset ? asset.id : null;
  const assetValuations = assetId
    ? p.manualValuations
        .filter((valuation) => valuation.assetId === assetId)
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];
  const txs = assetId
    ? p.transactions
        .filter((t) => t.assetId === assetId)
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];
  const s = assetId ? assetSummary(p.transactions, assetId) : null;
  const type =
    asset?.type === "stock" || asset?.type === "etf" || asset?.type === "crypto"
      ? asset.type
      : null;
  const projectedCoupon = h && bondAsset ? projectedBondCoupon(bondAsset, h.quantity) : undefined;

  return (
    <div ref={sectionRef} className="asset-page page-enter space-y-5">
      <Link
        to={h ? "/holdings" : "/markets"}
        search={!h && from === "markets" && q ? { q } : {}}
        className="-ml-2.5 inline-flex min-h-10 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {h ? c.back : c.backMarkets}
      </Link>
      <div id="overview" className="scroll-mt-24">
        {type ? (
          <QuoteHero
            symbol={symbol.toUpperCase()}
            name={asset?.name ?? symbol.toUpperCase()}
            type={type}
            lang={p.lang}
            showStats={type !== "stock"}
            snapshotRef={type === "stock" ? setSnapshotTarget : undefined}
          />
        ) : (
          <Card>
            <h1 className="font-display text-xl font-bold">
              {asset?.name ?? symbol.toUpperCase()}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {!asset && assetQuery.isLoading
                ? c.loading
                : !asset && assetQuery.isError
                  ? c.unavailable
                  : !asset
                    ? c.notFound
                    : asset.type === "cash"
                      ? c.cash
                      : asset.type === "realEstate"
                        ? c.realEstate
                        : asset.type === "bond"
                          ? p.t("manualBondPrice")
                          : c.noMarketData}
            </p>
          </Card>
        )}
      </div>
      {resolveEtfExposureProfile(symbol) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-2.5 text-sm text-foreground">
            <Layers className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{ETF_OVERLAP_CTA[p.lang].label(symbol.toUpperCase())}</span>
          </div>
          <Link
            to="/etf-overlap"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-95"
          >
            {ETF_OVERLAP_CTA[p.lang].button}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      )}
      {type === "stock" && (
        <nav
          aria-label={p.lang === "bg" ? "Раздели за проучване" : "Research sections"}
          className="asset-section-tabs sticky z-20 -mx-1 overflow-x-auto rounded-2xl border border-border/80 bg-card/90 p-1.5 shadow-lg shadow-black/5 backdrop-blur-xl"
        >
          <div className="flex min-w-max gap-1">
            {RESEARCH_NAV[p.lang].map(([id, label, Icon]) => {
              const target =
                !p.isPro && ["statistics", "analysis", "holders"].includes(id) ? "research" : id;
              const active = activeResearchSection === id;
              return (
                <Link
                  key={id}
                  to="/asset/$symbol"
                  params={{ symbol }}
                  search={{ from, q }}
                  hash={target}
                  aria-current={active ? "location" : undefined}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
                    active
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-secondary/75 hover:text-foreground"
                  }`}
                >
                  <Icon size={16} aria-hidden />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
      {h && s ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            [c.qty, h.quantity.toLocaleString()],
            [c.avg, p.moneyFor(h.avgCost, h.asset)],
            [c.value, p.moneyFor(h.value, h.asset)],
            [c.pnl, `${p.moneyFor(h.pnl, h.asset, { sign: true })} (${pct(h.pnlPct)})`],
            [c.bought, p.moneyFor(s.bought, h.asset)],
            [c.sold, p.moneyFor(s.sold, h.asset)],
            [c.div, p.moneyFor(s.dividends, h.asset)],
            [c.since, s.firstDate ?? "—"],
          ].map(([k, v]) => (
            <Card key={k} className="p-4">
              <p className="text-xs text-muted-foreground">{k}</p>
              <p className="numeric-display mt-1 text-base font-bold tracking-tight tabular-nums sm:text-lg">
                {v}
              </p>
            </Card>
          ))}
        </div>
      ) : asset ? (
        <Card>
          <p className="text-sm text-muted-foreground">{c.none}</p>
          <Link
            to={p.user ? "/holdings" : "/auth"}
            className="press mt-3 inline-flex min-h-11 items-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            {p.user ? c.add : p.t("signIn")}
          </Link>
        </Card>
      ) : null}
      {asset?.type === "bond" && (
        <Card>
          <h2 className="font-display font-semibold">{p.t("bond")}</h2>
          <form
            className="mt-3 flex flex-wrap items-end gap-2"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!assetId) return;
              setSavingBondPrice(true);
              try {
                await p.updateBondPrice(assetId, Number(bondPrice));
                toast.success(p.t("saved"));
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Error");
              } finally {
                setSavingBondPrice(false);
              }
            }}
          >
            <label className="grid gap-1 text-sm">
              {p.t("price")} (USD)
              <input
                type="number"
                min="0.000001"
                step="any"
                required
                value={bondPrice}
                onChange={(event) => setBondPrice(event.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <Button type="submit" disabled={savingBondPrice || !assetId}>
              {p.t("save")}
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">{p.t("manualBondPrice")}</p>
          {bondAssetId && (
            <form
              className="mt-4 flex flex-wrap items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                writeBondCouponDate(bondAssetId, bondCouponDate || null);
                if (
                  bondCouponDate &&
                  typeof Notification !== "undefined" &&
                  Notification.permission === "default"
                )
                  void Notification.requestPermission();
              }}
            >
              <label className="grid gap-1 text-sm">
                {BOND_REMINDER_COPY[p.lang].nextCoupon}
                <input
                  type="date"
                  value={bondCouponDate}
                  onChange={(event) => setBondCouponDate(event.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                />
              </label>
              <Button type="submit">{BOND_REMINDER_COPY[p.lang].saveDate}</Button>
              <p className="basis-full text-xs text-muted-foreground">
                {BOND_REMINDER_COPY[p.lang].note}
              </p>
            </form>
          )}
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">{p.t("couponRate")}</dt>
              <dd className="font-semibold">{asset.bondCouponRate ?? "—"}%</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{p.t("maturity")}</dt>
              <dd className="font-semibold">{asset.bondMaturityDate ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{p.t("faceValue")}</dt>
              <dd className="font-semibold">
                {asset.bondFaceValue ? p.money(asset.bondFaceValue) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{p.t("projectedBondCoupon")}</dt>
              <dd className="font-semibold">
                {projectedCoupon !== undefined ? p.money(projectedCoupon) : "—"}
              </dd>
            </div>
          </dl>
        </Card>
      )}
      {p.user && assetId && (asset?.type === "bond" || asset?.type === "realEstate") && (
        <Card>
          <h2 className="font-display font-semibold">{c.valuationTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{c.valuationDescription}</p>
          <form
            className="mt-4 flex flex-wrap items-end gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!assetId) return;
              setSavingValuation(true);
              try {
                await p.saveManualValuation(
                  assetId,
                  valuationDate,
                  Number(valuationPrice),
                  valuationNote,
                );
                setValuationPrice("");
                setValuationNote("");
                toast.success(c.valuationSaved);
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Error");
              } finally {
                setSavingValuation(false);
              }
            }}
          >
            <label className="grid gap-1 text-sm">
              {c.valuationDate}
              <input
                type="date"
                required
                max={today}
                value={valuationDate}
                onChange={(event) => setValuationDate(event.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="grid gap-1 text-sm">
              {c.valuationPrice}
              <input
                type="number"
                min="0.000001"
                step="any"
                required
                value={valuationPrice}
                onChange={(event) => setValuationPrice(event.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="grid min-w-56 flex-1 gap-1 text-sm">
              {c.valuationNote}
              <input
                type="text"
                maxLength={500}
                value={valuationNote}
                onChange={(event) => setValuationNote(event.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <Button type="submit" disabled={savingValuation || !assetId}>
              {savingValuation ? c.savingValuation : c.saveValuation}
            </Button>
          </form>
          <div className="mt-5">
            <h3 className="text-sm font-semibold">{c.valuationHistory}</h3>
            {assetValuations.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">{c.noValuations}</p>
            ) : (
              <ul className="mt-2 divide-y divide-border text-sm">
                {assetValuations.map((valuation) => (
                  <li key={valuation.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span className="tabular-nums">
                      {valuation.date}
                      {valuation.note && (
                        <span className="ml-2 text-muted-foreground">{valuation.note}</span>
                      )}
                    </span>
                    <span className="numeric-display font-semibold tabular-nums">
                      {new Intl.NumberFormat(languageLocale(p.lang), {
                        style: "currency",
                        currency: "USD",
                      }).format(valuation.priceUsd)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      )}
      {txs.length > 0 && (
        <Card>
          <h2 className="mb-3 font-display font-semibold">{c.history}</h2>
          <ul className="divide-y divide-border text-sm">
            {txs.map((t) => (
              <li key={t.id} className="flex justify-between gap-3 py-2.5">
                <span className="tabular-nums">
                  {t.date} · <span className="font-medium">{c[t.kind]}</span>
                </span>
                <span className="numeric-display text-right font-semibold tabular-nums">
                  {t.kind === "dividend"
                    ? p.moneyFor(t.price * t.quantity - (t.fee ?? 0), h?.asset)
                    : `${t.quantity} × ${p.moneyFor(t.price, h?.asset)}`}
                  {(t.fee ?? 0) > 0 && (
                    <span className="ml-1 block font-sans text-xs font-normal text-muted-foreground">
                      {p.t("fee")}: {p.money(t.fee ?? 0)}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {asset && <InvestmentJournal symbol={symbol.toUpperCase()} c={c} />}
      {type === "stock" && asset && (
        <CompanyProfileDetails
          snapshotTarget={snapshotTarget}
          symbol={symbol.toUpperCase()}
          name={asset.name ?? symbol.toUpperCase()}
          lang={p.lang}
          userId={p.user?.id ?? null}
          isPro={p.isPro}
        />
      )}
      {type && type !== "stock" && (
        <div id="news" className="scroll-mt-24">
          <CompanyOverview
            asset={{ symbol: symbol.toUpperCase(), name: asset?.name ?? symbol, type }}
            lang={p.lang}
          />
        </div>
      )}
    </div>
  );
}
