import { CompanySuggestionLogo } from "@/components/CompanySuggestionLogo";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("keeps the existing ticker fallback inside the light circle on an early image failure", () => {
  vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
  vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(0);
  const { container } = render(<CompanySuggestionLogo symbol="COST" />);
  expect(container.querySelector("img")).not.toBeInTheDocument();
  expect(screen.getByText("COST").parentElement).toHaveClass("rounded-full", "bg-slate-50");
});

it("uses the existing fallback on a later image error", () => {
  vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(false);
  const { container } = render(<CompanySuggestionLogo symbol="MSFT" />);
  fireEvent.error(container.querySelector("img")!);
  expect(screen.getByText("MSFT")).toBeInTheDocument();
  expect(container.querySelector("img")).not.toBeInTheDocument();
});

it("shows the full image instead of a stale crop when the provider changes source dimensions", () => {
  vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
  vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(512);
  vi.spyOn(HTMLImageElement.prototype, "naturalHeight", "get").mockReturnValue(512);
  const { container } = render(<CompanySuggestionLogo symbol="COST" />);
  expect(container.querySelector("img")).toHaveClass("object-contain");
  expect(container.querySelector("img")).not.toHaveStyle({ position: "absolute" });
});
