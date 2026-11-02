import { Clock3 } from "lucide-react";
import { languageLocale, type Lang } from "@/lib/i18n";
import { isQuoteStale } from "@/lib/portfolio";

const COPY: Record<
  Lang,
  {
    asOf: string;
    source: string;
    mayBeDelayed: string;
    stale: string;
    market: Record<"REGULAR" | "PRE" | "POST" | "CLOSED" | "ALWAYS", string>;
  }
> = {
  en: {
    asOf: "Quote as of",
    source: "Yahoo Finance",
    mayBeDelayed: "Provider data may be delayed",
    stale: "Quote is older than 96 hours",
    market: {
      REGULAR: "market open",
      PRE: "pre-market",
      POST: "after-hours",
      CLOSED: "market closed",
      ALWAYS: "24/7 market",
    },
  },
  bg: {
    asOf: "Котировка към",
    source: "Yahoo Finance",
    mayBeDelayed: "Данните от доставчика може да са забавени",
    stale: "Котировката е по-стара от 96 часа",
    market: {
      REGULAR: "пазарът е отворен",
      PRE: "преди отваряне",
      POST: "след затваряне",
      CLOSED: "пазарът е затворен",
      ALWAYS: "пазар 24/7",
    },
  },
  de: {
    asOf: "Kurs vom",
    source: "Yahoo Finance",
    mayBeDelayed: "Anbieterdaten können verzögert sein",
    stale: "Kurs ist älter als 96 Stunden",
    market: {
      REGULAR: "Markt geöffnet",
      PRE: "vorbörslich",
      POST: "nachbörslich",
      CLOSED: "Markt geschlossen",
      ALWAYS: "24/7-Markt",
    },
  },
  es: {
    asOf: "Cotización a las",
    source: "Yahoo Finance",
    mayBeDelayed: "Los datos del proveedor pueden tener retraso",
    stale: "La cotización tiene más de 96 horas",
    market: {
      REGULAR: "mercado abierto",
      PRE: "premercado",
      POST: "posmercado",
      CLOSED: "mercado cerrado",
      ALWAYS: "mercado 24/7",
    },
  },
  it: {
    asOf: "Quotazione alle",
    source: "Yahoo Finance",
    mayBeDelayed: "I dati del fornitore potrebbero essere ritardati",
    stale: "La quotazione ha più di 96 ore",
    market: {
      REGULAR: "mercato aperto",
      PRE: "pre-market",
      POST: "after-hours",
      CLOSED: "mercato chiuso",
      ALWAYS: "mercato 24/7",
    },
  },
};

function sessionKey(state: string | null | undefined) {
  if (!state) return null;
  const normalized = state.toUpperCase();
  if (["REGULAR", "PRE", "PREPRE", "POST", "POSTPOST", "CLOSED"].includes(normalized)) {
    if (normalized === "PREPRE") return "PRE";
    if (normalized === "POSTPOST") return "POST";
    return normalized as "REGULAR" | "PRE" | "POST" | "CLOSED";
  }
  return null;
}

export function QuoteFreshness({
  at,
  lang,
  marketState,
  crypto = false,
  compact = false,
}: {
  at: string | null | undefined;
  lang: Lang;
  marketState?: string | null | undefined;
  crypto?: boolean;
  compact?: boolean;
}) {
  if (!at || !Number.isFinite(Date.parse(at))) return null;
  const copy = COPY[lang];
  const session = crypto ? "ALWAYS" : sessionKey(marketState);
  const timestamp = new Intl.DateTimeFormat(languageLocale(lang), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(at));
  const stale = isQuoteStale(at);
  if (compact)
    return (
      <p
        className="mt-0.5 flex flex-wrap items-center gap-x-1 text-[10px] text-muted-foreground"
        title={`${copy.asOf} ${timestamp} · ${copy.mayBeDelayed}`}
      >
        <Clock3 size={10} aria-hidden />
        <span>{copy.source}</span>
        <span aria-hidden>·</span>
        <time dateTime={at}>{timestamp}</time>
        {stale && (
          <>
            <span aria-hidden>·</span>
            <span className="font-medium text-amber-700 dark:text-amber-300">{copy.stale}</span>
          </>
        )}
      </p>
    );
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
      <Clock3 size={12} aria-hidden />
      {copy.asOf} {timestamp}
      <span aria-hidden>·</span>
      <span>{copy.source}</span>
      {session && (
        <>
          <span aria-hidden>·</span>
          <span>{copy.market[session]}</span>
        </>
      )}
      <span aria-hidden>·</span>
      <span>{copy.mayBeDelayed}</span>
      {stale && (
        <>
          <span aria-hidden>·</span>
          <span className="font-medium text-amber-700 dark:text-amber-300">{copy.stale}</span>
        </>
      )}
    </p>
  );
}
