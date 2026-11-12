import { isQuoteFresh, isQuoteStale, type Asset } from "./portfolio";
export function quoteCoverage(
  assets: Pick<Asset, "id" | "type" | "price" | "quoteAt">[],
  now = Date.now(),
) {
  let fresh = 0,
    stale = 0,
    missing = 0;
  const market = assets.filter((a) => ["stock", "etf", "crypto"].includes(a.type));
  for (const a of market) {
    if (isQuoteStale(a.quoteAt, now)) stale++;
    else if (Number.isFinite(a.price) && a.price > 0 && isQuoteFresh(a.quoteAt, now)) fresh++;
    else missing++;
  }
  const times = market
    .map((a) => (a.quoteAt ? Date.parse(a.quoteAt) : NaN))
    .filter((t) => Number.isFinite(t) && t <= now + 300000);
  return {
    fresh,
    stale,
    missing,
    manual: assets.length - market.length,
    latest: times.length ? Math.max(...times) : null,
  };
}
