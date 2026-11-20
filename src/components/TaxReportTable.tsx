import { Delta } from "@/components/AppShell";
import { formatBaseCurrencyAmount, type BaseCurrencyTaxYear } from "@/lib/base-currency-accounting";
import type { Lang } from "@/lib/i18n";
import type { Currency } from "@/lib/portfolio";
import { toolsCopy } from "@/lib/tools-i18n";

export function TaxReportTable({
  years,
  lang,
  currency,
}: {
  years: readonly BaseCurrencyTaxYear[];
  lang: Lang;
  currency: Currency;
}) {
  const c = toolsCopy[lang];
  const cell = "grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 text-right sm:table-cell sm:pl-2";
  return (
    <table role="table" className="block w-full text-sm sm:table">
      <thead role="rowgroup" className="text-left text-xs text-muted-foreground max-sm:sr-only">
        <tr role="row">
          <th role="columnheader" scope="col" className="py-1 font-medium">
            {c.year}
          </th>
          {[c.proceeds, c.costBasis, c.realized, c.dividendsReceived].map((label) => (
            <th role="columnheader" scope="col" key={label} className="pl-2 text-right font-medium">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody role="rowgroup" className="block sm:table-row-group">
        {years.map((year) => (
          <tr
            role="row"
            key={year.year}
            className="grid gap-1 border-t border-border py-2 sm:table-row"
          >
            <th
              role="rowheader"
              scope="row"
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 text-right font-semibold sm:table-cell sm:py-2 sm:text-left"
            >
              <span aria-hidden="true" className="text-left sm:hidden">
                {c.year}
              </span>
              <span>
                {year.yearEnd === year.year
                  ? year.year
                  : `${year.year}/${String(year.yearEnd).slice(-2)}`}
              </span>
            </th>
            {(
              [
                [c.proceeds, formatBaseCurrencyAmount(year.proceeds, currency, lang)],
                [c.costBasis, formatBaseCurrencyAmount(year.cost, currency, lang)],
                [
                  c.realized,
                  <Delta value={year.realized}>
                    {formatBaseCurrencyAmount(year.realized, currency, lang, { sign: true })}
                  </Delta>,
                ],
                [c.dividendsReceived, formatBaseCurrencyAmount(year.dividends, currency, lang)],
              ] as const
            ).map(([label, amount]) => (
              <td role="cell" key={label} className={cell}>
                <span aria-hidden="true" className="text-left text-muted-foreground sm:hidden">
                  {label}
                </span>
                <span className="tabular-nums">{amount}</span>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
