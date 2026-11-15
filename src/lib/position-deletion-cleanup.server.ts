import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function purgeExpiredPositionDeletions() {
  let purged = 0;
  // Bound each invocation. The next minute handles any remaining backlog.
  for (let batch = 0; batch < 20; batch++) {
    const { data, error } = await supabaseAdmin.rpc("purge_expired_position_deletions");
    if (error || typeof data !== "number" || !Number.isInteger(data) || data < 0) {
      throw new Error("Expired position recovery cleanup failed");
    }
    purged += data;
    if (data < 500) break;
  }
  console.info("Expired position recovery cleanup", { purged });
  return purged;
}
