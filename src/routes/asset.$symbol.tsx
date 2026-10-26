import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen } from "lucide-react";
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
  },
};

function AssetPage() {
  const { symbol } = Route.useParams();
  const p = usePortfolio();
  const c = p.lang === "bg" ? C.bg : C.en;
  const h = p.holdings.find((x) => x.asset.symbol.toUpperCase() === symbol.toUpperCase());
  const asset = h?.asset ?? p.assets.find((a) => a.symbol.toUpperCase() === symbol.toUpperCase());
  const txs = asset
    ? p.transactions
        .filter((t) => t.assetId === asset.id)
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];
  const s = asset ? assetSummary(p.transactions, asset.id) : null;
  const type = asset?.type === "etf" || asset?.type === "crypto" ? asset.type : "stock";

  return (
    <div className="page-enter space-y-5">
      <Link
        to="/holdings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {c.back}
      </Link>
      <QuoteHero
        symbol={symbol.toUpperCase()}
        name={asset?.name ?? symbol.toUpperCase()}
        type={type}
        lang={p.lang}
      />
      {h && s ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            [c.qty, h.quantity.toLocaleString()],
            [c.avg, p.money(h.avgCost)],
            [c.value, p.money(h.value)],
            [c.pnl, `${p.money(h.pnl, { sign: true })} (${pct(h.pnlPct)})`],
            [c.bought, p.money(s.bought)],
            [c.sold, p.money(s.sold)],
            [c.div, p.money(s.dividends)],
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
                    ? p.money(t.price * t.quantity)
                    : `${t.quantity} × ${p.money(t.price)}`}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Journal symbol={symbol.toUpperCase()} c={c} />
      {type === "stock" && <ProFinancials symbol={symbol.toUpperCase()} lang={p.lang} />}
      {type === "stock" && <ProCompanyResearch symbol={symbol.toUpperCase()} lang={p.lang} />}
      <CompanyOverview
        asset={{ symbol: symbol.toUpperCase(), name: asset?.name ?? symbol, type }}
        lang={p.lang}
      />
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
