import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TaxReportTable } from "@/components/TaxReportTable";
import { formatBaseCurrencyAmount } from "@/lib/base-currency-accounting";
import { toolsCopy } from "@/lib/tools-i18n";

describe("FIFO tax report table", () => {
  it("pairs every Bulgarian mobile label with its amount and preserves table headers", () => {
    const lang = "bg";
    const currency = "USD";
    const c = toolsCopy[lang];
    render(
      <TaxReportTable
        years={[
          {
            year: 2025,
            yearEnd: 2026,
            proceeds: 66.7,
            cost: 44,
            realized: 22.7,
            dividends: 0,
            fxComplete: true,
            dividendsFxComplete: true,
            missingFxDates: [],
            sales: [],
          },
        ]}
        lang={lang}
        currency={currency}
      />,
    );

    const year = screen.getByRole("rowheader", { name: "2025/26" });
    expect(within(year).getByText(c.year)).toHaveClass("sm:hidden");
    const row = year.closest("tr")!;
    const cells = within(row).getAllByRole("cell");
    const fields = [
      [c.proceeds, 66.7, false],
      [c.costBasis, 44, false],
      [c.realized, 22.7, true],
      [c.dividendsReceived, 0, false],
    ] as const;
    fields.forEach(([label, amount, sign], index) => {
      expect(screen.getByRole("columnheader", { name: label })).toHaveAttribute("scope", "col");
      expect(within(cells[index]!).getByText(label)).toHaveClass("sm:hidden");
      expect(cells[index]).toHaveTextContent(
        formatBaseCurrencyAmount(amount, currency, lang, { sign }).replace(/\s/g, " "),
      );
    });
  });
});
