export type PublicCacheNamespace = "sec-tickers" | "sec-annual-history" | "market-daily-history";

export interface EdgeCacheLike {
  match(request: Request | string): Promise<Response | undefined>;
  put(request: Request | string, response: Response): Promise<void>;
}

export interface PublicEdgeCache {
  get<T>(namespace: PublicCacheNamespace, key: string): Promise<T | null>;
  set<T>(namespace: PublicCacheNamespace, key: string, value: T, ttlSeconds: number): Promise<void>;
}

const FORBIDDEN_KEY_PATTERN =
  /(@|bearer|token|user|account|portfolio|session|cookie|auth|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

/**
 * Guardrail (AGENTS.md): Only public company/market identifiers may form an Edge Cache key.
 * User IDs, emails, tokens, or portfolio/account identifiers are strictly rejected.
 */
export function buildPublicCacheUrl(namespace: PublicCacheNamespace, key: string): string {
  const trimmed = key.trim();
  if (!trimmed || trimmed.length > 160 || FORBIDDEN_KEY_PATTERN.test(trimmed)) {
    throw new Error(`Refusing to cache non-public or unsafe key in ${namespace}`);
  }
  return `https://edge-cache.capispot.internal/v1/${namespace}/${encodeURIComponent(trimmed)}`;
}

function resolveWorkerDefaultCache(): EdgeCacheLike | null {
  try {
    const globalCaches = (
      globalThis as unknown as {
        caches?: { default?: EdgeCacheLike };
      }
    ).caches;
    if (
      globalCaches?.default &&
      typeof globalCaches.default.match === "function" &&
      typeof globalCaches.default.put === "function"
    ) {
      return globalCaches.default;
    }
    return null;
  } catch {
    return null;
  }
}

export function createPublicEdgeCache(
  resolveCache: () => EdgeCacheLike | null = resolveWorkerDefaultCache,
): PublicEdgeCache {
  return {
    async get<T>(namespace: PublicCacheNamespace, key: string): Promise<T | null> {
      const url = buildPublicCacheUrl(namespace, key);
      const cache = resolveCache();
      if (!cache) return null;
      try {
        const response = await cache.match(new Request(url, { method: "GET" }));
        if (!response || !response.ok) return null;
        return (await response.json()) as T;
      } catch {
        return null;
      }
    },
    async set<T>(
      namespace: PublicCacheNamespace,
      key: string,
      value: T,
      ttlSeconds: number,
    ): Promise<void> {
      if (value == null || !Number.isFinite(ttlSeconds) || ttlSeconds <= 0) return;
      const url = buildPublicCacheUrl(namespace, key);
      const cache = resolveCache();
      if (!cache) return;
      try {
        const maxAge = Math.floor(ttlSeconds);
        const response = new Response(JSON.stringify(value), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge}`,
            "X-CapiSpot-Public-Cache": namespace,
          },
        });
        await cache.put(new Request(url, { method: "GET" }), response);
      } catch {
        // Ignore Edge Cache write failures so public data requests still succeed.
      }
    },
  };
}

export const publicEdgeCache = createPublicEdgeCache();
