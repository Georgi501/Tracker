import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({ meta: [
    { title: "Financial Disclaimer — Dividend Drift" },
    { name: "description", content: "Dividend Drift is analytics software, not investment advice." },
    { property: "og:title", content: "Financial Disclaimer — Dividend Drift" },
    { property: "og:description", content: "Dividend Drift is analytics software, not investment advice." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <LegalPage doc="disclaimer" />,
});
