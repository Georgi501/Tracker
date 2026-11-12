import { createElement, StrictMode, type ComponentType, type ReactNode } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { setAnalyticsConsent } from "@/lib/analytics";
import { Route } from "@/routes/import-demo";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({
    options,
    useSearch: () => ({}),
  }),
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));
vi.mock("@/lib/store", () => ({
  usePortfolio: () => ({ lang: "en", user: null, t: (key: string) => key }),
}));
vi.mock("@/components/AppShell", () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderDemo() {
  const component = Route.options.component;
  if (typeof component !== "function") throw new Error("Missing route component");
  return render(createElement(StrictMode, null, createElement(component as ComponentType)));
}

it("records one view per visit under StrictMode, including a separate return visit", () => {
  setAnalyticsConsent(true);
  const first = renderDemo();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith(
    "/api/public/analytics",
    expect.objectContaining({ body: expect.stringContaining('"event":"csv_demo_view"') }),
  );
  expect(fetch).toHaveBeenCalledWith(
    "/api/public/analytics",
    expect.objectContaining({ body: expect.stringContaining('"pagePath":"/import-demo"') }),
  );
  first.unmount();
  renderDemo();
  expect(fetch).toHaveBeenCalledTimes(2);
});

it("does not record a demo visit when consent is rejected", () => {
  setAnalyticsConsent(false);
  renderDemo();
  expect(fetch).not.toHaveBeenCalled();
});
