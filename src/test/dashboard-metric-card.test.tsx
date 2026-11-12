import { DashboardMetricCard } from "@/components/DashboardMetricCard";
import { DashboardMotion } from "@/components/DashboardMotion";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
afterEach(cleanup);
const card = (extra: object) => (
  <DashboardMotion>
    <TooltipProvider>
      <DashboardMetricCard label="Return" help="Real portfolio returns" value="—" {...extra} />
    </TooltipProvider>
  </DashboardMotion>
);
it("keeps unavailable returns neutral rather than rendering a loss", () => {
  const result = render(card({ n: NaN }));
  expect(screen.getByText("—")).toBeInTheDocument();
  expect(result.container.querySelector(".text-destructive")).toBeNull();
  expect(result.container.querySelector(".metric-negative")).toBeNull();
});
it("preserves negative real returns and their directional styling", () => {
  const result = render(card({ n: -20, value: "−$20", sub: "−2%" }));
  expect(screen.getByText("−$20")).toHaveClass("text-destructive");
  expect(result.container.querySelector(".metric-negative")).toBeInTheDocument();
});
it("reserves a skeleton while pending without exposing a placeholder amount", () => {
  const result = render(card({ pending: true, value: "123" }));
  expect(screen.queryByText("123")).not.toBeInTheDocument();
  expect(result.container.querySelector('dl[aria-busy="true"]')).toBeInTheDocument();
});

it.each([NaN, Infinity, -Infinity, undefined])("keeps unavailable metric %s neutral", (n) => {
  const result = render(card({ n }));
  expect(screen.getByText("\u2014")).toBeInTheDocument();
  expect(
    result.container.querySelector(".metric-negative, .metric-positive, .text-destructive"),
  ).toBeNull();
});
