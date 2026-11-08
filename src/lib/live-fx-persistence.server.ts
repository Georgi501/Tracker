import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { LiveFx } from "./live-fx";

type StoredRate = { eur_per_usd: number; quote_at: string; source: string };

function fromRow(row: StoredRate): LiveFx {
  if (
    !(Number.isFinite(row.eur_per_usd) && row.eur_per_usd > 0) ||
    !Number.isFinite(Date.parse(row.quote_at)) ||
    row.source !== "Yahoo Finance"
  ) {
    throw new Error("Stored EUR/USD rate is invalid");
  }
  return {
    eurPerUsd: row.eur_per_usd,
    at: row.quote_at,
    source: row.source,
    providerUnavailable: false,
  };
}

export async function readPersistedFx(): Promise<LiveFx | null> {
  const { data, error } = await supabaseAdmin
    .from("live_exchange_rates")
    .select("eur_per_usd,quote_at,source")
    .eq("pair", "EURUSD")
    .abortSignal(AbortSignal.timeout(3000))
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data) : null;
}

export async function writePersistedFx(fx: LiveFx): Promise<LiveFx> {
  const { data, error } = await supabaseAdmin
    .rpc("save_live_eurusd", {
      rate: fx.eurPerUsd,
      observed_at: fx.at,
      provider: fx.source,
    })
    .abortSignal(AbortSignal.timeout(3000));
  if (error) throw error;
  if (!data[0]) throw new Error("Saving EUR/USD returned no rate");
  return fromRow(data[0]);
}
