import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  ChartNoAxesCombined,
  CircleDollarSign,
  Newspaper,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/AppShell";
import { QuoteHero } from "@/components/QuoteHero";
import { CompanyOverview } from "@/components/CompanyOverview";
import { ProCompanyResearch } from "@/components/ProCompanyResearch";
import { ProFinancials } from "@/components/ProFinancials";
import { Button } from "@/components/ui/button";
import { pct, usePortfolio } from "@/lib/store";
import { assetSummary, reviewDue } from "@/lib/journey";
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/lib/i18n";

export const Route = createFileRoute("/asset/$symbol")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.symbol} — position details | Capispot` },
      {
        name: "description",
        content: `Your ${params.symbol} position: P&L, dividends, transaction history, company overview and investing journal.`,
      },
      { property: "og:title", content: `${params.symbol} — Capispot` },
      {
        property: "og:description",
        content: "Position details, history, news and your investment thesis in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssetPage,
});

const C = {
  en: {
    back: "Holdings",
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
    signIn: "Sign in to keep a journal.",
    buy: "Buy",
    sell: "Sell",
    dividend: "Dividend",
    noMarketData: "This asset type does not have market quotes or company research.",
    cash: "Cash",
    realEstate: "Real estate",
  },
  bg: {
    back: "Позиции",
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
    signIn: "Влез, за да водиш дневник.",
    buy: "Покупка",
    sell: "Продажба",
    dividend: "Дивидент",
    noMarketData: "За този тип актив няма пазарни котировки или фирмено проучване.",
    cash: "Парични средства",
    realEstate: "Недвижим имот",
  },
  de: {
    back: "Positionen",
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
    signIn: "Melde dich an, um ein Journal zu führen.",
    buy: "Kauf",
    sell: "Verkauf",
    dividend: "Dividende",
    noMarketData: "Für diesen Anlagetyp sind keine Marktkurse oder Unternehmensanalysen verfügbar.",
    cash: "Bargeld",
    realEstate: "Immobilien",
  },
  es: {
    back: "Posiciones",
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
    signIn: "Inicia sesión para llevar un diario.",
    buy: "Compra",
    sell: "Venta",
    dividend: "Dividendo",
    noMarketData: "Este tipo de activo no dispone de cotizaciones ni análisis de empresas.",
    cash: "Efectivo",
    realEstate: "Inmobiliario",
  },
  it: {
    back: "Posizioni",
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
    signIn: "Accedi per tenere un diario.",
    buy: "Acquisto",
    sell: "Vendita",
    dividend: "Dividendo",
    noMarketData: "Questo tipo di asset non dispone di quotazioni o analisi aziendali.",
    cash: "Liquidità",
    realEstate: "Immobili",
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
    ["holders", "Holders", UsersRound],
    ["news", "News", Newspaper],
  ],
  bg: [
    ["overview", "Общ преглед", ChartNoAxesCombined],
    ["financials", "Финанси", CircleDollarSign],
    ["statistics", "Показатели", BarChart3],
    ["analysis", "Анализ", ChartNoAxesCombined],
    ["holders", "Акционери", UsersRound],
    ["news", "Новини", Newspaper],
  ],
  de: [
    ["overview", "Übersicht", ChartNoAxesCombined],
    ["financials", "Finanzen", CircleDollarSign],
    ["statistics", "Kennzahlen", BarChart3],
    ["analysis", "Analyse", ChartNoAxesCombined],
    ["holders", "Anteilseigner", UsersRound],
    ["news", "Nachrichten", Newspaper],
  ],
  es: [
    ["overview", "Resumen", ChartNoAxesCombined],
    ["financials", "Finanzas", CircleDollarSign],
    ["statistics", "Estadísticas", BarChart3],
    ["analysis", "Análisis", ChartNoAxesCombined],
    ["holders", "Accionistas", UsersRound],
    ["news", "Noticias", Newspaper],
  ],
  it: [
    ["overview", "Panoramica", ChartNoAxesCombined],
    ["financials", "Finanze", CircleDollarSign],
    ["statistics", "Statistiche", BarChart3],
    ["analysis", "Analisi", ChartNoAxesCombined],
    ["holders", "Azionisti", UsersRound],
    ["news", "Notizie", Newspaper],
  ],
};

function AssetPage() {
  const { symbol } = Route.useParams();
  const p = usePortfolio();
  const c = C[p.lang];
  const h = p.holdings.find((x) => x.asset.symbol.toUpperCase() === symbol.toUpperCase());
  const asset = h?.asset ?? p.assets.find((a) => a.symbol.toUpperCase() === symbol.toUpperCase());
  const txs = asset
    ? p.transactions
        .filter((t) => t.assetId === asset.id)
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];
  const s = asset ? assetSummary(p.transactions, asset.id) : null;
  const type =
    asset?.type === "stock" || asset?.type === "etf" || asset?.type === "crypto"
      ? asset.type
      : null;

  return (
    <div className="page-enter space-y-5">
      <Link
        to="/holdings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {c.back}
      </Link>
      <div id="overview" className="scroll-mt-24">
        {type ? (
          <QuoteHero
            symbol={symbol.toUpperCase()}
            name={asset?.name ?? symbol.toUpperCase()}
            type={type}
            lang={p.lang}
          />
        ) : (
          <Card>
            <h1 className="font-display text-xl font-bold">
              {asset?.name ?? symbol.toUpperCase()}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {asset?.type === "cash"
                ? c.cash
                : asset?.type === "realEstate"
                  ? c.realEstate
                  : c.noMarketData}
            </p>
          </Card>
        )}
      </div>
      {type === "stock" && (
        <nav
          aria-label={p.lang === "bg" ? "Раздели за проучване" : "Research sections"}
          className="sticky top-16 z-10 -mx-1 overflow-x-auto rounded-xl border border-border bg-background/90 p-1 shadow-sm backdrop-blur"
        >
          <div className="flex min-w-max gap-1">
            {RESEARCH_NAV[p.lang].map(([id, label, Icon]) => (
              <a
                key={id}
                href={`#${!p.isPro && ["statistics", "analysis", "holders"].includes(id) ? "research" : id}`}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                <Icon size={15} />
                {label}
              </a>
            ))}
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
              <p className="mt-1 font-semibold">{v}</p>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-sm text-muted-foreground">{c.none}</p>
        </Card>
      )}
      {txs.length > 0 && (
        <Card>
          <h2 className="mb-3 font-display font-semibold">{c.history}</h2>
          <ul className="divide-y divide-border text-sm">
            {txs.map((t) => (
              <li key={t.id} className="flex justify-between py-2">
                <span>
                  {t.date} · {c[t.kind]}
                </span>
                <span>
                  {t.kind === "dividend"
                    ? p.moneyFor(t.price * t.quantity, h?.asset)
                    : `${t.quantity} × ${p.moneyFor(t.price, h?.asset)}`}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Journal symbol={symbol.toUpperCase()} c={c} />
      {type === "stock" && (
        <div id="financials" className="scroll-mt-24">
          <ProFinancials symbol={symbol.toUpperCase()} lang={p.lang} />
        </div>
      )}
      {type === "stock" && (
        <div id="research" className="scroll-mt-24">
          <ProCompanyResearch symbol={symbol.toUpperCase()} lang={p.lang} />
        </div>
      )}
      {type && (
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

function Journal({ symbol, c }: { symbol: string; c: typeof C.en }) {
  const p = usePortfolio();
  const [thesis, setThesis] = useState("");
  const [horizon, setHorizon] = useState("");
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!p.user) return;
    void supabase
      .from("journal_notes")
      .select("thesis,horizon,review_date")
      .eq("symbol", symbol)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setThesis(data.thesis);
          setHorizon(data.horizon);
          setReview(data.review_date ?? "");
        }
      });
  }, [p.user, symbol]);
  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("journal_notes").upsert(
      {
        user_id: p.user!.id,
        symbol,
        thesis: thesis.slice(0, 4000),
        horizon: horizon.slice(0, 100),
        review_date: review || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,symbol" },
    );
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success(c.saved);
  };
  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2 font-display font-semibold">
        <BookOpen className="h-4 w-4 text-primary" />
        {c.journal}
      </h2>
      {!p.user ? (
        <Link to="/auth" className="text-sm font-semibold text-primary">
          {c.signIn}
        </Link>
      ) : (
        <div className="space-y-3">
          {reviewDue(review || null) && (
            <p className="rounded-xl bg-accent px-3 py-2 text-sm text-accent-foreground">{c.due}</p>
          )}
          <label className="block text-sm">
            {c.thesis}
            <textarea
              value={thesis}
              onChange={(e) => setThesis(e.target.value)}
              rows={4}
              maxLength={4000}
              className="mt-1 w-full rounded-xl border border-border bg-background p-2"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              {c.horizon}
              <input
                value={horizon}
                onChange={(e) => setHorizon(e.target.value)}
                maxLength={100}
                className="mt-1 w-full rounded-xl border border-border bg-background p-2"
              />
            </label>
            <label className="text-sm">
              {c.review}
              <input
                type="date"
                value={review}
                onChange={(e) => setReview(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background p-2"
              />
            </label>
          </div>
          <Button onClick={() => void save()} disabled={busy}>
            {c.save}
          </Button>
        </div>
      )}
    </Card>
  );
}
