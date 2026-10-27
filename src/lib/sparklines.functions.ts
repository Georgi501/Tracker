import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Last ~30 days of real provider closes per symbol; symbols without data are omitted, never faked. */
export const getSparklines = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        items: z
          .array(
            z.object({
              symbol: z.string().min(1).max(24),
              type: z.enum(["stock", "etf", "crypto"]),
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
    await Promise.all(
      data.items.map(async (it) => {
        try {
          const h = await dailyHistory(it.symbol, start, end, it.type);
          if (h.prices.length >= 5) out[it.symbol] = h.prices.map((p) => p.close);
        } catch {
          /* no data for this symbol */
        }
      }),
    );
    return out;
  });
