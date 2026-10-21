import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const LANG_NAMES = { en: "English", bg: "Bulgarian", de: "German", es: "Spanish", it: "Italian" } as const;
const Body = z.object({
  symbol: z.string().regex(/^[A-Za-z0-9.^:=_-]{1,20}$/),
  thesis: z.string().trim().min(10).max(3000),
  lang: z.enum(["en", "bg", "de", "es", "it"]),
});

function userClient(token: string) {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` }, fetch: (input, init) => { const h = new Headers(init?.headers); h.set("apikey", key); return fetch(input, { ...init, headers: h }); } },
  });
}

/** Pro-only: real Yahoo company data + user's thesis → streamed company summary and verification questions. */
export const Route = createFileRoute("/api/thesis")({
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
        const { symbol, thesis, lang } = parsed.data;

        const { yahooClient } = await import("@/lib/prices.server");
        const s = await yahooClient().quoteSummary(symbol, { modules: ["assetProfile", "price", "financialData", "defaultKeyStatistics", "summaryDetail"] }).catch(() => null);
        if (!s?.price) return new Response("No company data for this ticker", { status: 404 });
        const f = s.financialData, k = s.defaultKeyStatistics, d = s.summaryDetail, a = s.assetProfile;
        const facts = {
          symbol: symbol.toUpperCase(), name: s.price.longName ?? s.price.shortName, currency: s.price.currency,
          price: s.price.regularMarketPrice, marketCap: s.price.marketCap, sector: a?.sector, industry: a?.industry, country: a?.country,
          business: a?.longBusinessSummary?.slice(0, 2500), trailingPE: d?.trailingPE, forwardPE: d?.forwardPE, beta: d?.beta,
          dividendYield: d?.dividendYield, revenue: f?.totalRevenue, revenueGrowth: f?.revenueGrowth, earningsGrowth: f?.earningsGrowth,
          grossMargin: f?.grossMargins, operatingMargin: f?.operatingMargins, profitMargin: f?.profitMargins, freeCashflow: f?.freeCashflow,
          totalCash: f?.totalCash, totalDebt: f?.totalDebt, debtToEquity: f?.debtToEquity, returnOnEquity: f?.returnOnEquity,
          analystTarget: f?.targetMeanPrice, recommendation: f?.recommendationKey, sharesOutstanding: k?.sharesOutstanding,
          asOf: new Date().toISOString().slice(0, 10),
        };

        const { getOpenAIModel } = await import("@/lib/ai/openai.server");
        const model = getOpenAIModel();
        if (!model) return new Response("AI is not configured", { status: 500 });
        const { streamText } = await import("ai");
        const result = streamText({
          model,
          system: `You help an investor stress-test their investment thesis. Use ONLY the company data JSON provided; never invent numbers. If a figure is missing (null), say it is unavailable. Write in ${LANG_NAMES[lang]}, concise markdown, with these sections:
1. Company summary (what it does, scale, key financials from the data)
2. How the thesis relates to the data (supporting points / tension points)
3. Verification questions (8-10 concrete questions the investor should answer, each with what data or document to check)
4. Key risks to watch
End with one line saying this is educational, not financial advice.

COMPANY DATA (JSON):
${JSON.stringify(facts)}`,
          prompt: `My investment thesis for ${facts.symbol}:\n${thesis}`,
          abortSignal: request.signal,
          providerOptions: { openai: { reasoningEffort: "medium", reasoningSummary: "auto", store: false } },
        });
        return result.toTextStreamResponse();
      },
    },
  },
});
