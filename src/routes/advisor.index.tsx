import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/AppShell";
import { AdvisorLayout } from "@/components/AdvisorLayout";
import { usePortfolio } from "@/lib/store";
import { advisorCopy } from "@/lib/advisor-i18n";

export const Route = createFileRoute("/advisor/")({
  head: () => ({
    meta: [
      { title: "AI Advisor — folio. Ask about your portfolio" },
      { name: "description", content: "Pro: ask questions about your positions and transactions and get answers based on your real portfolio data." },
      { property: "og:title", content: "AI Advisor — folio." },
      { property: "og:description", content: "Personalized answers about your own portfolio, for Pro members." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdvisorHome,
});

function AdvisorHome() {
  const p = usePortfolio(); const c = advisorCopy[p.lang];
  return (
    <AdvisorLayout>
      <Card>
        <h1 className="font-display mb-2 text-2xl font-bold">{c.advisor}</h1>
        <p className="text-muted-foreground">{c.disclaimer}</p>
      </Card>
    </AdvisorLayout>
  );
}
