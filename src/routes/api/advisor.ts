import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const INSTRUCTIONS = `You are Capispot Advisor, an assistant inside a portfolio tracker. Answer questions about the user's own portfolio using ONLY the portfolio data provided below (positions, transactions, live quotes).
Rules:
- Never invent prices, returns, dividends or holdings. If data is missing or marked unavailable, say so.
- Show calculations briefly when giving numbers. Amounts are in USD unless stated.
- Give general educational analysis (diversification, concentration, cost basis, realized/unrealized P/L). This is not personalized financial, tax or legal advice; say so briefly when the user asks what to buy or sell.
- Answer in the same language the user writes in. Use concise markdown.`;

function userClient(token: string) {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => { const h = new Headers(init?.headers); h.set("apikey", key); return fetch(input, { ...init, headers: h }); },
    },
  });
}

async function portfolioContext(sb: ReturnType<typeof userClient>) {
  const [a, t] = await Promise.all([
    sb.from("assets").select("id,symbol,name,type,sector,region"),
    sb.from("transactions").select("asset_id,kind,quantity,price,date").order("date"),
  ]);
  if (a.error || t.error) throw new Error("Portfolio unavailable");
  const { fetchLiveQuote } = await import("@/lib/prices.server");
  const quotes = await Promise.all((a.data ?? []).map(async (x) =>
    x.type === "cash" ? { symbol: x.symbol, price: 1, currency: "USD", change: 0 } : { symbol: x.symbol, ...(await fetchLiveQuote(x.symbol, x.type)) }));
  const qty = new Map<string, number>();
  for (const r of t.data ?? []) if (r.kind !== "dividend") qty.set(r.asset_id, (qty.get(r.asset_id) ?? 0) + (r.kind === "buy" ? 1 : -1) * Number(r.quantity));
  return JSON.stringify({
    today: new Date().toISOString().slice(0, 10),
    note: "Transaction prices are stored in USD. Live quote prices are in the quote currency shown; null price means unavailable.",
    positions: (a.data ?? []).map((x, i) => ({ symbol: x.symbol, name: x.name, type: x.type, sector: x.sector, region: x.region,
      quantity: qty.get(x.id) ?? 0, liveQuote: quotes[i] && "price" in quotes[i]! ? quotes[i] : null })),
    transactions: (t.data ?? []).map((r) => ({ symbol: a.data?.find((x) => x.id === r.asset_id)?.symbol, kind: r.kind, quantity: Number(r.quantity), priceUsd: Number(r.price), date: r.date })),
  });
}

export const Route = createFileRoute("/api/advisor")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });
        const sb = userClient(token);
        const { data: u } = await sb.auth.getUser(token);
        const userId = u.user?.id;
        if (!userId) return new Response("Unauthorized", { status: 401 });
        const { data: pro } = await sb.rpc("is_pro", { _user_id: userId });
        if (!pro) return Response.json({ error: "Pro plan required" }, { status: 403 });

        const body = (await request.json()) as { threadId?: string; messages?: unknown[] };
        const threadId = typeof body.threadId === "string" ? body.threadId : "";
        const { validateUIMessages, convertToModelMessages } = await import("ai");
        let messages;
        try { messages = await validateUIMessages({ messages: body.messages ?? [] }); }
        catch { return new Response("Invalid messages", { status: 400 }); }
        const thread = await sb.from("ai_threads").select("id,title").eq("id", threadId).maybeSingle();
        if (!thread.data) return new Response("Conversation not found", { status: 404 });

        const last = messages.at(-1);
        if (last?.role === "user") {
          const { error } = await sb.from("ai_messages").upsert({ thread_id: threadId, user_id: userId, message_id: last.id, role: "user", parts: last.parts as never }, { onConflict: "thread_id,message_id" });
          if (error) return new Response("Could not save message", { status: 500 });
          const text = last.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim();
          await sb.from("ai_threads").update({ updated_at: new Date().toISOString(), ...(thread.data.title === "New conversation" && text ? { title: text.slice(0, 60) } : {}) }).eq("id", threadId);
        }

        let context: string;
        try { context = await portfolioContext(sb); } catch { return new Response("Portfolio unavailable", { status: 503 }); }

        const { getOpenAIModel } = await import("@/lib/ai/openai.server");
        const model = getOpenAIModel();
        if (!model) return new Response("AI is not configured", { status: 500 });
        const { streamText } = await import("ai");
        const result = streamText({
          model,
          system: `${INSTRUCTIONS}\n\nPORTFOLIO DATA (JSON):\n${context}`,
          messages: await convertToModelMessages(messages),
          abortSignal: request.signal,
          providerOptions: { openai: { reasoningEffort: "medium", reasoningSummary: "auto", store: false } },
        });
        const response = result.toUIMessageStreamResponse({
          originalMessages: messages, sendReasoning: true,
          onError: (e) => { console.error("advisor error", e); const s = (e as { statusCode?: number })?.statusCode; return s === 402 ? "AI credits are exhausted." : s === 429 ? "Too many requests, try again shortly." : "The assistant could not answer right now."; },
          onFinish: async ({ responseMessage }) => {
            const { error } = await sb.from("ai_messages").upsert({ thread_id: threadId, user_id: userId, message_id: responseMessage.id, role: "assistant", parts: responseMessage.parts as never }, { onConflict: "thread_id,message_id" });
            if (error) console.error("Failed to save assistant message", error);
          },
        });
        return response;
      },
    },
  },
});
