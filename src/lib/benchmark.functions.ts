import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
export const getBenchmarkHistory = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        symbol: z.enum(["^GSPC", "^NDX", "URTH", "^STOXX", "^RUT", "^N225"]),
        start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    if (
      data.start > data.end ||
      Date.parse(data.start) < Date.UTC(1970, 0, 1) ||
      data.end > new Date().toISOString().slice(0, 10)
    )
      throw new Error("Invalid history dates");
    try {
      const { dailyHistory } = await import("./history.server");
      const start = new Date(Date.parse(data.start) - 7 * 86400000).toISOString().slice(0, 10);
      const [index, eur, gbp, jpy] = await Promise.all([
        dailyHistory(data.symbol, start, data.end),
        dailyHistory("EURUSD=X", start, data.end),
        dailyHistory("GBPUSD=X", start, data.end),
        dailyHistory("JPY=X", start, data.end),
      ]);
      return { index, eur: eur.prices, gbp: gbp.prices, jpy: jpy.prices, unavailable: false };
    } catch {
      return { index: null, eur: [], gbp: [], jpy: [], unavailable: true };
    }
  });
