import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [
    { title: "Privacy Policy — Capispot" },
    { name: "description", content: "What data Capispot stores, why, and your GDPR rights." },
    { property: "og:title", content: "Privacy Policy — Capispot" },
    { property: "og:description", content: "What data Capispot stores, why, and your GDPR rights." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <LegalPage doc="privacy" />,
});
