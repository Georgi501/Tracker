import { renderAssetOgSvg, renderSnapshotOgSvg } from "@/lib/og-svg";
import { createFileRoute } from "@tanstack/react-router";

export function handleOgRequest(request: Request): Response {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const svg =
    type === "snapshot"
      ? renderSnapshotOgSvg({ weights: url.searchParams.get("weights") })
      : renderAssetOgSvg({
          symbol: url.searchParams.get("symbol"),
          name: url.searchParams.get("name"),
          sector: url.searchParams.get("sector"),
        });

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export const Route = createFileRoute("/api/og")({
  server: {
    handlers: {
      GET: ({ request }) => handleOgRequest(request),
    },
  },
});
