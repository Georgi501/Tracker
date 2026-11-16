import { COMPANY_SUGGESTIONS } from "@/lib/company-suggestions";
import { SUPPORTED_ETF_EXPOSURE_PROFILES } from "@/lib/etf-overlap";
import { escapeXml } from "@/lib/og-svg";
import { createFileRoute } from "@tanstack/react-router";

const SITE_ORIGIN = "https://capispot.com";

export const PUBLIC_SITEMAP_PATHS: readonly string[] = [
  "/",
  "/features",
  "/pricing",
  "/demo",
  "/markets",
  "/compare",
  "/terms",
  "/privacy",
  "/refund",
  "/disclaimer",
  "/policies/ai-acceptable-use.html",
  "/market/sp500",
  "/market/nasdaq-100",
  "/market/dow-jones",
  "/market/gold",
  "/market/silver",
  "/market/eur-usd",
  "/fifo-guide",
  "/trading212-import",
  "/capital-gains-tax",
  "/ibkr-import",
  "/dividend-tracker",
  "/average-cost",
  "/etf-vs-stocks",
  "/etf-overlap",
  "/portfolio-in-eur",
  "/csv-import",
  "/revolut-import",
];

export function buildSitemapUrls(origin = SITE_ORIGIN): string[] {
  const base = origin.replace(/\/+$/, "");
  const assetSymbols = new Set<string>([
    ...COMPANY_SUGGESTIONS.map((c) => c.symbol),
    ...Object.keys(SUPPORTED_ETF_EXPOSURE_PROFILES),
  ]);
  const assetPaths = [...assetSymbols].map((symbol) => `/asset/${encodeURIComponent(symbol)}`);
  return [...PUBLIC_SITEMAP_PATHS, ...assetPaths].map((path) => `${base}${path}`);
}

export function renderSitemapXml(origin = SITE_ORIGIN): string {
  const urls = buildSitemapUrls(origin);
  const entries = urls.map((loc) => `  <url><loc>${escapeXml(loc)}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

export function handleSitemapRequest(): Response {
  return new Response(renderSitemapXml(SITE_ORIGIN), {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => handleSitemapRequest(),
    },
  },
});
