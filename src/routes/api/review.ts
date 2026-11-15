import { userClient } from "@/integrations/supabase/user-client.server";
import { buildReviewPortfolioFacts, loadValuedPortfolio } from "@/lib/ai-portfolio.server";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const LANG_NAMES = {
  en: "English",
  bg: "Bulgarian",
  de: "German",
  es: "Spanish",
  it: "Italian",
} as const;
const Body = z.object({ lang: z.enum(["en", "bg", "de", "es", "it"]) });

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

        let summary;
        try {
          summary = await loadValuedPortfolio(sb);
        } catch {
          return new Response("Portfolio unavailable", { status: 503 });
        }
        if (!summary.holdings.length) {
          return new Response("No portfolio data yet", { status: 404 });
        }
        const facts = buildReviewPortfolioFacts(summary);

        const { getOpenAIModel, getOpenAIProviderOptions } = await import("@/lib/ai/openai.server");
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
          providerOptions: getOpenAIProviderOptions(),
        });
        return result.toTextStreamResponse();
      },
    },
  },
});
