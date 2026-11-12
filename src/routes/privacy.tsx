import { LegalPage } from "@/components/LegalPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — CapiSpot" },
      { name: "description", content: "What data CapiSpot stores, why, and your GDPR rights." },
      { property: "og:title", content: "Privacy Policy — CapiSpot" },
      {
        property: "og:description",
        content: "What data CapiSpot stores, why, and your GDPR rights.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <LegalPage doc="privacy" />,
});
