import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  dcfAnalysis,
  dcfValue,
  hasUsableDcfFundamentals,
  scenario,
  valuationGap,
  type DcfCase,
} from "@/lib/dcf";
import { dcfCopy } from "@/lib/dcf-copy";
import { marketSearchSchema, searchCatalog } from "@/lib/market-search";
import { marketDcf, searchMarket, type DcfData } from "@/lib/market.functions";
import { isQuoteFresh, isUsableQuote } from "@/lib/portfolio";
import { usePortfolio } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

const pctFmt = (v: number) => `${(v * 100).toFixed(1)}%`;

function hasValidQuote(data: DcfData | null | undefined): data is DcfData & { price: number } {
  return !!data && typeof data.price === "number" && Number.isFinite(data.price) && data.price > 0;
}

function sensitivityRange(center: number, min: number, max: number, step: number) {
  if (center - step < min) {
    return [center, Math.min(max, center + step), Math.min(max, center + step * 2)];
  }
  if (center + step > max) {
    return [Math.max(min, center - step * 2), Math.max(min, center - step), center];
  }
  return [center - step, center, center + step];
}

export function DcfCalculator({ fixedSymbol }: { fixedSymbol?: string } = {}) {
  const p = usePortfolio();
  const c = dcfCopy[p.lang];
  const firstStock = p.holdings.find((h) => h.asset.type === "stock")?.asset.symbol ?? "";
  const [input, setInput] = useState(firstStock);
  const [symbol, setSymbol] = useState(firstStock);
  const [mode, setMode] = useState<DcfCase>("base");
  const [symbolError, setSymbolError] = useState(false);
  const [custom, setCustom] = useState<{
    growth: number;
    discount: number;
    terminal: number;
  } | null>(null);
  const activeSymbol = fixedSymbol ?? symbol;
  const fn = useServerFn(marketDcf);
  const searchFn = useServerFn(searchMarket);
  const q = useQuery({
    queryKey: ["dcf", activeSymbol],
    queryFn: () => fn({ data: { symbol: activeSymbol } }),
    enabled: !!activeSymbol,
    staleTime: 15 * 60_000,
  });
  const d = q.data;
  const revenueGrowth = d?.revenueGrowth;
  const hasRevenueGrowth = typeof revenueGrowth === "number" && Number.isFinite(revenueGrowth);
  const baseGrowth = hasRevenueGrowth ? revenueGrowth : 0.05;
  const a = custom ?? scenario(mode, baseGrowth);
  const currencyIsValid = (value: string | null | undefined) =>
    typeof value === "string" && /^[A-Za-z]{3}$/.test(value);
  const sameCurrency =
    !!d?.currency &&
    !!d.finCurrency &&
    d.currency.toUpperCase() === d.finCurrency.toUpperCase() &&
    currencyIsValid(d.currency);
  const analysis =
    d && hasUsableDcfFundamentals(d) && sameCurrency
      ? dcfAnalysis({
          fcf: d.fcf,
          cash: d.cash,
          debt: d.debt,
          shares: d.shares,
          ...a,
        })
      : null;
  const money = (value: number) =>
    new Intl.NumberFormat(p.lang, {
      style: "currency",
      currency: d?.currency?.toUpperCase() ?? "USD",
      maximumFractionDigits: 2,
    }).format(value);
  const compactMoney = (value: number) =>
    new Intl.NumberFormat(p.lang, {
      style: "currency",
      currency: d?.currency?.toUpperCase() ?? "USD",
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  const compactNumber = (value: number) =>
    new Intl.NumberFormat(p.lang, {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  const gap = analysis && hasValidQuote(d) ? valuationGap(analysis.valuePerShare, d.price) : null;
  const max = analysis && hasValidQuote(d) ? Math.max(analysis.valuePerShare, d.price, 1) : 1;
  const hasQuoteTimestamp = !!d?.priceAsOf && Number.isFinite(Date.parse(d.priceAsOf));
  const isFreshTimestamp = hasQuoteTimestamp && isQuoteFresh(d?.priceAsOf);
  const hasFreshQuote = isUsableQuote(d?.price, d?.priceAsOf);
  const hasStaleQuote = hasQuoteTimestamp && !isFreshTimestamp;
  const growthValues = sensitivityRange(a.growth, -0.05, 0.3, 0.05);
  const discountValues = sensitivityRange(
    a.discount,
    Math.max(0.05, a.terminal + 0.005),
    0.15,
    0.01,
  );
  const dateLabel = (value: string | null, fallback: string) => {
    if (!value) return fallback;
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? fallback
      : new Intl.DateTimeFormat(p.lang, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(date);
  };
  const periodDateLabel = (value: string | null) => {
    if (!value) return c.unknownDate;
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? c.unknownDate
      : new Intl.DateTimeFormat(p.lang, { dateStyle: "medium", timeZone: "UTC" }).format(date);
  };

  return (
    <div className="grid gap-4">
      {!fixedSymbol && (
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const raw = input.trim();
            setSymbol("");
            setCustom(null);
            setSymbolError(false);
            if (!raw) {
              setSymbolError(true);
              return;
            }
            const pick = (list: { symbol: string; type: string }[]) =>
              list.find((asset) => asset.type === "stock")?.symbol;
            let s = pick(
              searchCatalog(raw).filter(
                (a) =>
                  a.type === "stock" &&
                  (a.symbol.toUpperCase() === raw.toUpperCase() ||
                    a.name.toLowerCase().startsWith(raw.toLowerCase())),
              ),
            );
            if (!s) {
              try {
                const r = await searchFn({ data: marketSearchSchema.parse({ query: raw }) });
                s = pick(r.assets);
              } catch {
                s = undefined;
              }
            }
            if (!s && /^[A-Za-z0-9.^=_-]{1,20}$/.test(raw)) s = raw.toUpperCase();
            if (s) {
              setSymbol(s);
            } else {
              setSymbolError(true);
            }
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={c.ticker}
            className="h-11"
          />
          <Button type="submit" className="h-11">
            {c.calc}
          </Button>
        </form>
      )}
      {symbolError && (
        <p role="alert" className="text-sm text-destructive">
          {c.invalidTicker}
        </p>
      )}
      {!activeSymbol ? null : q.isLoading ? (
        <p className="text-sm text-muted-foreground">{c.loading}</p>
      ) : q.isError ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 text-sm text-destructive"
        >
          <span>{c.providerError}</span>
          <Button type="button" onClick={() => void q.refetch()}>
            {c.retry}
          </Button>
        </div>
      ) : !d ? (
        <p role="status" className="text-sm text-muted-foreground">
          {c.noData}
        </p>
      ) : d.quoteType?.toUpperCase() !== "EQUITY" ? (
        <p role="status" className="text-sm text-muted-foreground">
          {c.equityOnly}
        </p>
      ) : !sameCurrency ? (
        <p role="alert" className="text-sm text-destructive">
          {c.currencyMismatch}
        </p>
      ) : !hasUsableDcfFundamentals(d) ? (
        <p role="status" className="text-sm text-muted-foreground">
          {c.incompleteData}
        </p>
      ) : !analysis ? (
        <p className="text-sm text-muted-foreground">{c.na}</p>
      ) : (
        <>
          <div>
            <div className="text-sm text-muted-foreground">
              {d.name} · {c.intrinsic}
            </div>
            <div className="numeric-display text-4xl font-bold">
              {analysis.valuePerShare > 0 ? money(analysis.valuePerShare) : "—"}
            </div>
            {analysis.valuePerShare <= 0 ? (
              <p role="status" className="mt-1 text-sm text-muted-foreground">
                {c.noPositiveValue}
              </p>
            ) : null}
            {gap != null && hasFreshQuote && analysis.valuePerShare > 0 && (
              <div
                className={`mt-1 text-sm font-semibold ${gap >= 0 ? "text-success" : "text-destructive"}`}
              >
                {gap >= 0 ? c.under : c.over} {pctFmt(Math.abs(gap))}
              </div>
            )}
          </div>
          {hasFreshQuote && hasValidQuote(d) && analysis.valuePerShare > 0 ? (
            <div className="grid gap-2 text-sm">
              <div
                className="flex h-9 items-center justify-between rounded-md bg-primary px-3 text-primary-foreground"
                style={{ width: `${Math.max(30, (analysis.valuePerShare / max) * 100)}%` }}
              >
                <span>{c.intrinsic}</span>
                <span>{money(analysis.valuePerShare)}</span>
              </div>
              <div
                className="flex h-9 items-center justify-between rounded-md bg-muted px-3"
                style={{ width: `${Math.max(30, (d.price / max) * 100)}%` }}
              >
                <span>{c.price}</span>
                <span>{money(d.price)}</span>
              </div>
            </div>
          ) : hasStaleQuote ? (
            <p role="status" className="text-sm text-muted-foreground">
              {c.stalePrice}
            </p>
          ) : (
            <p role="status" className="text-sm text-muted-foreground">
              {c.missingPriceTime}
            </p>
          )}
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
            {(["bear", "base", "bull"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setCustom(null);
                }}
                className={`rounded-md py-2 text-xs font-semibold sm:text-sm ${!custom && mode === m ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              >
                {c[m]}
              </button>
            ))}
          </div>
          {(
            [
              ["growth", -0.05, 0.3],
              ["discount", 0.05, 0.15],
              ["terminal", 0, 0.04],
            ] as const
          ).map(([k, min, mx]) => (
            <label key={k} className="grid gap-1 text-sm">
              <span className="flex justify-between">
                <span title={c.sliderHelp[k]}>{c[k]}</span>
                <span className="font-semibold">{pctFmt(a[k])}</span>
              </span>
              <input
                type="range"
                min={min}
                max={mx}
                step={0.005}
                value={a[k]}
                className="h-6 accent-primary"
                onChange={(e) => setCustom({ ...a, [k]: Number(e.target.value) })}
                aria-label={c[k]}
              />
              <span className="text-xs leading-relaxed text-muted-foreground">
                {c.sliderHelp[k]}
              </span>
            </label>
          ))}
          <div className="grid gap-1 rounded-lg border border-border p-3 text-xs text-muted-foreground">
            <strong className="text-sm text-foreground">{c.assumptions}</strong>
            <span>{hasRevenueGrowth ? c.revenueProxy : c.defaultGrowth}</span>
            <span>{c.dataSource}</span>
            <span>
              {c.priceAsOf}: {dateLabel(d.priceAsOf, c.unknownDate)}
            </span>
            <span>
              {c.fetchedAt}: {dateLabel(d.fetchedAt, c.unknownDate)}
            </span>
            <span>
              {c.fcfLabel}: {compactMoney(d.fcf)}
            </span>
            <span>
              {c.fcfPeriod}: {periodDateLabel(d.fcfPeriodEnd)}
            </span>
            <span>
              {c.operatingCashFlow}: {compactMoney(d.operatingCashFlow)}
            </span>
            <span>
              {c.capitalExpenditure}: {compactMoney(d.capitalExpenditure)}
            </span>
            <span>{c.fcfDefinition}</span>
            <span>
              {c.cashLabel}: {compactMoney(d.cash)}
            </span>
            <span>
              {c.debtLabel}: {compactMoney(d.debt)}
            </span>
            <span>
              {c.sharesLabel}: {compactNumber(d.shares)}
            </span>
            <span>
              {c.terminalShare}: {pctFmt(analysis.terminalValueShare)}
            </span>
            {analysis.terminalValueShare > 0.75 && <span role="status">{c.terminalWarning}</span>}
          </div>
          <section aria-label={c.sensitivity} className="grid gap-2">
            <h3 className="text-sm font-semibold">{c.sensitivity}</h3>
            <p className="text-xs text-muted-foreground">
              {c.discountAxis}: {discountValues.map(pctFmt).join(" · ")}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[300px] border-collapse text-right text-xs">
                <caption className="sr-only">{c.sensitivity}</caption>
                <thead>
                  <tr>
                    <th scope="col" className="p-2 text-left">
                      {c.growthAxis}
                    </th>
                    {discountValues.map((discount) => (
                      <th scope="col" key={discount} className="p-2">
                        {pctFmt(discount)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {growthValues.map((growth) => (
                    <tr key={growth} className="border-t border-border">
                      <th scope="row" className="p-2 text-left font-medium">
                        {pctFmt(growth)}
                      </th>
                      {discountValues.map((discount) => {
                        const result = dcfValue({
                          fcf: d.fcf,
                          cash: d.cash,
                          debt: d.debt,
                          shares: d.shares,
                          growth,
                          discount,
                          terminal: a.terminal,
                        });
                        return (
                          <td
                            key={discount}
                            className={`p-2 tabular-nums ${
                              growth === a.growth && discount === a.discount
                                ? "bg-primary/10 font-semibold text-foreground"
                                : ""
                            }`}
                          >
                            {result != null && result > 0 ? money(result) : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <p className="text-sm text-muted-foreground">{c.explain(pctFmt(a.growth), d.name)}</p>
          <p className="text-xs text-muted-foreground">{c.disclaimer}</p>
        </>
      )}
    </div>
  );
}
