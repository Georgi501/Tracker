import { languageLocale, type Lang, type TKey } from "@/lib/i18n";
import { isQuoteFresh, isQuoteStale, type Asset, type Currency } from "@/lib/portfolio";
import { isFxStale, type LiveFx } from "@/lib/live-fx";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";

type Props = {
  asset: Asset;
  quantity: number;
  valueUsd: number;
  currency: Currency;
  liveFx: LiveFx | null;
  displayValue: string;
  lang: Lang;
  t: (key: TKey) => string;
};

function number(value: number, lang: Lang, maximumFractionDigits = 8) {
  return new Intl.NumberFormat(languageLocale(lang), { maximumFractionDigits }).format(value);
}

function money(value: number, currency: Currency, lang: Lang) {
  return new Intl.NumberFormat(languageLocale(lang), {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function HoldingValue({
  asset,
  quantity,
  valueUsd,
  currency,
  liveFx,
  displayValue,
  lang,
  t,
}: Props) {
  const [open, setOpen] = useState(false);
  const nativePrice = asset.quoteNativePrice;
  const quoteCurrency = asset.quoteCurrency;
  const eurPerUsd = liveFx?.eurPerUsd ?? null;
  const hasNativeQuote =
    !!quoteCurrency &&
    typeof nativePrice === "number" &&
    Number.isFinite(nativePrice) &&
    nativePrice > 0;
  const hasUsdPrice = Number.isFinite(asset.price) && asset.price > 0;
  const hasValue = Number.isFinite(quantity) && Number.isFinite(valueUsd) && hasUsdPrice;
  const hasPortfolioFx = currency === "USD" || (eurPerUsd != null && eurPerUsd > 0);
  const missingQuoteFx = quoteCurrency === "EUR" && hasNativeQuote && !liveFx;
  const hasTime = !!asset.quoteAt && Number.isFinite(Date.parse(asset.quoteAt));
  const stale = hasTime && isQuoteStale(asset.quoteAt);
  const fresh = hasTime && isQuoteFresh(asset.quoteAt);
  const sourceKnown = hasTime && ["stock", "etf", "crypto"].includes(asset.type);
  const quoteToUsd = hasNativeQuote && asset.price > 0 ? asset.price / nativePrice : null;
  const formatQuotePrice = () =>
    hasNativeQuote
      ? `${number(nativePrice, lang)} ${quoteCurrency}`
      : hasUsdPrice
        ? money(asset.price, "USD", lang)
        : "—";
  const quoteTime = hasTime
    ? new Intl.DateTimeFormat(languageLocale(lang), {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(asset.quoteAt!))
    : t("holdingValueTimestampMissing");

  return (
    <div className="min-w-0 text-right">
      <p className="numeric-display font-semibold">{displayValue}</p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="ml-auto flex min-h-11 max-w-full items-center justify-end rounded px-1 text-right text-[10px] leading-tight text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("holdingValueExplain")}
          </button>
        </DialogTrigger>
        {open && (
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[85dvh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto rounded-lg text-left"
          >
            <DialogTitle className="pr-6 leading-snug">
              {t("holdingValueExplain")} · {asset.symbol}
            </DialogTitle>
            <dl className="min-w-0 space-y-3 break-words text-sm [&_dd]:min-w-0 [&_dd]:break-all">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">{t("holdingValueQuantity")}</dt>
                <dd className="numeric-display text-right">{number(quantity, lang, 6)}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">{t("holdingValueQuotedPrice")}</dt>
                <dd className="numeric-display text-right">{formatQuotePrice()}</dd>
              </div>
              {hasUsdPrice && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">{t("holdingValueUsdPrice")}</dt>
                  <dd className="numeric-display text-right">{money(asset.price, "USD", lang)}</dd>
                </div>
              )}
              {hasValue && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">{t("holdingValueUsdSubtotal")}</dt>
                  <dd className="numeric-display text-right">{money(valueUsd, "USD", lang)}</dd>
                </div>
              )}
              {hasNativeQuote && quoteCurrency !== "USD" && quoteToUsd != null && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">{t("holdingValueQuoteConversion")}</dt>
                  <dd className="numeric-display text-right">
                    1 {quoteCurrency} = {number(quoteToUsd, lang, 12)} USD
                  </dd>
                </div>
              )}
              {hasNativeQuote && quoteCurrency !== "USD" && quoteToUsd != null && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">{t("holdingValueFxDateSource")}</dt>
                  <dd className="text-right">
                    {quoteCurrency === "EUR" && liveFx
                      ? `${new Intl.DateTimeFormat(languageLocale(lang), { dateStyle: "medium", timeStyle: "short" }).format(new Date(liveFx.at))} · ${liveFx.source}`
                      : asset.quoteFxAt &&
                          asset.quoteFxSource &&
                          Number.isFinite(Date.parse(asset.quoteFxAt))
                        ? `${new Intl.DateTimeFormat(languageLocale(lang), { dateStyle: "medium", timeStyle: "short" }).format(new Date(asset.quoteFxAt))} · ${asset.quoteFxSource}`
                        : t("holdingValueFxMetadataMissing")}
                  </dd>
                </div>
              )}
              {currency === "EUR" && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">{t("holdingValuePortfolioConversion")}</dt>
                  <dd className="numeric-display text-right">
                    {hasPortfolioFx
                      ? `1 USD = ${number(eurPerUsd!, lang, 12)} EUR`
                      : t("holdingValueMissingFx")}
                  </dd>
                </div>
              )}
              {currency === "EUR" && liveFx && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">{t("holdingValueFxDateSource")}</dt>
                  <dd className="text-right">
                    {new Intl.DateTimeFormat(languageLocale(lang), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(liveFx.at))}{" "}
                    · {liveFx.source}
                  </dd>
                </div>
              )}
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">{t("holdingValueQuoteTime")}</dt>
                <dd className="text-right">{quoteTime}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">{t("holdingValueQuoteSource")}</dt>
                <dd className="text-right">
                  {sourceKnown ? "Yahoo Finance" : t("holdingValueSourceMissing")}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">{t("holdingValueQuoteStatus")}</dt>
                <dd className="text-right">
                  {stale
                    ? t("holdingValueStale")
                    : fresh
                      ? t("holdingValueFresh")
                      : t("holdingValueStatusUnknown")}
                </dd>
              </div>
              <div className="border-t border-border pt-2">
                <dt className="text-muted-foreground">{t("holdingValueResult")}</dt>
                <dd className="numeric-display mt-1 text-right font-semibold">{displayValue}</dd>
              </div>
              {[
                !hasValue && !missingQuoteFx ? t("holdingValueMissingPrice") : null,
                missingQuoteFx ? t("holdingValueMissingFx") : null,
                hasValue && !hasNativeQuote ? t("holdingValueNativePriceMissing") : null,
                hasValue && !hasPortfolioFx ? t("holdingValueMissingFx") : null,
                sourceKnown ? t("holdingValueProviderMayDelay") : null,
                liveFx &&
                (currency === "EUR" || quoteCurrency === "EUR") &&
                liveFx.providerUnavailable
                  ? t("holdingValueFxCached")
                  : null,
                (liveFx &&
                  (currency === "EUR" || quoteCurrency === "EUR") &&
                  isFxStale(liveFx.at)) ||
                (quoteCurrency !== "EUR" && asset.quoteFxAt && isFxStale(asset.quoteFxAt))
                  ? t("holdingValueFxStale")
                  : null,
              ]
                .filter((message): message is string => !!message)
                .map((message) => (
                  <div key={message} className="border-t border-border pt-2">
                    <dt className="text-muted-foreground">{t("holdingValueNote")}</dt>
                    <dd className="mt-1 text-amber-700 dark:text-amber-300">{message}</dd>
                  </div>
                ))}
            </dl>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
