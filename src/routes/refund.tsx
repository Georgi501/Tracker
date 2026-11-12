import { LegalPage } from "@/components/LegalPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Refund & Cancellation Policy — CapiSpot" },
      { name: "description", content: "Cancel Pro anytime and get a full refund within 14 days." },
      { property: "og:title", content: "Refund & Cancellation Policy — CapiSpot" },
      {
        property: "og:description",
        content: "Cancel Pro anytime and get a full refund within 14 days.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <LegalPage doc="refund" />,
});
