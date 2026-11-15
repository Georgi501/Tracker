import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const tables = [
  "assets",
  "transactions",
  "brokers",
  "broker_transfers",
  "corporate_actions",
  "asset_valuations",
] as const;
type Snapshot = { [K in (typeof tables)[number]]: Database["public"]["Tables"][K]["Row"][] };

/** Never fall back to live pages: independent requests cannot establish consistency. */
export async function readPortfolioSnapshot(
  client: Pick<SupabaseClient<Database>, "rpc">,
): Promise<Snapshot> {
  const { data, error } = await client.rpc("portfolio_snapshot");
  if (error) throw new Error(`Portfolio snapshot unavailable: ${error.message}`);
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new Error("Invalid portfolio snapshot");
  for (const table of tables) {
    const rows = data[table];
    if (!Array.isArray(rows)) throw new Error(`Incomplete portfolio snapshot: ${table}`);
    const ids = new Set<string>();
    for (const row of rows) {
      if (
        !row ||
        typeof row !== "object" ||
        Array.isArray(row) ||
        typeof row["id"] !== "string" ||
        ids.has(row["id"])
      )
        throw new Error(`Invalid portfolio snapshot rows: ${table}`);
      ids.add(row["id"]);
    }
  }
  return data as unknown as Snapshot;
}
