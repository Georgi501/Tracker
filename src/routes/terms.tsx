import { LegalPage } from "@/components/LegalPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — CapiSpot" },
      {
        name: "description",
        content: "The terms for using the CapiSpot portfolio tracker and Pro subscription.",
      },
      { property: "og:title", content: "Terms of Service — CapiSpot" },
      {
        property: "og:description",
        content: "The terms for using the CapiSpot portfolio tracker and Pro subscription.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <LegalPage doc="terms" />,
});
