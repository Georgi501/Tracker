import { MARKET_ASSETS, searchCatalog } from "./market-search";
import type { Currency } from "./portfolio";
export function nativeCurrency(symbol: string, quoteCurrency?: string): Currency {
  if (quoteCurrency === "EUR" || quoteCurrency === "USD") return quoteCurrency;
  return /\.(DE|F|PA|AS|MI|MC|BR|LS|VI|HE|IR)$/i.test(symbol.trim()) ? "EUR" : "USD";
}

export function resolveAsset(name: string, symbol: string) {
  const n = name.trim(),
    s = symbol.trim().toUpperCase();
  if (!n && !s) return null;
  if (s && n) return { name: n, symbol: s };
  if (s) return { symbol: s, name: MARKET_ASSETS.find((a) => a.symbol === s)?.name ?? s };
  const hit = searchCatalog(n)[0]; // also resolves an ISIN to its UCITS ticker
  return {
    name: hit?.name ?? n,
    symbol: hit?.symbol ?? n.toUpperCase().replace(/\s+/g, "").slice(0, 12),
  };
}
