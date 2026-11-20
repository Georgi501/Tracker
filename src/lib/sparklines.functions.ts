import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { mapInBatches } from "./history";
import { resolveAssetIdentity, validateQuoteIdentity } from "./instrument-identity";

/** Last ~30 days of real provider closes per symbol; symbols without data or failing identity check are omitted, never faked. */
export const getSparklines = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        items: z
          .array(
            z.object({
              symbol: z.string().min(1).max(24),
              type: z.enum(["stock", "etf", "crypto"]),
              name: z.string().max(200).optional(),
              isin: z.string().max(16).optional(),
              quoteSymbol: z.string().max(24).optional(),
            }),
          )
          .max(40),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { dailyHistory } = await import("./history.server");
    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - 32 * 86400000).toISOString().slice(0, 10);
    const out: Record<string, number[]> = {};
    await mapInBatches(data.items, 5, async (it) => {
      try {
        const identity = resolveAssetIdentity({
          symbol: it.symbol,
          type: it.type,
          name: it.name,
          isin: it.isin,
          quoteSymbol: it.quoteSymbol,
        });
        if (identity.forbidUsListingCollision) return;
        const h = await dailyHistory(identity.quoteSymbol, start, end, identity.effectiveType);
        const validation = validateQuoteIdentity(identity, {
          currency: h.currency,
          exchangeName: h.exchangeName,
          fullExchangeName: h.fullExchangeName,
          instrumentType: h.instrumentType,
          longName: h.longName,
          shortName: h.shortName,
        });
        if (!validation.ok) return;
        if (h.prices.length >= 5) out[it.symbol] = h.prices.map((p) => p.close);
      } catch {
        /* no data for this symbol */
      }
    });
    return out;
  });
