export interface CountryResolutionResult {
  countries: Record<string, string | null>;
  rateLimited: boolean;
  providerDisabled?: boolean;
}

/**
 * Conservative release fallback for public/runtime equity country resolution:
 * External Yahoo Finance `assetProfile.country` redistribution lacks confirmed commercial SaaS rights,
 * so outbound provider lookups remain disabled until an authorized market-data feed is configured.
 */
export async function resolveAssetCountries(
  _symbols: readonly string[],
): Promise<CountryResolutionResult> {
  return {
    countries: {},
    rateLimited: false,
    providerDisabled: true,
  };
}
