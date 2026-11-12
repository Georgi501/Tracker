import { cleanup, render, waitFor, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSectionAnchor } from "@/lib/use-section-anchor";

function Page({ hash = "financials", ready = false }: { hash?: string; ready?: boolean }) {
  const ref = useSectionAnchor(hash, "ORCL");
  return <div ref={ref}>{ready ? <section id="financials">Reports</section> : <p>Loading</p>}</div>;
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("asset section anchors", () => {
  it("aligns a direct anchor after delayed asset loading and replacement of the access placeholder", async () => {
    const scroll = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scroll,
    });
    const view = render(<Page />);
    expect(scroll).not.toHaveBeenCalled();
    view.rerender(<Page ready />);
    await waitFor(() =>
      expect(scroll).toHaveBeenCalledWith({ block: "start", behavior: "instant" }),
    );
    scroll.mockClear();
    view.rerender(<Page />);
    view.rerender(<Page ready />);
    await waitFor(() => expect(scroll).toHaveBeenCalled());
  });
  it("stops following delayed content after the user scrolls", async () => {
    const scroll = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scroll,
    });
    const view = render(<Page />);
    fireEvent.wheel(window);
    view.rerender(<Page ready />);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(scroll).not.toHaveBeenCalled();
  });
  it("handles selecting Financials after opening the overview", async () => {
    const scroll = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scroll,
    });
    const view = render(<Page hash="" ready />);
    expect(scroll).not.toHaveBeenCalled();
    view.rerender(<Page hash="financials" ready />);
    await waitFor(() => expect(scroll).toHaveBeenCalled());
  });
});
