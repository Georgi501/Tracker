import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const LANG_NAMES = { en: "English", bg: "Bulgarian", de: "German", es: "Spanish", it: "Italian" } as const;
const Body = z.object({ lang: z.enum(["en", "bg", "de", "es", "it"]) });

function userClient(token: string) {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` }, fetch: (input, init) => { const h = new Headers(init?.headers); h.set("apikey", key); return fetch(input, { ...init, headers: h }); } },
  });
}

/** Pro-only: streamed AI review of the caller's own portfolio (loaded via RLS, valued with real quotes). */
export const Route = createFileRoute("/api/review")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });
        const sb = userClient(token);
        const { data: u } = await sb.auth.getUser(token);
        if (!u.user) return new Response("Unauthorized", { status: 401 });
        const { data: pro } = await sb.rpc("is_pro", { _user_id: u.user.id });
        if (!pro) return new Response("Pro plan required", { status: 403 });
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Invalid input", { status: 400 });
        const { lang } = parsed.data;

        const [{ data: assets }, { data: txs }] = await Promise.all([sb.from("assets").select("*"), sb.from("transactions").select("*")]);
        if (!assets?.length || !txs?.length) return new Response("No portfolio data yet", { status: 404 });
        const pos = new Map<string, { qty: number; cost: number }>();
        for (const t of [...txs].sort((a, b) => String(a.date).localeCompare(String(b.date)))) {
          if (t.kind === "dividend") continue;
          const p = pos.get(t.asset_id) ?? { qty: 0, cost: 0 };
          if (t.kind === "buy") { p.qty += Number(t.quantity); p.cost += Number(t.quantity) * Number(t.price); }
          else if (p.qty > 0) { const avg = p.cost / p.qty; p.qty -= Number(t.quantity); p.cost -= avg * Number(t.quantity); }
          pos.set(t.asset_id, p);
        }
        const held = assets.filter((a) => (pos.get(a.id)?.qty ?? 0) > 1e-9);
        const { fetchLiveQuote } = await import("@/lib/prices.server");
        const quotes = await Promise.all(held.map((a) => fetchLiveQuote(a.symbol, a.type).catch(() => null)));
        const totalCost = held.reduce((s, a) => s + pos.get(a.id)!.cost, 0);
        const rows = held.map((a, i) => {
          const p = pos.get(a.id)!; const q = quotes[i];
          return { symbol: a.symbol, name: a.name, type: a.type, sector: a.sector, region: a.region, quantity: +p.qty.toFixed(6), costUsd: +p.cost.toFixed(2),
            costWeightPct: totalCost > 0 ? +(p.cost / totalCost * 100).toFixed(1) : null,
            livePrice: q?.price ?? null, priceCurrency: q?.currency ?? null, dayChangePct: q?.change ?? null };
        });
        const facts = { asOf: new Date().toISOString().slice(0, 10), totalCostUsd: +totalCost.toFixed(2), transactions: txs.length, note: "weights are by cost basis; livePrice is in priceCurrency", positions: rows };

        const { getOpenAIModel } = await import("@/lib/ai/openai.server");
        const model = getOpenAIModel();
        if (!model) return new Response("AI is not configured", { status: 500 });
        const { streamText } = await import("ai");
        const result = streamText({
          model,
          system: `You review an investor's own portfolio Use ONLY the JSON below; never invent prices, returns or forecasts. null means unavailable — say so. Write in ${LANG_NAMES[lang]}, concise markdown, sections:
1. Snapshot (size, number of positions, largest weights)
2. Concentration & diversification (by position, sector, region, asset type)
3. Risks to review
4. Questions to ask yourself (5-7)
5. Checklist "what to review this week" (max 5 bullets)
No buy/sell recommendations. End with one line: educational information, not financial advice.

PORTFOLIO (JSON):
${JSON.stringify(facts)}`,
          prompt: "Review my portfolio",
          abortSignal: request.signal,
          providerOptions: { openai: { reasoningEffort: "medium", reasoningSummary: "auto", store: false } },
        });
        return result.toTextStreamResponse();
      },
    },
  },
});
