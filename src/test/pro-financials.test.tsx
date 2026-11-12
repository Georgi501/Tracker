import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProFinancials } from "@/components/ProFinancials";

const state = vi.hoisted(() => ({ financials: vi.fn() }));

vi.mock("@tanstack/react-start", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-start")>()),
  useServerFn: (fn: unknown) => fn,
}));

vi.mock("@/lib/market.functions", () => ({
  marketFinancialSeries: state.financials,
}));

function row(
  date: string,
  values: {
    revenue?: number | null;
    freeCashFlow?: number | null;
    dilutedEps?: number | null;
  },
) {
  return {
    date,
    revenue: values.revenue ?? null,
    costOfRevenue: null,
    grossProfit: null,
    operatingIncome: null,
    operatingExpense: null,
    netIncome: null,
    dilutedEps: values.dilutedEps ?? null,
    operatingCashFlow: null,
    freeCashFlow: values.freeCashFlow ?? null,
  };
}

beforeEach(() => {
  state.financials.mockResolvedValue({
    rows: [
      row("2025-01-01", { revenue: 100, freeCashFlow: 10 }),
      row("2025-04-01", { revenue: 120, freeCashFlow: -20 }),
    ],
    currency: "USD",
  });
});

afterEach(cleanup);

function renderFinancials() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProFinancials symbol="ORCL" lang="en" />
    </QueryClientProvider>,
  );
}

async function renderTrailing() {
  const view = renderFinancials();
  fireEvent.click(await screen.findByRole("button", { name: "TTM" }));
  return view;
}

describe("financial statement controls and metric changes", () => {
  it("requests and marks each selected period and range", async () => {
    renderFinancials();

    for (const [period, label] of [
      ["annual", "Annual"],
      ["quarterly", "Quarterly"],
      ["trailing", "TTM"],
    ] as const) {
      fireEvent.click(await screen.findByRole("button", { name: label }));
      expect(screen.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "true");

      for (const years of [3, 5, 10]) {
        const range = `${years}Y`;
        fireEvent.click(screen.getByRole("button", { name: range }));
        await waitFor(() => {
          expect(state.financials).toHaveBeenCalledWith({
            data: { symbol: "ORCL", period, years },
          });
        });
        expect(screen.getByRole("button", { name: range })).toHaveAttribute("aria-pressed", "true");
      }
    }
    expect(await screen.findByText("2 TTM periods available")).toBeInTheDocument();
  }, 20_000);

  it("updates the displayed dates when the selected period changes", async () => {
    state.financials.mockImplementation(async (input: { data: { period: string } }) => {
      const dates =
        input.data.period === "trailing"
          ? ["2026-05-31", "2026-08-31"]
          : ["2023-05-31", "2026-05-31"];
      return {
        rows: dates.map((date) => row(date, { revenue: 100, freeCashFlow: -20 })),
        currency: "USD",
      };
    });

    renderFinancials();

    expect((await screen.findAllByText("2 of 5 years with data")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Aug 31, 2026")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "TTM" }));
    expect(screen.getByRole("button", { name: "TTM" })).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findAllByText("Aug 31, 2026")).toHaveLength(2);
  });

  it("compares two values compactly with their dates and one percentage", async () => {
    await renderTrailing();

    expect(await screen.findByText("+20.0%")).toBeInTheDocument();
    expect(screen.getByText("+20.0%")).toHaveClass("text-success");
    expect(screen.getAllByText("Previous")).toHaveLength(2);
    expect(screen.getAllByText("Latest")).toHaveLength(2);
    expect(
      await screen.findAllByLabelText(/Change between the first and last available values:/),
    ).toHaveLength(1);
    expect(
      screen.queryByRole("group", { name: "Revenue historical chart" }),
    ).not.toBeInTheDocument();
  });

  it("formats full-dollar financial values in billions and keeps EPS per share", async () => {
    state.financials.mockResolvedValue({
      rows: [
        row("2026-05-31", {
          revenue: 67_358_000_000,
          freeCashFlow: -23_686_000_000,
          dilutedEps: 5.83,
        }),
        row("2026-08-31", {
          revenue: 71_777_000_000,
          freeCashFlow: -28_720_000_000,
          dilutedEps: 6.38,
        }),
      ],
      currency: "USD",
    });

    await renderTrailing();

    const revenueHeading = await screen.findByRole("heading", { name: "Revenue" });
    const freeCashFlowHeading = await screen.findByRole("heading", { name: "Free cash flow" });
    const epsHeading = await screen.findByRole("heading", { name: "Diluted EPS" });
    const revenue = within(revenueHeading.closest(".group")!);
    const freeCashFlow = within(freeCashFlowHeading.closest(".group")!);
    const eps = within(epsHeading.closest(".group")!);

    expect(await revenue.findByText("$67.4B")).toBeInTheDocument();
    expect(revenue.getByText("$71.8B")).toBeInTheDocument();
    expect(await freeCashFlow.findByText("-$23.7B")).toBeInTheDocument();
    expect(freeCashFlow.getByText("-$28.7B")).toBeInTheDocument();
    expect(await eps.findByText("$5.83")).toBeInTheDocument();
    expect(eps.getByText("$6.38")).toBeInTheDocument();
    expect(eps.queryByText(/\$[\d.]+B/)).not.toBeInTheDocument();
  });

  it.each([
    ["100 to 0", 100, 0, "-100.0%"],
    ["0 to 100", 0, 100, "—"],
    ["100 to -20", 100, -20, "—"],
  ])("applies the percentage rule for %s", async (_label, first, last, expected) => {
    state.financials.mockResolvedValue({
      rows: [
        row("2025-01-01", { revenue: first, freeCashFlow: first }),
        row("2025-04-01", { revenue: last, freeCashFlow: last }),
      ],
      currency: "USD",
    });

    await renderTrailing();

    if (expected !== "—") {
      expect(await screen.findAllByText(expected)).toHaveLength(2);
    }
    if (expected === "—") {
      const unavailable = await screen.findAllByLabelText(
        "A percentage needs a positive start and a non-negative end.",
      );
      expect(unavailable).toHaveLength(2);
      expect(unavailable.every((element) => element.textContent === "—")).toBe(true);
    }
  });

  it("shows a single value and date without a chart or percentage", async () => {
    state.financials.mockResolvedValue({
      rows: [row("2025-01-01", { revenue: 100, freeCashFlow: 10 })],
      currency: "USD",
    });

    await renderTrailing();

    expect(await screen.findAllByText("No data for this period.")).toHaveLength(4);
    expect(screen.getAllByText("Jan 1, 2025")).toHaveLength(2);
    expect(screen.queryByLabelText("Revenue historical chart")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("A percentage comparison needs a positive starting value."),
    ).not.toBeInTheDocument();
  });

  it("keeps a small increase proportionate and exposes every chart point", async () => {
    state.financials.mockResolvedValue({
      rows: [
        row("2025-01-01", { revenue: 100, freeCashFlow: 10 }),
        row("2025-04-01", { revenue: 103.3, freeCashFlow: 5 }),
        row("2025-07-01", { revenue: 106.6, freeCashFlow: -20 }),
      ],
      currency: "USD",
    });

    await renderTrailing();

    expect(await screen.findByText("+6.6%")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Revenue historical chart" })).toBeInTheDocument();

    const freeCashFlow = screen.getByRole("heading", { name: "Free cash flow" }).closest(".group");
    expect(freeCashFlow).not.toBeNull();
    fireEvent.click(within(freeCashFlow as HTMLElement).getByText("View values"));
    const points = within(freeCashFlow as HTMLElement).getByRole("list", {
      name: "Free cash flow values by date",
    });
    expect(points).toHaveTextContent("Jan 1, 2025");
    expect(points).toHaveTextContent("Apr 1, 2025");
    expect(points).toHaveTextContent("Jul 1, 2025");
    expect(points).toHaveTextContent(/-\$?20/);
    expect(
      screen.getByRole("group", { name: "Free cash flow historical chart" }),
    ).toBeInTheDocument();
  });

  it("shows one slot per fiscal year, separating missing values from zero", async () => {
    state.financials.mockResolvedValue({
      rows: [
        row("2023-05-31", { revenue: 10, freeCashFlow: 0 }),
        row("2026-05-31", { revenue: 14, freeCashFlow: -5 }),
      ],
      currency: "USD",
    });

    renderFinancials();
    fireEvent.click(await screen.findByRole("button", { name: "10Y" }));

    const revenue = (await screen.findByRole("heading", { name: "Revenue" })).closest(".group");
    await within(revenue as HTMLElement).findByText("2 of 10 years with data");
    const chart = within(revenue as HTMLElement).getByRole("group", {
      name: "Revenue historical chart",
    });
    const labels = chart.parentElement as HTMLElement;
    expect(labels).toHaveTextContent("’17");
    expect(labels).toHaveTextContent("’26");

    fireEvent.click(within(revenue as HTMLElement).getByText("View values"));
    const list = within(revenue as HTMLElement).getByRole("list", {
      name: "Revenue values by date",
    });
    expect(within(list).getAllByRole("listitem")).toHaveLength(10);
    expect(within(list).getAllByText("No data")).toHaveLength(8);
  });

  it("opens the tooltip from the keyboard and closes it with Escape", async () => {
    state.financials.mockResolvedValue({
      rows: [
        row("2024-05-31", { revenue: 10 }),
        row("2025-05-31", { revenue: 12 }),
        row("2026-05-31", { revenue: 14 }),
      ],
      currency: "USD",
    });

    renderFinancials();
    const revenue = (await screen.findByRole("heading", { name: "Revenue" })).closest(".group");
    const chart = await within(revenue as HTMLElement).findByRole("group", {
      name: "Revenue historical chart",
    });
    chart.focus();
    const live = chart.parentElement!.querySelector("[aria-live]")!;
    fireEvent.keyDown(chart, { key: "End" });
    expect(live).toHaveTextContent("FY 2026, Revenue: $14");
    fireEvent.keyDown(chart, { key: "ArrowLeft" });
    expect(live).toHaveTextContent("FY 2025, Revenue: $12");
    fireEvent.keyDown(chart, { key: "Escape" });
    expect(live).toBeEmptyDOMElement();
  });
});
