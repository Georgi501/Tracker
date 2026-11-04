import { createFileRoute, redirect } from "@tanstack/react-router";

// Old country-specific URL: keep it working for existing links and search results.
export const Route = createFileRoute("/stock-tax-bg")({
  beforeLoad: () => {
    throw redirect({ to: "/capital-gains-tax", statusCode: 301 });
  },
});
