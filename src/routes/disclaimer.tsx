import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({
    meta: [
      { title: "Financial Disclaimer — Capispot" },
      { name: "description", content: "Capispot is analytics software, not investment advice." },
      { property: "og:title", content: "Financial Disclaimer — Capispot" },
      {
        property: "og:description",
        content: "Capispot is analytics software, not investment advice.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <LegalPage doc="disclaimer" />,
});
