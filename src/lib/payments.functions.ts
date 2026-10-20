import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const resolvePaddlePrice = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ priceId: z.enum(["pro_monthly", "pro_yearly"]), environment: z.enum(["sandbox", "live"]) }).parse(d))
  .handler(async ({ data }) => {
    const { gatewayFetch } = await import("./paddle.server");
    const res = await gatewayFetch(data.environment, `/prices?external_id=${encodeURIComponent(data.priceId)}`);
    const json = (await res.json()) as { data?: { id: string }[] };
    const id = json.data?.[0]?.id;
    if (!id) throw new Error("Price not found");
    return id;
  });
