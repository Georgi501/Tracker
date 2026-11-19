import { resolveAssetCountries } from "@/lib/asset-countries.server";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const MAX_QUERY_CHARS = 512;
const SYMBOL_REGEX = /^[A-Z0-9.^:=_-]{1,20}$/;
const symbolsSchema = z.array(z.string().regex(SYMBOL_REGEX)).min(1).max(30);

/**
 * Hardened company country endpoint. Validates and deduplicates symbols strictly, blocks arbitrary URLs,
 * and returns a safe disabled response while no authorized external equity-country feed is configured.
 */
export async function handleAssetCountriesRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const raw = url.searchParams.get("symbols") ?? "";
  if (raw.length > MAX_QUERY_CHARS) {
    return Response.json({ error: "Symbols query too long" }, { status: 400 });
  }

  const normalizedUnique = [
    ...new Set(
      raw
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    ),
  ];

  const parsed = symbolsSchema.safeParse(normalizedUnique);
  if (!parsed.success) {
    return Response.json({ error: "Invalid symbols query parameter" }, { status: 400 });
  }

  const { countries, rateLimited, providerDisabled } = await resolveAssetCountries(parsed.data);
  if (rateLimited && Object.keys(countries).length === 0) {
    return Response.json(
      { error: "Upstream rate limit exceeded", countries: {} },
      {
        status: 429,
        headers: {
          "Retry-After": "60",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return new Response(
    JSON.stringify({
      countries,
      ...(rateLimited ? { rateLimited: true } : {}),
      ...(providerDisabled ? { disabled: true } : {}),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control":
          rateLimited || providerDisabled ? "no-store" : "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}

export const Route = createFileRoute("/api/public/asset-countries")({
  server: {
    handlers: {
      GET: ({ request }) => handleAssetCountriesRequest(request),
    },
  },
});
