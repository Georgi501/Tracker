import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CompanyProfileDetails } from "@/components/CompanyProfileDetails";

const state = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: state.rpc },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, hash }: { children: ReactNode; to: string; hash?: string }) => (
    <a href={`${to}${hash ? `#${hash}` : ""}`}>{children}</a>
  ),
}));

vi.mock("@/components/AppShell", () => ({
  Card: ({ children }: { children: ReactNode }) => <section>{children}</section>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ProFeatures", () => ({
  BarsSilhouette: () => <div>Profile preview</div>,
}));

vi.mock("@/components/KeyStats", () => ({
  KeyStats: ({ symbol }: { symbol: string }) => <div>Statistics for {symbol}</div>,
}));

vi.mock("@/components/ProFinancials", () => ({
  ProFinancials: () => <div>Financial statements</div>,
}));

vi.mock("@/components/ProCompanyResearch", () => ({
  ProCompanyResearch: () => <div>Company research</div>,
}));

vi.mock("@/components/CompanyOverview", () => ({
  CompanyOverview: () => <div>Company news</div>,
}));

vi.mock("@/components/DcfCalculator", () => ({
  DcfCalculator: ({ fixedSymbol }: { fixedSymbol: string }) => <div>DCF for {fixedSymbol}</div>,
  dcfCopy: { en: { intrinsic: "DCF estimate" } },
}));

afterEach(cleanup);
beforeEach(() => {
  state.rpc.mockReset();
});

function renderProfile({
  userId = "user-1",
  isPro = false,
}: {
  userId?: string | null;
  isPro?: boolean;
} = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CompanyProfileDetails symbol="AAPL" name="Apple" lang="en" userId={userId} isPro={isPro} />
    </QueryClientProvider>,
  );
}

describe("company profile access", () => {
  it("requires a free account before showing detailed company information", () => {
    renderProfile({ userId: null });

    expect(
      screen.getByText("Sign in or create a free account to explore this company's full profile."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create a free account" })).toHaveAttribute(
      "href",
      "/auth",
    );
    expect(screen.queryByText("Statistics for AAPL")).not.toBeInTheDocument();
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it("shows all company details when a free account has remaining views", async () => {
    state.rpc.mockResolvedValue({
      data: [{ allowed: true, used: 1, resets_on: "2026-03-16" }],
      error: null,
    });
    renderProfile();

    expect(await screen.findByText("Statistics for AAPL")).toBeInTheDocument();
    expect(screen.getByText("Financial statements")).toBeInTheDocument();
    expect(screen.getByText("DCF estimate (DCF)")).toBeInTheDocument();
    expect(
      screen.getByText(
        /included in this company's weekly profile view and does not use another company view/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("DCF for AAPL")).toBeInTheDocument();
    expect(screen.getByText("Company research")).toBeInTheDocument();
    expect(screen.getByText("Company news")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 free company profiles used this week")).toBeInTheDocument();
  });

  it("locks company details after the weekly allowance is used", async () => {
    state.rpc.mockResolvedValue({
      data: [{ allowed: false, used: 2, resets_on: "2026-03-16" }],
      error: null,
    });
    renderProfile();

    await waitFor(() => {
      expect(
        screen.getByText(
          "You've used this week's free company profiles. Upgrade to Pro for unlimited access.",
        ),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: "Explore Pro" })).toHaveAttribute(
      "href",
      "/pricing#plan-comparison",
    );
    expect(document.getElementById("financials")).toBeInTheDocument();
    expect(document.getElementById("research")).toBeInTheDocument();
    expect(document.getElementById("news")).toBeInTheDocument();
    expect(document.getElementById("valuation")).toBeInTheDocument();
    expect(screen.queryByText("Statistics for AAPL")).not.toBeInTheDocument();
    expect(screen.queryByText("DCF for AAPL")).not.toBeInTheDocument();
  });

  it("gives Pro accounts unlimited access without claiming a free view", () => {
    renderProfile({ isPro: true });

    expect(screen.getByText("Statistics for AAPL")).toBeInTheDocument();
    expect(screen.getByText("Financial statements")).toBeInTheDocument();
    expect(state.rpc).not.toHaveBeenCalled();
  });
});
