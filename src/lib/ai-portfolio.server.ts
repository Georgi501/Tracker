import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { readPortfolioSnapshot } from "./portfolio-snapshot";
import {
  computeHoldings,
  normalizeTransactionsForSplits,
  type Asset,
  type AssetType,
  type CorporateAction,
  type Holding,
  type Transaction,
} from "./portfolio";
import {
  calculatePortfolioGeographicExposure,
  distributeShareTenths,
  resolveInstrumentGeoProfile,
} from "./geographic-exposure";
import { fetchCryptoQuotes, fetchFx, fetchLiveQuote, type LiveQuote } from "./prices.server";
import { resolveAssetIdentity, validateQuoteIdentity } from "./instrument-identity";

function resolvedRegionSummary(asset: Asset): string {
  const profile = resolveInstrumentGeoProfile(asset);
  const entries = Object.entries(profile.regions)
    .filter(([, weight]) => typeof weight === "number" && weight > 0)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0));
  if (entries.length === 0) return "Unknown";
  if (entries.length === 1) return entries[0]![0];
  return entries
    .map(([region, weight]) => `${region} ${((weight ?? 0) * 100).toFixed(1)}%`)
    .join(", ");
}

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
  sb: Pick<SupabaseClient<Database>, "rpc">,
): Promise<ValuedPortfolioSummary> {
  const snapshot = await readPortfolioSnapshot(sb);
  const assetRows = snapshot.assets ?? [];
  const txRows = [...(snapshot.transactions ?? [])].sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );
  const corporateActions: CorporateAction[] = (snapshot.corporate_actions ?? []).map((action) => ({
    assetId: action.asset_id,
    date: action.event_date,
    numerator: Number(action.numerator),
    denominator: Number(action.denominator),
  }));

  const latestValuationByAsset = new Map<string, { valuation_date: string; price_usd: number }>();
  for (const valuation of snapshot.asset_valuations ?? []) {
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

  const identityByAssetId = new Map(
    assetRows.map((a) => [
      a.id,
      resolveAssetIdentity({
        symbol: a.symbol,
        name: a.name,
        type: a.type as AssetType,
      }),
    ]),
  );

  const heldAssetRows = assetRows.filter((a) => (qtyByAsset.get(a.id) ?? 0) > 0.0001);
  const quotedAssetRows = heldAssetRows.slice(0, 30);

  const cryptoSymbols = quotedAssetRows
    .filter((a) => (identityByAssetId.get(a.id)?.effectiveType ?? a.type) === "crypto")
    .map((a) => identityByAssetId.get(a.id)?.quoteSymbol ?? a.symbol);
  const [cryptoQuotes, stockEtfQuotes] = await Promise.all([
    cryptoSymbols.length
      ? fetchCryptoQuotes(cryptoSymbols).catch(() => ({}) as Record<string, LiveQuote>)
      : Promise.resolve({} as Record<string, LiveQuote>),
    Promise.all(
      quotedAssetRows.map(async (a) => {
        const identity = identityByAssetId.get(a.id)!;
        if (identity.effectiveType !== "stock" && identity.effectiveType !== "etf") {
          return [a.id, null] as const;
        }
        if (identity.forbidUsListingCollision) return [a.id, null] as const;
        const q = await fetchLiveQuote(identity.quoteSymbol, identity.effectiveType).catch(
          () => null,
        );
        if (!q) return [a.id, null] as const;
        const validation = validateQuoteIdentity(identity, {
          providerSymbol: q.providerSymbol ?? identity.quoteSymbol,
          currency: q.currency,
          exchangeName: q.exchangeName,
          fullExchangeName: q.fullExchangeName,
          instrumentType: q.instrumentType,
          longName: q.longName,
          shortName: q.shortName,
        });
        return [a.id, validation.ok ? q : null] as const;
      }),
    ),
  ]);

  const rawQuotesByAssetId = new Map<string, LiveQuote | null>(stockEtfQuotes);
  for (const a of quotedAssetRows) {
    const identity = identityByAssetId.get(a.id);
    if ((identity?.effectiveType ?? a.type) === "crypto") {
      const sym = (identity?.quoteSymbol ?? a.symbol).toUpperCase();
      rawQuotesByAssetId.set(a.id, cryptoQuotes[sym] ?? null);
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
    const identity = identityByAssetId.get(r.id);
    const effectiveType = identity?.effectiveType ?? (r.type as AssetType);
    return {
      id: r.id,
      symbol: r.symbol,
      name: r.name,
      type: effectiveType,
      ...(identity?.isin ? { isin: identity.isin } : {}),
      ...(identity?.quoteSymbol ? { quoteSymbol: identity.quoteSymbol } : {}),
      sector: r.sector,
      region: r.region,
      price:
        effectiveType === "cash"
          ? 1
          : effectiveType === "bond" || effectiveType === "realEstate"
            ? Number(manualValuation?.price_usd ?? r.manual_price ?? Number.NaN)
            : usdQuotePrice,
      change24h:
        effectiveType === "cash" || effectiveType === "bond" || effectiveType === "realEstate"
          ? 0
          : (quote?.change ?? Number.NaN),
      dividendPerShare: Number(r.dividend_per_share ?? 0),
      payMonths: r.pay_months ?? [],
      ...(quote?.currency
        ? { quoteCurrency: quote.currency }
        : effectiveType === "cash" || effectiveType === "bond" || effectiveType === "realEstate"
          ? { quoteCurrency: "USD" }
          : {}),
      ...(quote && Number.isFinite(quote.price)
        ? { quoteNativePrice: quote.price }
        : effectiveType === "cash"
          ? { quoteNativePrice: 1 }
          : (effectiveType === "bond" || effectiveType === "realEstate") &&
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

function formatGeographicExposureSummary(holdings: readonly Holding[]) {
  const geo = calculatePortfolioGeographicExposure(holdings);
  const tenths = distributeShareTenths(geo.rows.map((r) => r.value));
  return geo.rows.map((r, index) => ({
    region: r.region,
    valueUsd: +r.value.toFixed(2),
    weightPct: (tenths[index] ?? 0) / 10,
  }));
}

export function buildAdvisorPortfolioPayload(summary: ValuedPortfolioSummary) {
  const symbolByAssetId = new Map(summary.assets.map((a) => [a.id, a.symbol]));
  return {
    today: new Date().toISOString().slice(0, 10),
    note: "All costs, valuations, and live quote prices are normalized to USD (including split adjustments from corporate_actions, transaction fees in costBasis, and manual valuations for bonds/realEstate); null price/value means quote unavailable.",
    totalValueUsd: +summary.totalValue.toFixed(2),
    totalCostUsd: +summary.totalCost.toFixed(2),
    geographicExposure: formatGeographicExposureSummary(summary.holdings),
    positions: summary.holdings.map((h) => ({
      symbol: h.asset.symbol,
      name: h.asset.name,
      type: h.asset.type,
      sector: h.asset.sector,
      region: resolvedRegionSummary(h.asset),
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
    geographicExposure: formatGeographicExposureSummary(holdings),
    transactions: transactions.length,
    note: "All costs, valuations, and live quote prices are normalized to USD (including split adjustments, transaction fees in costUsd, and manual valuations for bonds/realEstate); null means unavailable.",
    positions: holdings.map((h) => ({
      symbol: h.asset.symbol,
      name: h.asset.name,
      type: h.asset.type,
      sector: h.asset.sector,
      region: resolvedRegionSummary(h.asset),
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
