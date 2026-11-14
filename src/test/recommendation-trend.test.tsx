import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RecommendationTrend } from "@/components/RecommendationTrend";

afterEach(cleanup);
const names = ["Strong buy", "Buy", "Hold", "Sell", "Strong sell"];
const current = { period: "0m", strongBuy: 38, buy: 18, hold: 4, sell: 1, strongSell: 0 };
const previous = { period: "-1m", strongBuy: 2, buy: 3, hold: 5, sell: 0, strongSell: 0 };

describe("recommendation periods", () => {
  it("shows 61 ratings and derives percentages from the selected period, retaining zero categories", () => {
    const view = render(
      <RecommendationTrend
        recommendations={[current, previous]}
        names={names}
        lang="en"
        unavailable="No recommendations"
      />,
    );
    expect(screen.getByRole("img", { name: "61 Ratings · Current" })).toBeInTheDocument();
    expect(view.container.querySelectorAll("[data-recommendation-segment]")).toHaveLength(4);
    const legend = screen.getByRole("list", { name: "Ratings" });
    expect(within(legend).getByText("62.3%")).toBeInTheDocument();
    const zero = within(legend).getByText("Strong sell").closest("li")!;
    expect(within(zero).getByText("0")).toBeInTheDocument();
    expect(within(zero).getByText("0%")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Recommendation period" }), {
      target: { value: "-1m" },
    });
    expect(screen.getByRole("img", { name: /10 Ratings/ })).toBeInTheDocument();
    expect(within(legend).getByText("20%")).toBeInTheDocument();
    expect(within(legend).getByText("30%")).toBeInTheDocument();
    expect(within(legend).getByText("50%")).toBeInTheDocument();
    expect(view.container.querySelectorAll("[data-recommendation-segment]")).toHaveLength(3);
    expect(screen.getByText("Monthly rating totals")).toBeInTheDocument();
  });
  it.each([
    { recommendations: [] },
    { recommendations: [{ ...current, strongBuy: 0, buy: 0, hold: 0, sell: 0 }] },
  ])("does not draw segments when no ratings are available", ({ recommendations }) => {
    const view = render(
      <RecommendationTrend
        recommendations={recommendations}
        names={names}
        lang="en"
        unavailable="No recommendations"
      />,
    );
    expect(screen.getByText("No recommendations")).toBeInTheDocument();
    expect(view.container.querySelectorAll("[data-recommendation-segment]")).toHaveLength(0);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
