import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [
    { title: "Terms of Service — Capispot" },
    { name: "description", content: "The terms for using the Capispot portfolio tracker and Pro subscription." },
    { property: "og:title", content: "Terms of Service — Capispot" },
    { property: "og:description", content: "The terms for using the Capispot portfolio tracker and Pro subscription." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <LegalPage doc="terms" />,
});
