import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Refund & Cancellation Policy — Capispot" },
      { name: "description", content: "Cancel Pro anytime and get a full refund within 14 days." },
      { property: "og:title", content: "Refund & Cancellation Policy — Capispot" },
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
