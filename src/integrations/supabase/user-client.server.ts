import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const isNewSupabaseApiKey = (apiKey: string) =>
  apiKey.startsWith("sb_publishable_") || apiKey.startsWith("sb_secret_");

export function createSupabaseFetch(apiKey: string, userAccessToken?: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set("apikey", apiKey);

    if (userAccessToken) {
      headers.set("Authorization", `Bearer ${userAccessToken}`);
    } else if (isNewSupabaseApiKey(apiKey)) {
      headers.delete("Authorization");
    }

    return fetch(input, { ...init, headers });
  };
}

export function userClient(token: string) {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_ANON_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  }

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: createSupabaseFetch(key, token),
    },
  });
}
