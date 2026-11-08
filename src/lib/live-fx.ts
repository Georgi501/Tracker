import { languageLocale, type Lang } from "./i18n";
import type { Currency } from "./portfolio";

export interface LiveFx {
  eurPerUsd: number;
  at: string;
  source: string;
  providerUnavailable: boolean;
}

const fxMarketClock = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  hour: "numeric",
  hourCycle: "h23",
});

// The FX week closes Friday at 17:00 New York time and reopens Sunday at 17:00.
export function isFxStale(at: string, now = Date.now()): boolean {
  const start = Date.parse(at);
  if (!Number.isFinite(start) || start > now) return true;
  let age = 0;
  for (let cursor = start; cursor < now && age <= 48 * 3600000;) {
    const date = new Date(cursor);
    const nextHour = Math.min(now, Math.floor(cursor / 3600000 + 1) * 3600000);
    const parts = fxMarketClock.formatToParts(date);
    const day = parts.find((part) => part.type === "weekday")?.value;
    const hour = Number(parts.find((part) => part.type === "hour")?.value);
    if (!(day === "Sat" || (day === "Fri" && hour >= 17) || (day === "Sun" && hour < 17))) {
      age += nextHour - cursor;
    }
    cursor = nextHour;
  }
  return age > 48 * 3600000;
}

export function formatUsdAmount(
  usd: number,
  currency: Currency,
  lang: Lang,
  eurPerUsd: number | null,
  opts?: { sign?: boolean; compact?: boolean },
): string {
  const rate = currency === "USD" ? 1 : eurPerUsd;
  if (!Number.isFinite(usd) || !rate || !Number.isFinite(rate) || rate <= 0) return "—";
  const value = usd * rate;
  const formatted = new Intl.NumberFormat(languageLocale(lang), {
    style: "currency",
    currency,
    notation: opts?.compact ? "compact" : "standard",
    maximumFractionDigits: opts?.compact ? 1 : 2,
  }).format(value);
  return opts?.sign && value > 0 ? `+${formatted}` : formatted;
}

export function currentUsdPrice(
  asset: { price: number; quoteCurrency?: string; quoteNativePrice?: number },
  fx: LiveFx | null,
): number {
  if (asset.quoteCurrency !== "EUR" || !asset.quoteNativePrice) return asset.price;
  return fx && fx.eurPerUsd > 0 ? asset.quoteNativePrice / fx.eurPerUsd : Number.NaN;
}
