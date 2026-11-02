import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isValidIsoDate } from "./history";
import { parseStockSplits } from "./corporate-actions";

export const confirmPortfolioSplit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z
      .object({
        assetId: z.string().uuid(),
        date: z.string().refine(isValidIsoDate),
        numerator: z.number().positive().finite(),
        denominator: z.number().positive().finite(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: asset, error: assetError } = await context.supabase
      .from("assets")
      .select("id,symbol,type")
      .eq("id", data.assetId)
      .maybeSingle();
    if (assetError) throw new Error("Could not verify the asset for split review.");
    if (!asset || !["stock", "etf"].includes(asset.type))
      throw new Error("This asset is not eligible for stock split review.");

    const eventTimestamp = Date.parse(`${data.date}T00:00:00Z`);
    const { yahooClient } = await import("./prices.server");
    const chart = await yahooClient().chart(asset.symbol, {
      period1: new Date(eventTimestamp - 86400000),
      period2: new Date(eventTimestamp + 2 * 86400000),
      interval: "1d",
      events: "splits",
    });
    const confirmed = parseStockSplits(chart.events?.splits).some(
      (event) =>
        event.date === data.date &&
        event.numerator === data.numerator &&
        event.denominator === data.denominator,
    );
    if (!confirmed) throw new Error("The market provider no longer confirms this split event.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("corporate_actions").upsert(
      {
        user_id: context.userId,
        asset_id: asset.id,
        event_date: data.date,
        numerator: data.numerator,
        denominator: data.denominator,
        source: "yahoo",
      },
      {
        onConflict: "user_id,asset_id,event_date,numerator,denominator",
        ignoreDuplicates: true,
      },
    );
    if (error) throw new Error("Could not save the confirmed split adjustment.");
    return { confirmed: true };
  });
