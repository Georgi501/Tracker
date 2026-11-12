import { AuthForm } from "@/components/AuthForm";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { title: "Sign in — CapiSpot Portfolio Tracker" },
      {
        name: "description",
        content:
          "Create a free CapiSpot account or sign in to track stocks, ETFs and crypto, import broker CSV files and follow dividends in one place.",
      },
      { property: "og:title", content: "Sign in — CapiSpot" },
      {
        property: "og:description",
        content: "Free portfolio tracking with market quotes and broker CSV import.",
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
