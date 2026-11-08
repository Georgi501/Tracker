import type { LiveFx } from "./live-fx";

type Persistence = {
  read: () => Promise<LiveFx | null>;
  write: (fx: LiveFx) => Promise<LiveFx>;
};

export function createLiveFxCache(
  load: () => Promise<{ price: number; currency: string; at: string; source: string } | null>,
  now: () => number = Date.now,
  persistence?: Persistence,
) {
  let value: LiveFx | null = null;
  let checkedAt: number | null = null;
  let pending: Promise<LiveFx | null> | null = null;
  return async (): Promise<LiveFx | null> => {
    if (checkedAt !== null && now() - checkedAt < 5 * 60_000) return value;
    if (pending) return pending;
    pending = (async () => {
      let quote: Awaited<ReturnType<typeof load>>;
      try {
        quote = await load();
      } catch (error) {
        console.error("Unable to refresh EUR/USD quote", error);
        quote = null;
      }
      if (
        quote &&
        quote.currency === "USD" &&
        Number.isFinite(quote.price) &&
        quote.price > 0 &&
        Number.isFinite(Date.parse(quote.at))
      ) {
        const next: LiveFx = {
          eurPerUsd: 1 / quote.price,
          at: quote.at,
          source: quote.source,
          providerUnavailable: false,
        };
        if (!value || Date.parse(next.at) >= Date.parse(value.at)) value = next;
        if (persistence) {
          try {
            const stored = await persistence.write(value);
            if (Date.parse(stored.at) > Date.parse(value.at)) value = stored;
          } catch (error) {
            console.error("Unable to persist EUR/USD quote", error);
          }
        }
      } else {
        if (persistence) {
          try {
            const stored = await persistence.read();
            if (stored && (!value || Date.parse(stored.at) > Date.parse(value.at))) value = stored;
          } catch (error) {
            console.error("Unable to read persisted EUR/USD quote", error);
          }
        }
        if (value) value = { ...value, providerUnavailable: true };
      }
      checkedAt = now();
      return value;
    })();
    try {
      return await pending;
    } finally {
      pending = null;
    }
  };
}
