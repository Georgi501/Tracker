# SEO next tasks after the Trading 212 guide

The published `/trading212-import` change is already in main at ddd47d3. It is not part of these new product review branches.

The guide has the broker-specific early CTA `/import-demo?broker=trading212`, verified server title/description/H1/canonical, more concrete export/import instructions, duplicate/unsupported-row guidance and product-aligned Free/Pro wording. The copy does not promise an arbitrary checkbox for excluding fresh CSV rows: correcting and reuploading the CSV is the current path.

## Remaining priorities

1. Preserve broker context across sample → registration → first import, and improve the mobile import preview.
2. Improve the IBKR export guide with exact supported Activity Statement CSV settings, separately from Pro Flex/API instructions.
3. Review HTTP/host/case canonical variants, unknown-symbol soft-404 behavior, robots/sitemap consistency and public SSR for Brokers/assets without exposing account/Pro data.
4. Add reliable consent-aware landing attribution, confirmed signup and first successful import measurement; keep verified paid cohorts separate from Free, sandbox and checkout clicks.
5. Introduce real localized URLs and translated SSR only after content is complete.

The audit had no Google Search Console access. Query demand, positions and CTR priorities must not be presented as measured GSC results. Obtain exports by page/query/date/device/country plus indexing/canonical information, then compare a 30-day baseline with registrations and successful imports. Interpret CTR at comparable positions.

## Localization proposal — not implemented

Keep existing English URLs, for example `/trading212-import`. Add `/bg/`, `/de/`, `/es/`, `/it/` equivalents only when page content, navigation, metadata and CTA destinations are translated and checked. Each published locale needs its own canonical and reciprocal hreflang links only to actual equivalent published pages. Include appropriate x-default handling and sitemap entries.

The current guide keeps English server metadata/canonical; BG visible content follows the client preference and DE/ES/IT retain the existing English guide fallback. This is not full multilingual SEO. Do not add invented language alternates for unimplemented routes or remove portfolio mount guards to make public SEO work.

These are proposals for review, not authorization to modify routes, analytics, account flows or deployment settings in this transfer task.
