import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/AppShell";
import { CompanyLogo } from "@/components/CompanyLogo";
import { usePortfolio } from "@/lib/store";
import { languageLocale, type Lang } from "@/lib/i18n";
import { timelineByMonth } from "@/lib/journey";

export const Route = createFileRoute("/timeline")({
  head: () => ({
    meta: [
      { title: "Portfolio timeline — Capispot" },
      {
        name: "description",
        content: "Every buy, sale and dividend in your portfolio, month by month.",
      },
      { property: "og:title", content: "Portfolio timeline — Capispot" },
      { property: "og:description", content: "See the story of your portfolio month by month." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Timeline,
});

function Timeline() {
  const p = usePortfolio();
  const c = COPY[p.lang];
  const kind = c.kind;
  const groups = timelineByMonth(p.transactions);
  const fmt = new Intl.DateTimeFormat(languageLocale(p.lang), { month: "long", year: "numeric" });
  return (
    <div className="page-enter space-y-5">
      <h1 className="font-display text-2xl font-bold">{c.title}</h1>
      {groups.length === 0 && (
        <Card>
          <p className="text-sm text-muted-foreground">{c.empty}</p>
        </Card>
      )}
      {groups.map((g) => (
        <Card key={g.month}>
          <h2 className="mb-3 font-display font-semibold capitalize">
            {fmt.format(new Date(`${g.month}-01T12:00:00`))}
          </h2>
          <ol className="relative space-y-3 border-l-2 border-primary/30 pl-4">
            {g.items.map((t) => {
              const a = p.assets.find((x) => x.id === t.assetId);
              return (
                <li key={t.id} className="flex items-center gap-3">
                  <span
                    className={`absolute -left-[7px] h-3 w-3 rounded-full ${t.kind === "sell" ? "bg-destructive" : t.kind === "dividend" ? "bg-chart-2" : "bg-primary"}`}
                  />
                  {a && <CompanyLogo symbol={a.symbol} type={a.type} />}
                  <div className="min-w-0 flex-1 text-sm">
                    {a ? (
                      <Link
                        to="/asset/$symbol"
                        params={{ symbol: a.symbol }}
                        className="font-semibold hover:text-primary"
                      >
                        {a.symbol}
                      </Link>
                    ) : (
                      "—"
                    )}
                    <p className="text-xs text-muted-foreground">
                      {t.date} · {kind[t.kind]}
                    </p>
                  </div>
                  <span className="text-sm font-medium">
                    {t.kind === "dividend"
                      ? p.money(t.price * t.quantity)
                      : `${t.quantity} × ${p.money(t.price)}`}
                  </span>
                </li>
              );
            })}
          </ol>
        </Card>
      ))}
    </div>
  );
}

const COPY: Record<
  Lang,
  { title: string; empty: string; kind: Record<"buy" | "sell" | "dividend", string> }
> = {
  en: {
    title: "Portfolio timeline",
    empty: "No transactions yet.",
    kind: { buy: "Buy", sell: "Sell", dividend: "Dividend" },
  },
  bg: {
    title: "Хронология на портфолиото",
    empty: "Още няма сделки.",
    kind: { buy: "Покупка", sell: "Продажба", dividend: "Дивидент" },
  },
  de: {
    title: "Portfolio-Zeitachse",
    empty: "Noch keine Transaktionen.",
    kind: { buy: "Kauf", sell: "Verkauf", dividend: "Dividende" },
  },
  es: {
    title: "Cronología de la cartera",
    empty: "Todavía no hay transacciones.",
    kind: { buy: "Compra", sell: "Venta", dividend: "Dividendo" },
  },
  it: {
    title: "Cronologia del portafoglio",
    empty: "Ancora nessuna transazione.",
    kind: { buy: "Acquisto", sell: "Vendita", dividend: "Dividendo" },
  },
};
