import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Capispot Portfolio Tracker" },
      {
        name: "description",
        content: "Create a free Capispot account or sign in to track your portfolio",
      },
      { property: "og:title", content: "Sign in — Capispot" },
      {
        property: "og:description",
        content: "Free portfolio tracking with live prices and broker CSV import.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <div className="mx-auto max-w-md py-8">
      <AuthForm redirectOnSignIn />
    </div>
  ),
});
