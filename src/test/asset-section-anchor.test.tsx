import { cleanup, render, waitFor, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSectionAnchor } from "@/lib/use-section-anchor";
const originalResizeObserver = globalThis.ResizeObserver;

function Page({ hash = "financials", ready = false }: { hash?: string; ready?: boolean }) {
  const ref = useSectionAnchor(hash, "ORCL");
  return <div ref={ref}>{ready ? <section id="financials">Reports</section> : <p>Loading</p>}</div>;
}
afterEach(() => {
  cleanup();
  globalThis.ResizeObserver = originalResizeObserver;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("asset section anchors", () => {
  it.each(["Tab", "Enter"])(
    "stops delayed alignment when the user navigates with %s",
    async (key) => {
      const scroll = vi.fn();
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
        configurable: true,
        value: scroll,
      });
      const view = render(<Page />);
      fireEvent.keyDown(window, { key });
      view.rerender(<Page ready />);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(scroll).not.toHaveBeenCalled();
    },
  );
  it("measures delayed tabs and header resizing, and clears page offsets on exit", async () => {
    let headerHeight = 113;
    let tabsHeight = 54;
    const callbacks: ResizeObserverCallback[] = [];
    globalThis.ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) {
        callbacks.push(callback);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    const bounds = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        return { height: this.matches(".header-as") ? headerHeight : tabsHeight } as DOMRect;
      });
    function StickyPage({ ready = false }: { ready?: boolean }) {
      const ref = useSectionAnchor("", "NVDA");
      return (
        <>
          <header className="header-as" />
          <div ref={ref}>{ready && <nav className="asset-section-tabs" />}</div>
        </>
      );
    }
    const view = render(<StickyPage />);
    const html = document.documentElement;
    expect(html.style.getPropertyValue("--asset-header-height")).toBe("113px");
    expect(html.style.getPropertyValue("--asset-tabs-height")).toBe("0px");
    view.rerender(<StickyPage ready />);
    await waitFor(() => expect(html.style.getPropertyValue("--asset-tabs-height")).toBe("54px"));
    headerHeight = 65;
    tabsHeight = 64;
    callbacks.forEach((callback) => callback([], {} as ResizeObserver));
    expect(html.style.getPropertyValue("--asset-header-height")).toBe("65px");
    expect(html.style.getPropertyValue("--asset-tabs-height")).toBe("64px");
    view.unmount();
    expect(html).not.toHaveAttribute("data-asset-navigation");
    expect(html.style.getPropertyValue("--asset-header-height")).toBe("");
    expect(html.style.getPropertyValue("--asset-tabs-height")).toBe("");
    bounds.mockRestore();
  });
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
