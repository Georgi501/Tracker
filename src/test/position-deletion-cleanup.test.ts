import { afterEach, beforeEach, expect, it, vi } from "vitest";
import worker from "@/server";
import { purgeExpiredPositionDeletions } from "@/lib/position-deletion-cleanup.server";
const state = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc: state.rpc } }));
vi.mock("@/lib/error-capture", () => ({ consumeLastCapturedError: vi.fn() }));
vi.mock("@/lib/error-page", () => ({ renderErrorPage: vi.fn() }));
beforeEach(() => {
  state.rpc.mockReset().mockResolvedValue({ data: 0, error: null });
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
it("the scheduled handler registers the server cleanup with waitUntil", async () => {
  const waitUntil = vi.fn();
  worker.scheduled({}, {}, { waitUntil });
  expect(waitUntil).toHaveBeenCalledTimes(1);
  await waitUntil.mock.calls[0]![0];
  expect(state.rpc).toHaveBeenCalledExactlyOnceWith("purge_expired_position_deletions");
});
it("drains bounded batches without logging private recovery records", async () => {
  state.rpc
    .mockResolvedValueOnce({ data: 500, error: null })
    .mockResolvedValueOnce({ data: 3, error: null });
  expect(await purgeExpiredPositionDeletions()).toBe(503);
  expect(state.rpc).toHaveBeenCalledTimes(2);
  expect(console.info).toHaveBeenCalledExactlyOnceWith("Expired position recovery cleanup", {
    purged: 503,
  });
});
it("bounds the scheduled invocation and leaves a backlog for the next minute", async () => {
  state.rpc.mockResolvedValue({ data: 500, error: null });
  expect(await purgeExpiredPositionDeletions()).toBe(10000);
  expect(state.rpc).toHaveBeenCalledTimes(20);
});
it("reports a failed cleanup rather than silently treating it as successful", async () => {
  state.rpc.mockResolvedValueOnce({ data: null, error: { message: "DB unavailable" } });
  await expect(purgeExpiredPositionDeletions()).rejects.toThrow("cleanup failed");
  expect(console.info).not.toHaveBeenCalled();
  expect(await purgeExpiredPositionDeletions()).toBe(0);
});
