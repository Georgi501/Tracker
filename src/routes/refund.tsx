import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/refund")({
  head: () => ({ meta: [
    { title: "Refund & Cancellation Policy — Dividend Drift" },
    { name: "description", content: "Cancel Pro anytime and get a full refund within 30 days." },
    { property: "og:title", content: "Refund & Cancellation Policy — Dividend Drift" },
    { property: "og:description", content: "Cancel Pro anytime and get a full refund within 30 days." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <LegalPage doc="refund" />,
});
