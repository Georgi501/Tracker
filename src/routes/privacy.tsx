import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [
    { title: "Privacy Policy — Dividend Drift" },
    { name: "description", content: "What data Dividend Drift stores, why, and your GDPR rights." },
    { property: "og:title", content: "Privacy Policy — Dividend Drift" },
    { property: "og:description", content: "What data Dividend Drift stores, why, and your GDPR rights." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <LegalPage doc="privacy" />,
});
