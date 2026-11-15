import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PortfolioComparisonLegend } from "@/components/PortfolioComparisonLegend";
import { benchmarkCopy } from "@/lib/benchmark-i18n";
import { languages } from "@/lib/i18n";

afterEach(cleanup);

describe("portfolio comparison legend", () => {
  it.each(languages)(
    "retains named returns, difference and the full benchmark caveat in $code",
    ({ code }) => {
      render(
        <PortfolioComparisonLegend
          lang={code}
          indexName="S&P 500"
          portfolioValue="−2.50%"
          indexValue="+1.25%"
          differenceValue="−3.75 pp"
          portfolioColor="var(--destructive)"
        />,
      );
      expect(screen.getByText(benchmarkCopy[code].portfolio)).toBeVisible();
      expect(screen.getByText("S&P 500")).toBeVisible();
      expect(screen.getByText(benchmarkCopy[code].difference)).toBeVisible();
      expect(screen.getByText("−2.50%")).toBeVisible();
      expect(screen.getByText("+1.25%")).toBeVisible();
      expect(screen.getByText("−3.75 pp")).toBeVisible();
      expect(screen.getByText(benchmarkCopy[code].priceReturn)).toBeVisible();
    },
  );
});
