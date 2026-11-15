import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  computeHoldings,
  normalizeTransactionsForSplits,
  type Asset,
  type AssetType,
  type CorporateAction,
  type Holding,
  type Transaction,
} from "./portfolio";
import { fetchCryptoQuotes, fetchFx, fetchLiveQuote, type LiveQuote } from "./prices.server";

export interface ValuedPortfolioSummary {
  assets: Asset[];
  transactions: Transaction[];
  normalizedTransactions: Transaction[];
  corporateActions: CorporateAction[];
  holdings: Holding[];
  totalValue: number;
  totalCost: number;
}

export function toUsdQuotePrice(
  quote: LiveQuote | null | undefined,
  eurPerUsd: number | null,
  gbpUsdQuote: LiveQuote | null,
): number {
  if (!quote || !Number.isFinite(quote.price) || quote.price <= 0) return Number.NaN;
  if (quote.currency === "USD") return quote.price;
  if (quote.currency === "EUR") {
    return eurPerUsd && eurPerUsd > 0 ? quote.price / eurPerUsd : Number.NaN;
  }
  if (quote.currency === "GBP") {
    return gbpUsdQuote && gbpUsdQuote.price > 0 ? quote.price * gbpUsdQuote.price : Number.NaN;
  }
  if (quote.currency === "GBX" || quote.currency === "GBp") {
    return gbpUsdQuote && gbpUsdQuote.price > 0
      ? (quote.price * gbpUsdQuote.price) / 100
      : Number.NaN;
  }
  return Number.NaN;
}

export async function loadValuedPortfolio(
  sb: Pick<SupabaseClient<Database>, "from">,
): Promise<ValuedPortfolioSummary> {
  const [assetsRes, txsRes, actionsRes, valuationsRes] = await Promise.all([
    sb
      .from("assets")
      .select(
        "id, symbol, name, type, sector, region, dividend_per_share, pay_months, manual_price",
      ),
    sb
      .from("transactions")
      .select("id, asset_id, broker_id, kind, quantity, price, fee, date")
      .order("date"),
    sb.from("corporate_actions").select("asset_id, event_date, numerator, denominator"),
    sb.from("asset_valuations").select("asset_id, valuation_date, price_usd"),
  ]);

  if (assetsRes.error || txsRes.error || actionsRes.error || valuationsRes.error) {
    throw new Error("Portfolio unavailable");
  }

  const assetRows = assetsRes.data ?? [];
  const txRows = txsRes.data ?? [];
  const corporateActions: CorporateAction[] = (actionsRes.data ?? []).map((action) => ({
    assetId: action.asset_id,
    date: action.event_date,
    numerator: Number(action.numerator),
    denominator: Number(action.denominator),
  }));

  const latestValuationByAsset = new Map<string, { valuation_date: string; price_usd: number }>();
  for (const valuation of valuationsRes.data ?? []) {
    const current = latestValuationByAsset.get(valuation.asset_id);
    if (!current || valuation.valuation_date > current.valuation_date) {
      latestValuationByAsset.set(valuation.asset_id, {
        valuation_date: valuation.valuation_date,
        price_usd: Number(valuation.price_usd),
      });
    }
  }

  const transactions: Transaction[] = txRows.map((r) => ({
    id: r.id,
    assetId: r.asset_id,
    brokerId: r.broker_id,
    kind: r.kind as Transaction["kind"],
    quantity: Number(r.quantity),
    price: Number(r.price),
    fee: Number(r.fee ?? 0),
    date: r.date,
  }));

  const normalizedTransactions = corporateActions.length
    ? normalizeTransactionsForSplits(transactions, corporateActions)
    : transactions;

  if (!assetRows.length || !txRows.length) {
    return {
      assets: [],
      transactions,
      normalizedTransactions,
      corporateActions,
      holdings: [],
      totalValue: 0,
      totalCost: 0,
    };
  }

  // Determine active positions after split normalization so we only request live quotes for held assets.
  const qtyByAsset = new Map<string, number>();
  for (const t of normalizedTransactions) {
    const cur = qtyByAsset.get(t.assetId) ?? 0;
    if (t.kind === "buy") qtyByAsset.set(t.assetId, cur + t.quantity);
    else if (t.kind === "sell") qtyByAsset.set(t.assetId, Math.max(0, cur - t.quantity));
  }

  const heldAssetRows = assetRows.filter((a) => (qtyByAsset.get(a.id) ?? 0) > 0.0001);
  const quotedAssetRows = heldAssetRows.slice(0, 30);

  const cryptoSymbols = quotedAssetRows.filter((a) => a.type === "crypto").map((a) => a.symbol);
  const [cryptoQuotes, stockEtfQuotes] = await Promise.all([
    cryptoSymbols.length
      ? fetchCryptoQuotes(cryptoSymbols).catch(() => ({}) as Record<string, LiveQuote>)
      : Promise.resolve({} as Record<string, LiveQuote>),
    Promise.all(
      quotedAssetRows.map(async (a) => {
        if (a.type !== "stock" && a.type !== "etf") return [a.id, null] as const;
        const q = await fetchLiveQuote(a.symbol, a.type).catch(() => null);
        return [a.id, q] as const;
      }),
    ),
  ]);

  const rawQuotesByAssetId = new Map<string, LiveQuote | null>(stockEtfQuotes);
  for (const a of quotedAssetRows) {
    if (a.type === "crypto") {
      rawQuotesByAssetId.set(a.id, cryptoQuotes[a.symbol.toUpperCase()] ?? null);
    }
  }

  let needsEurFx = false;
  let needsGbpFx = false;
  for (const q of rawQuotesByAssetId.values()) {
    if (!q) continue;
    if (q.currency === "EUR") needsEurFx = true;
    if (q.currency === "GBP" || q.currency === "GBX" || q.currency === "GBp") needsGbpFx = true;
  }

  const [eurPerUsd, gbpUsdQuote] = await Promise.all([
    needsEurFx ? fetchFx().catch(() => null) : Promise.resolve(null),
    needsGbpFx ? fetchLiveQuote("GBPUSD=X", "stock").catch(() => null) : Promise.resolve(null),
  ]);

  const assets: Asset[] = assetRows.map((r) => {
    const manualValuation = latestValuationByAsset.get(r.id);
    const quote = rawQuotesByAssetId.get(r.id) ?? null;
    const usdQuotePrice = toUsdQuotePrice(quote, eurPerUsd, gbpUsdQuote);
    return {
      id: r.id,
      symbol: r.symbol,
      name: r.name,
      type: r.type as AssetType,
      sector: r.sector,
      region: r.region,
      price:
        r.type === "cash"
          ? 1
          : r.type === "bond" || r.type === "realEstate"
            ? Number(manualValuation?.price_usd ?? r.manual_price ?? Number.NaN)
            : usdQuotePrice,
      change24h:
        r.type === "cash" || r.type === "bond" || r.type === "realEstate"
          ? 0
          : (quote?.change ?? Number.NaN),
      dividendPerShare: Number(r.dividend_per_share ?? 0),
      payMonths: r.pay_months ?? [],
      ...(quote?.currency
        ? { quoteCurrency: quote.currency }
        : r.type === "cash" || r.type === "bond" || r.type === "realEstate"
          ? { quoteCurrency: "USD" }
          : {}),
      ...(quote && Number.isFinite(quote.price)
        ? { quoteNativePrice: quote.price }
        : r.type === "cash"
          ? { quoteNativePrice: 1 }
          : (r.type === "bond" || r.type === "realEstate") &&
              Number.isFinite(Number(manualValuation?.price_usd ?? r.manual_price ?? Number.NaN))
            ? {
                quoteNativePrice: Number(
                  manualValuation?.price_usd ?? r.manual_price ?? Number.NaN,
                ),
              }
            : {}),
      ...(quote?.at ? { quoteAt: quote.at } : {}),
    };
  });

  const holdings = computeHoldings(assets, transactions, corporateActions);
  const totalValue = holdings.reduce((sum, h) => sum + (Number.isFinite(h.value) ? h.value : 0), 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.costBasis, 0);

  return {
    assets,
    transactions,
    normalizedTransactions,
    corporateActions,
    holdings,
    totalValue,
    totalCost,
  };
}

export function buildAdvisorPortfolioPayload(summary: ValuedPortfolioSummary) {
  const symbolByAssetId = new Map(summary.assets.map((a) => [a.id, a.symbol]));
  return {
    today: new Date().toISOString().slice(0, 10),
    note: "All costs, valuations, and live quote prices are normalized to USD (including split adjustments from corporate_actions, transaction fees in costBasis, and manual valuations for bonds/realEstate); null price/value means quote unavailable.",
    totalValueUsd: +summary.totalValue.toFixed(2),
    totalCostUsd: +summary.totalCost.toFixed(2),
    positions: summary.holdings.map((h) => ({
      symbol: h.asset.symbol,
      name: h.asset.name,
      type: h.asset.type,
      sector: h.asset.sector,
      region: h.asset.region,
      quantity: +h.quantity.toFixed(6),
      avgCostUsd: +h.avgCost.toFixed(2),
      costBasisUsd: +h.costBasis.toFixed(2),
      priceUsd: Number.isFinite(h.asset.price) ? +h.asset.price.toFixed(2) : null,
      valueUsd: Number.isFinite(h.value) ? +h.value.toFixed(2) : null,
      weightPct:
        summary.totalValue > 0 && Number.isFinite(h.value)
          ? +((h.value / summary.totalValue) * 100).toFixed(1)
          : null,
      pnlUsd: Number.isFinite(h.pnl) ? +h.pnl.toFixed(2) : null,
      pnlPct: Number.isFinite(h.pnlPct) ? +h.pnlPct.toFixed(1) : null,
      liveQuote: Number.isFinite(h.asset.price)
        ? {
            symbol: h.asset.symbol,
            priceUsd: +h.asset.price.toFixed(2),
            nativePrice: h.asset.quoteNativePrice ?? +h.asset.price.toFixed(2),
            currency: h.asset.quoteCurrency ?? "USD",
            change: Number.isFinite(h.asset.change24h) ? h.asset.change24h : null,
          }
        : null,
    })),
    transactions: summary.normalizedTransactions.map((r) => ({
      symbol: symbolByAssetId.get(r.assetId),
      kind: r.kind,
      quantity: +r.quantity.toFixed(6),
      priceUsd: +r.price.toFixed(4),
      feeUsd: +(r.fee ?? 0).toFixed(2),
      date: r.date,
    })),
  };
}

export function buildReviewPortfolioFacts(summary: ValuedPortfolioSummary) {
  const { holdings, totalValue, totalCost, transactions } = summary;
  return {
    asOf: new Date().toISOString().slice(0, 10),
    totalValueUsd: +totalValue.toFixed(2),
    totalCostUsd: +totalCost.toFixed(2),
    transactions: transactions.length,
    note: "All costs, valuations, and live quote prices are normalized to USD (including split adjustments, transaction fees in costUsd, and manual valuations for bonds/realEstate); null means unavailable.",
    positions: holdings.map((h) => ({
      symbol: h.asset.symbol,
      name: h.asset.name,
      type: h.asset.type,
      sector: h.asset.sector,
      region: h.asset.region,
      quantity: +h.quantity.toFixed(6),
      avgCostUsd: +h.avgCost.toFixed(2),
      costUsd: +h.costBasis.toFixed(2),
      costWeightPct: totalCost > 0 ? +((h.costBasis / totalCost) * 100).toFixed(1) : null,
      valueUsd: Number.isFinite(h.value) ? +h.value.toFixed(2) : null,
      weightPct:
        totalValue > 0 && Number.isFinite(h.value)
          ? +((h.value / totalValue) * 100).toFixed(1)
          : null,
      pnlUsd: Number.isFinite(h.pnl) ? +h.pnl.toFixed(2) : null,
      pnlPct: Number.isFinite(h.pnlPct) ? +h.pnlPct.toFixed(1) : null,
      livePriceUsd: Number.isFinite(h.asset.price) ? +h.asset.price.toFixed(2) : null,
      livePrice:
        h.asset.quoteNativePrice ??
        (Number.isFinite(h.asset.price) ? +h.asset.price.toFixed(2) : null),
      priceCurrency: h.asset.quoteCurrency ?? (Number.isFinite(h.asset.price) ? "USD" : null),
      dayChangePct: Number.isFinite(h.asset.change24h) ? h.asset.change24h : null,
    })),
  };
}
