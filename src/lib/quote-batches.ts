import type { Quote } from "./quotes.functions";
export const QUOTE_BATCH_SIZE = 60;
type Item = { symbol: string; type: string };
type BatchResult = { quotes: Record<string, Quote>; missing: string[] };

/** Bounded requests; a rejected batch must not discard another batch's real quotes. */
export async function fetchPortfolioQuoteBatches(
  items: Item[],
  fetchBatch: (input: { data: { items: Item[] } }) => Promise<BatchResult>,
) {
  const quotes: Record<string, Quote> = {};
  let failed = false;
  for (let offset = 0; offset < items.length; offset += QUOTE_BATCH_SIZE) {
    const batch = items.slice(offset, offset + QUOTE_BATCH_SIZE);
    try {
      const result = await fetchBatch({ data: { items: batch } });
      for (const item of batch) {
        const quote = result.quotes[item.symbol];
        if (
          quote &&
          Number.isFinite(quote.price) &&
          quote.price > 0 &&
          Number.isFinite(Date.parse(quote.at))
        )
          quotes[item.symbol] = quote;
      }
    } catch {
      failed = true;
    }
  }
  return {
    quotes,
    missing: items.filter((item) => !quotes[item.symbol]).map((item) => item.symbol),
    failed,
  };
}
