import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const resolvePaddlePrice = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ priceId: z.enum(["pro_monthly", "pro_yearly"]), environment: z.enum(["sandbox", "live"]) }).parse(d))
  .handler(async ({ data }) => {
    const { getPaddleClient } = await import("./paddle.server");
    const prices = getPaddleClient(data.environment).prices.list({ perPage: 100 });
    for await (const price of prices) {
      if (price.status === "active" && price.importMeta?.externalId === data.priceId) {
        return price.id;
      }
    }
    throw new Error(`Active Paddle price not found for ${data.priceId}`);
  });
