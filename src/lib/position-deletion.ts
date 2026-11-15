import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

const receiptSchema = z.object({
  operationId: z.string().uuid(),
  assetId: z.string().uuid(),
  state: z.enum(["deleted", "restored", "expired"]),
  symbol: z.string(),
  expiresAt: z.string().datetime({ offset: true }),
  serverNow: z.string().datetime({ offset: true }),
});
export type PositionReceipt = z.infer<typeof receiptSchema>;
export async function changePosition(
  client: Pick<SupabaseClient<Database>, "rpc">,
  assetId: string,
  operationId: string,
  action: "delete" | "restore",
): Promise<PositionReceipt> {
  const { data, error } =
    action === "delete"
      ? await client.rpc("delete_position", { p_asset_id: assetId, p_operation_id: operationId })
      : await client.rpc("restore_position", { p_operation_id: operationId });
  if (error) throw new Error(error.message);
  const receipt = receiptSchema.parse(data);
  if (receipt.assetId !== assetId || receipt.operationId !== operationId)
    throw new Error("Unexpected position receipt");
  return receipt;
}

export async function listPositionDeletions(
  client: Pick<SupabaseClient<Database>, "rpc">,
): Promise<PositionReceipt[]> {
  const { data, error } = await client.rpc("list_position_deletions");
  if (error) throw new Error(error.message);
  return z.array(receiptSchema).parse(data);
}
