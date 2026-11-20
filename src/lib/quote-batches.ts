import type { Quote } from "./quotes.functions";
import type { DailyPrice } from "./history";
import type { QuoteRejectionReason } from "./instrument-identity";
export const QUOTE_BATCH_SIZE = 60;
export type QuoteBatchItem = {
  symbol: string;
  type: string;
  name?: string | undefined;
  isin?: string | undefined;
  quoteSymbol?: string | undefined;
  expectedCurrency?: string | undefined;
};
type BatchResult = {
  quotes: Record<string, Quote>;
  missing: string[];
  diagnostics?: Record<string, QuoteRejectionReason>;
  eurUsdPrices?: DailyPrice[];
};

/** Bounded requests; a rejected batch must not discard another batch's real quotes. */
export async function fetchPortfolioQuoteBatches(
  items: QuoteBatchItem[],
  fetchBatch: (input: {
    data: { items: QuoteBatchItem[]; eurUsdRange?: { start: string; end: string } };
  }) => Promise<BatchResult>,
  eurUsdRange?: { start: string; end: string },
) {
  const quotes: Record<string, Quote> = {};
  const diagnostics: Record<string, QuoteRejectionReason> = {};
  let eurUsdPrices: DailyPrice[] | undefined;
  let failed = false;
  if (!items.length && eurUsdRange) {
    try {
      const result = await fetchBatch({ data: { items: [], eurUsdRange } });
      if (result.eurUsdPrices?.length) eurUsdPrices = result.eurUsdPrices;
    } catch {
      failed = true;
    }
    return { quotes, missing: [], diagnostics, eurUsdPrices, failed };
  }
  for (let offset = 0; offset < items.length; offset += QUOTE_BATCH_SIZE) {
    const batch = items.slice(offset, offset + QUOTE_BATCH_SIZE);
    try {
      const result = await fetchBatch({
        data: {
          items: batch,
          ...(offset === 0 && eurUsdRange ? { eurUsdRange } : {}),
        },
      });
      if (offset === 0 && result.eurUsdPrices?.length) {
        eurUsdPrices = result.eurUsdPrices;
      }
      if (result.diagnostics) {
        for (const [symbol, reason] of Object.entries(result.diagnostics)) {
          diagnostics[symbol] = reason;
        }
      }
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
    diagnostics,
    eurUsdPrices,
    failed,
  };
}
