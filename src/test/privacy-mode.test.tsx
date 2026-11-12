import { PrivacyController, PrivacyToggle } from "@/components/PrivacyMode";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
beforeEach(() => {
  localStorage.clear();
  window.dispatchEvent(new Event("capispot-privacy"));
});
afterEach(cleanup);
it("persists screen privacy, masks new monetary values and keeps percentages visible", async () => {
  const { rerender } = render(
    <>
      <PrivacyController />
      <PrivacyToggle lang="en" />
      <p>$100 (+2.5%)</p>
    </>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Hide monetary values" }));
  expect(screen.getByText("•••••• (+2.5%)")).toBeInTheDocument();
  expect(localStorage.getItem("capispot-hide-balances")).toBe("true");
  rerender(
    <>
      <PrivacyController />
      <PrivacyToggle lang="en" />
      <p>$250 (+3.5%)</p>
    </>,
  );
  await new Promise((r) => setTimeout(r, 0));
  expect(screen.getByText("•••••• (+3.5%)")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Show monetary values" }));
  expect(screen.getByText("$250 (+3.5%)")).toBeInTheDocument();
});
