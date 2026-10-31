import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { encryptBrokerCredentials, decryptBrokerCredentials } from "./broker-secrets.server";
import type { DirectBroker } from "./brokers.server";

const brokerInput = z.object({ brokerId: z.string().uuid() });

export const brokerConnectionStates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ brokerIds: z.array(z.string().uuid()).max(5) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: connections, error } = await supabaseAdmin
      .from("broker_api_credentials")
      .select("broker_id,provider,last_synced_at")
      .eq("user_id", context.userId)
      .in("broker_id", data.brokerIds);
    if (error) throw new Error("Could not load broker connection status.");
    return connections.map((connection) => ({
      brokerId: connection.broker_id,
      provider: connection.provider,
      lastSyncedAt: connection.last_synced_at,
    }));
  });

export const connectDirectBroker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        brokerId: z.string().uuid(),
        provider: z.enum(["ibkr", "trading212"]),
        credentials: z
          .record(z.string(), z.string())
          .refine((value) => Object.keys(value).length <= 3),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: broker, error: brokerError } = await context.supabase
      .from("brokers")
      .select("id,format")
      .eq("id", data.brokerId)
      .maybeSingle();
    if (brokerError || !broker) throw new Error("Broker connection not found.");
    if (broker.format !== data.provider)
      throw new Error("Selected broker type does not match the direct integration.");
    const { validateBrokerCredentials, fetchDirectBrokerTransactions } =
      await import("./brokers.server");
    const credentials = validateBrokerCredentials(data.provider, data.credentials);
    const rows = await fetchDirectBrokerTransactions(data.provider, credentials);
    const encryptedCredentials = await encryptBrokerCredentials({ ...credentials });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("broker_api_credentials").upsert(
      {
        broker_id: data.brokerId,
        user_id: context.userId,
        provider: data.provider,
        encrypted_credentials: encryptedCredentials,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "broker_id" },
    );
    if (error) throw new Error("Could not securely save the broker connection.");
    return { rows };
  });

export const syncDirectBroker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => brokerInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: broker, error: brokerError } = await context.supabase
      .from("brokers")
      .select("id")
      .eq("id", data.brokerId)
      .maybeSingle();
    if (brokerError || !broker) throw new Error("Broker connection not found.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: connection, error } = await supabaseAdmin
      .from("broker_api_credentials")
      .select("provider,encrypted_credentials")
      .eq("broker_id", data.brokerId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error || !connection) throw new Error("This broker is not connected.");
    if (connection.provider !== "ibkr" && connection.provider !== "trading212")
      throw new Error("Unsupported broker integration.");
    const provider: DirectBroker = connection.provider;
    const credentials = await decryptBrokerCredentials(connection.encrypted_credentials);
    const { fetchDirectBrokerTransactions } = await import("./brokers.server");
    const rows = await fetchDirectBrokerTransactions(provider, credentials);
    const { error: updateError } = await supabaseAdmin
      .from("broker_api_credentials")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("broker_id", data.brokerId)
      .eq("user_id", context.userId);
    if (updateError) throw new Error("Broker data loaded, but sync status could not be saved.");
    return { rows };
  });

export const disconnectDirectBroker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => brokerInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: broker, error: brokerError } = await context.supabase
      .from("brokers")
      .select("id")
      .eq("id", data.brokerId)
      .maybeSingle();
    if (brokerError || !broker) throw new Error("Broker connection not found.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("broker_api_credentials")
      .delete()
      .eq("broker_id", data.brokerId)
      .eq("user_id", context.userId);
    if (error) throw new Error("Could not disconnect broker.");
    return { disconnected: true };
  });
