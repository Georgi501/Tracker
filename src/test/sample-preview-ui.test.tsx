import { SamplePortfolioPreview } from "@/components/SamplePortfolioPreview";
import { SAMPLE_PERIODS, samplePeriodData } from "@/lib/sample-preview";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { cloneElement, type ReactElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({
      children,
    }: {
      children: ReactElement<{ width?: number; height?: number }>;
    }) => cloneElement(children, { width: 480, height: 208 }),
  };
});
afterEach(cleanup);
it("changes the selected period, visible return and chart for each real control", () => {
  const result = render(<SamplePortfolioPreview lang="en" />);
  let previous = "";
  for (const period of SAMPLE_PERIODS) {
    fireEvent.click(screen.getByRole("button", { name: period }));
    expect(screen.getByRole("button", { name: period })).toHaveAttribute("aria-pressed", "true");
    const formatted = new Intl.NumberFormat("en-US", {
      style: "percent",
      maximumFractionDigits: 2,
      signDisplay: "exceptZero",
    }).format(samplePeriodData(period).returnPercent / 100);
    expect(screen.getByText(formatted)).toBeInTheDocument();
    const current = result.container.querySelector(".recharts-area-curve")?.getAttribute("d");
    expect(current).toBeTruthy();
    if (previous) expect(current).not.toBe(previous);
    previous = current!;
  }
  expect(screen.queryByText("Loading metric")).not.toBeInTheDocument();
  expect(screen.queryByText("—")).not.toBeInTheDocument();
  expect(screen.getByText(/Illustrative data/)).toBeInTheDocument();
});
it("localizes Bulgarian copy and formats percentages through the registry locale", () => {
  render(<SamplePortfolioPreview lang="bg" />);
  expect(screen.getByText("Интерактивно примерно портфолио")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Покажи подробните показатели" }));
  expect(screen.getByText(/Не?реализирана печалба/)).toBeInTheDocument();
  expect(screen.getByText(/не са котировки на живо/)).toBeInTheDocument();
  expect(screen.getByText("Trading 212")).toBeInTheDocument();
});
