import { CompanyLogo } from "@/components/CompanyLogo";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("shows the existing ticker fallback when an image failed before hydration", () => {
  vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
  vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(0);
  const { container } = render(<CompanyLogo symbol="MSFT" size={32} />);
  expect(container.querySelector("img")).not.toBeInTheDocument();
  expect(screen.getByText("MSFT")).toHaveAttribute("aria-hidden", "true");
});

it("keeps a loaded logo and switches to the same fallback on a later error", () => {
  vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
  vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(64);
  const { container } = render(<CompanyLogo symbol="NVDA" size={32} />);
  const image = container.querySelector("img")!;
  expect(image).toHaveAttribute("src", "https://financialmodelingprep.com/image-stock/NVDA.png");
  fireEvent.error(image);
  expect(container.querySelector("img")).not.toBeInTheDocument();
  expect(screen.getByText("NVDA")).toBeInTheDocument();
});
