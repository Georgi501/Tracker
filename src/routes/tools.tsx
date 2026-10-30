import { SnapshotCard } from "@/components/SnapshotCard";
import { PortfolioReview, DataQuality, proToolsCopy } from "@/components/ProTools";
import { CurveSilhouette, FireCalculator, ProGate } from "@/components/ProFeatures";
import { DcfCalculator, dcfCopy } from "@/components/DcfCalculator";
import { ThesisCheck, thesisCopy } from "@/components/ThesisCheck";
import { proCopy } from "@/lib/pro-i18n";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Card, Delta } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { pct, usePortfolio } from "@/lib/store";
import { toolsCopy } from "@/lib/tools-i18n";
import {
  classValues,
  exportCsv,
  fifoTaxReport,
  rebalance,
  riskMetrics,
  taxReportCsv,
} from "@/lib/tools";
import { extrasCopy } from "@/lib/extras-i18n";
import {
  alertTriggered,
  readAlerts as readAlertsNow,
  readWatchlist,
  writeAlerts,
  writeWatchlist,
  SYMBOL_RE,
} from "@/lib/watchlist";
import { useWatchState } from "@/components/AssetExtras";
import { Bell } from "lucide-react";
import { getPortfolioHistory } from "@/lib/history.functions";
import { marketQuote } from "@/lib/market.functions";
import { ConcentrationCard, GoalsCard } from "@/components/Insights";
import { insightsCopy } from "@/lib/insights-i18n";
import { MARKET_ASSETS } from "@/lib/market-search";
const CRYPTO_SYMBOLS = MARKET_ASSETS.filter((a) => a.type === "crypto").map((a) => a.symbol);

export const Route = createFileRoute("/tools")({
  head: () => ({
    meta: [
      { title: "Tools — Capispot Rebalancing, FIFO tax report & risk" },
      {
        name: "description",
        content:
          "Rebalancing calculator, FIFO realized gains report, risk metrics, watchlist and portfolio export.",
      },
      { property: "og:title", content: "Investor tools — Capispot" },
      {
        property: "og:description",
        content: "Rebalance, report realized gains with FIFO, measure risk and export your data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Tools,
});

const CLASSES = ["stock", "etf", "crypto", "cash", "realEstate"] as const;

function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function Tools() {
  const p = usePortfolio();
  const c = toolsCopy[p.lang];
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <h1 className="font-display text-2xl font-bold lg:col-span-2">{c.tools}</h1>
      <ProGate
        title={proCopy[p.lang].fire}
        desc={proCopy[p.lang].fireDesc}
        preview={<CurveSilhouette />}
      >
        <FireCalculator />
      </ProGate>
      <ProGate
        title={dcfCopy[p.lang].intrinsic + " (DCF)"}
        desc={dcfCopy[p.lang].gateDescription}
        preview={<CurveSilhouette />}
      >
        <DcfCalculator />
      </ProGate>
      <ProGate
        title={thesisCopy[p.lang].title}
        desc={thesisCopy[p.lang].desc}
        preview={<CurveSilhouette />}
      >
        <ThesisCheck />
      </ProGate>
      <ProGate
        title={proToolsCopy[p.lang].review}
        desc={proToolsCopy[p.lang].reviewDesc}
        preview={<CurveSilhouette />}
      >
        <PortfolioReview />
      </ProGate>
      <ProGate
        title={p.lang === "bg" ? "Споделима снимка на портфолиото" : "Shareable portfolio snapshot"}
        desc={
          p.lang === "bg"
            ? "Красива картичка само с проценти по класове активи."
            : "A clean card with asset-class percentages only."
        }
        preview={<CurveSilhouette />}
      >
        <SnapshotCard />
      </ProGate>
      <ProGate
        title={proToolsCopy[p.lang].quality}
        desc={proToolsCopy[p.lang].qualityDesc}
        preview={<CurveSilhouette />}
      >
        <DataQuality />
      </ProGate>
      <GoalsCard />
      <ProGate title={c.rebalance} desc={c.rebalanceHint} preview={<CurveSilhouette />}>
        <Rebalance />
      </ProGate>
      <Risk />
      <ConcentrationCard />
      <ProGate title={c.tax} desc={c.realized} preview={<CurveSilhouette />}>
        <Tax />
      </ProGate>
      <div className="grid gap-5">
        <Watchlist />
        <Card>
          <h3 className="font-display mb-3 font-semibold">{c.exportTitle}</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={!p.transactions.length}
              onClick={() =>
                download("folio-transactions.csv", exportCsv(p.assets, p.transactions), "text/csv")
              }
            >
              {c.exportCsv}
            </Button>
            <Button
              variant="secondary"
              disabled={!p.transactions.length}
              onClick={() =>
                download(
                  "folio-backup.json",
                  JSON.stringify(
                    {
                      exportedAt: new Date().toISOString(),
                      assets: p.assets,
                      transactions: p.transactions,
                    },
                    null,
                    2,
                  ),
                  "application/json",
                )
              }
            >
              {c.exportJson}
            </Button>
            <Button
              variant="secondary"
              disabled={!p.transactions.length}
              onClick={() => window.print()}
            >
              PDF
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Rebalance() {
  const p = usePortfolio();
  const c = toolsCopy[p.lang];
  const current = classValues(p.holdings);
  const [targets, setTargets] = useState<Record<string, number>>({
    stock: 30,
    etf: 50,
    crypto: 10,
    cash: 10,
    realEstate: 0,
  });
  const [cash, setCash] = useState(1000);
  const plan = rebalance(current, targets, cash);
  const sum = Object.values(targets).reduce((s, v) => s + v, 0);
  return (
    <Card>
      <h3 className="font-display font-semibold">{c.rebalance}</h3>
      <p className="mb-3 text-xs text-muted-foreground">{c.rebalanceHint}</p>
      <label className="mb-3 flex items-center gap-2 text-sm">
        {c.newCash}
        <input
          type="number"
          min={0}
          value={cash}
          onChange={(e) => setCash(Number(e.target.value))}
          className="w-32 rounded-md border border-input bg-background px-2 py-1"
        />
      </label>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th className="py-1 font-medium" />
            <th className="font-medium">{c.target}</th>
            <th className="text-right font-medium">{c.current}</th>
            <th className="text-right font-medium">{c.invest}</th>
          </tr>
        </thead>
        <tbody>
          {CLASSES.map((k) => (
            <tr key={k} className="border-t border-border">
              <td className="py-2">{p.t(k)}</td>
              <td>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={targets[k] ?? 0}
                  aria-label={`${p.t(k)} ${c.target}`}
                  onChange={(e) => setTargets({ ...targets, [k]: Number(e.target.value) })}
                  className="w-16 rounded-md border border-input bg-background px-2 py-1"
                />
              </td>
              <td className="text-right">{p.money(current[k] ?? 0)}</td>
              <td className="text-right font-semibold">{p.money(plan[k] ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={`mt-2 text-xs ${sum === 100 ? "text-muted-foreground" : "text-destructive"}`}>
        {c.targetSum}: {sum}%
      </p>
    </Card>
  );
}

function Risk() {
  const p = usePortfolio();
  const c = toolsCopy[p.lang];
  const historyFn = useServerFn(getPortfolioHistory);
  const h = useQuery({
    queryKey: ["portfolio-history", p.user?.id, p.transactions, "ALL", p.currency],
    queryFn: () => historyFn({ data: { period: "ALL", currency: p.currency } }),
    enabled: !!p.user,
    staleTime: 60000,
  });
  const m = h.data ? riskMetrics(h.data.points) : null;
  return (
    <Card>
      <h3 className="font-display font-semibold">{c.risk}</h3>
      <p className="mb-3 text-xs text-muted-foreground">{c.riskHint}</p>
      {!p.user ? (
        <p className="text-sm text-muted-foreground">{c.signInNeeded}</p>
      ) : !m ? (
        <p className="text-sm text-muted-foreground">{h.isFetching ? "…" : c.riskUnavailable}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label={c.volatility} value={pct(m.volatility, false)} />
          <Metric label={c.maxDrawdown} value={pct(m.maxDrawdown, false)} />
          <Metric label={c.sharpe} value={m.sharpe.toFixed(2)} />
          <Metric label={insightsCopy[p.lang].sortino} value={m.sortino.toFixed(2)} />
        </div>
      )}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-bold">{value}</p>
    </div>
  );
}

function Tax() {
  const p = usePortfolio();
  const c = toolsCopy[p.lang];
  const years = useMemo(() => fifoTaxReport(p.transactions), [p.transactions]);
  return (
    <Card>
      <h3 className="font-display mb-3 font-semibold">{c.tax}</h3>
      {!years.length ? (
        <p className="text-sm text-muted-foreground">{c.noSales}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1 font-medium">{c.year}</th>
                <th className="text-right font-medium">{c.proceeds}</th>
                <th className="text-right font-medium">{c.costBasis}</th>
                <th className="text-right font-medium">{c.realized}</th>
                <th className="text-right font-medium">{c.dividendsReceived}</th>
              </tr>
            </thead>
            <tbody>
              {years.map((y) => (
                <tr key={y.year} className="border-t border-border">
                  <td className="py-2 font-semibold">{y.year}</td>
                  <td className="text-right">{p.money(y.proceeds)}</td>
                  <td className="text-right">{p.money(y.cost)}</td>
                  <td className="text-right">
                    <Delta value={y.realized}>{p.money(y.realized, { sign: true })}</Delta>
                  </td>
                  <td className="text-right">{p.money(y.dividends)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {years.length > 0 && (
        <div className="mt-3 space-y-1">
          <Button
            variant="secondary"
            className="h-11 w-full sm:w-auto"
            onClick={() =>
              download(
                `folio-tax-report-${new Date().toISOString().slice(0, 10)}.csv`,
                "\uFEFF" + taxReportCsv(years, p.assets),
                "text/csv;charset=utf-8",
              )
            }
          >
            {extrasCopy[p.lang].taxExport}
          </Button>
          <p className="text-xs text-muted-foreground">{extrasCopy[p.lang].taxNote}</p>
        </div>
      )}
    </Card>
  );
}

function Watchlist() {
  const p = usePortfolio();
  const c = toolsCopy[p.lang];
  const { list, alerts } = useWatchState();
  const [input, setInput] = useState("");
  const add = () => {
    const s = input.trim().toUpperCase();
    if (SYMBOL_RE.test(s) && !list.includes(s)) writeWatchlist([...list, s].slice(0, 30));
    setInput("");
  };
  return (
    <Card>
      <h3 className="font-display mb-3 font-semibold">{c.watchlist}</h3>
      <form
        className="mb-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={c.watchPlaceholder}
          className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
        />
        <Button type="submit" className="h-11">
          {c.watchAdd}
        </Button>
      </form>
      {!list.length ? (
        <p className="text-sm text-muted-foreground">{c.watchEmpty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {list.map((s) => (
            <WatchRow
              key={s}
              symbol={s}
              onRemove={() => {
                writeWatchlist(readWatchlist().filter((x) => x !== s));
                writeAlerts(readAlertsNow().filter((a) => a.symbol !== s));
              }}
            />
          ))}
        </ul>
      )}
      {!alerts.length && (
        <p className="mt-2 text-xs text-muted-foreground">{extrasCopy[p.lang].alertNone}</p>
      )}
    </Card>
  );
}

function WatchRow({ symbol, onRemove }: { symbol: string; onRemove: () => void }) {
  const p = usePortfolio();
  const c = toolsCopy[p.lang];
  const quoteFn = useServerFn(marketQuote);
  const type = CRYPTO_SYMBOLS.includes(symbol) ? "crypto" : "stock";
  const q = useQuery({
    queryKey: ["watch-quote", symbol],
    queryFn: () => quoteFn({ data: { symbol, type } }),
    refetchInterval: 60000,
  });
  const quote = q.data?.quote;
  const x = extrasCopy[p.lang];
  const mine = useWatchState().alerts.filter((a) => a.symbol === symbol);
  return (
    <li className="py-2 text-sm">
      <div className="flex items-center gap-3">
        <span className="flex-1 font-semibold">
          {symbol}
          {type === "crypto" && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">{c.crypto}</span>
          )}
        </span>
        <span>
          {quote
            ? `${quote.price.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${quote.currency}`
            : q.isFetching
              ? "…"
              : c.unavailable}
        </span>
        {quote?.change != null && <Delta value={quote.change}>{pct(quote.change)}</Delta>}
        <button
          type="button"
          aria-label={`Remove ${symbol}`}
          onClick={onRemove}
          className="text-muted-foreground hover:text-foreground"
        >
          <X size={14} />
        </button>
      </div>
      {mine.map((a, i) => {
        const hit = alertTriggered(a, quote?.price);
        return (
          <p
            key={i}
            className={`mt-1 flex items-center gap-1 text-xs ${hit ? "font-semibold text-success" : "text-muted-foreground"}`}
          >
            <Bell size={12} />
            {a.direction === "above" ? x.alertAbove : x.alertBelow} {a.target} ·{" "}
            {hit ? x.alertHit : x.alertWaiting}
            <button
              type="button"
              aria-label="Remove alert"
              className="ml-1"
              onClick={() =>
                writeAlerts(
                  readAlertsNow().filter(
                    (b) =>
                      !(
                        b.symbol === a.symbol &&
                        b.direction === a.direction &&
                        b.target === a.target
                      ),
                  ),
                )
              }
            >
              <X size={12} />
            </button>
          </p>
        );
      })}
    </li>
  );
}
