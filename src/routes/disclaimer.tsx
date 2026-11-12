import { LegalPage } from "@/components/LegalPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({
    meta: [
      { title: "Financial Disclaimer — CapiSpot" },
      { name: "description", content: "CapiSpot is analytics software, not investment advice." },
      { property: "og:title", content: "Financial Disclaimer — CapiSpot" },
      {
        property: "og:description",
        content: "CapiSpot is analytics software, not investment advice.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <LegalPage doc="disclaimer" />,
});
