import { afterEach, beforeEach, expect, it, vi } from "vitest";
beforeEach(() => {
  vi.resetModules();
  document.head.querySelectorAll('script[src*="gsi/client"]').forEach((s) => s.remove());
});
afterEach(() => {
  document.head.querySelectorAll('script[src*="gsi/client"]').forEach((s) => s.remove());
});
const scripts = () => [
  ...document.head.querySelectorAll<HTMLScriptElement>('script[src*="gsi/client"]'),
];
const tick = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};
it("serializes rapid EN/BG/EN changes instead of letting an obsolete locale finish last", async () => {
  const { loadGoogleIdentityScript: load } = await import("@/lib/google-identity");
  const first = load("en"),
    second = load("bg"),
    third = load("en");
  expect(load("en")).toBe(third);
  await tick();
  expect(scripts()).toHaveLength(1);
  expect(scripts()[0]!.src).toContain("hl=en");
  scripts()[0]!.dispatchEvent(new Event("load"));
  await first;
  await tick();
  expect(scripts()).toHaveLength(2);
  expect(scripts()[1]!.src).toContain("hl=bg");
  scripts()[1]!.dispatchEvent(new Event("load"));
  await second;
  await tick();
  expect(scripts()).toHaveLength(3);
  expect(scripts()[2]!.src).toContain("hl=en");
  scripts()[2]!.dispatchEvent(new Event("load"));
  await third;
});
it("lets a retry proceed after a failed SDK request", async () => {
  const { loadGoogleIdentityScript: load } = await import("@/lib/google-identity");
  const failed = load("en");
  const rejection = expect(failed).rejects.toThrow("Unable to load Google");
  await tick();
  scripts()[0]!.dispatchEvent(new Event("error"));
  await rejection;
  const retry = load("bg");
  await tick();
  expect(scripts()[1]!.src).toContain("hl=bg");
  scripts()[1]!.dispatchEvent(new Event("load"));
  await retry;
});
