import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { usePositionDeletion } from "@/hooks/use-position-deletion";
const state = vi.hoisted(() => ({
  user: { id: "owner" } as { id: string } | null,
  remove: vi.fn(),
  list: vi.fn(),
  restore: vi.fn(),
}));
vi.mock("@/lib/store", () => ({
  usePortfolio: () => ({
    user: state.user,
    deletePosition: state.remove,
    restorePosition: state.restore,
  }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/position-deletion", () => ({ listPositionDeletions: state.list }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
beforeEach(() => {
  state.user = { id: "owner" };
  state.list.mockReset().mockResolvedValue([]);
  state.remove.mockReset().mockImplementation(async (assetId, operationId) => ({
    assetId,
    operationId,
    state: "deleted",
  }));
  state.restore.mockReset().mockImplementation(async (assetId, operationId) => ({
    assetId,
    operationId,
    state: "restored",
  }));
});
function deferred() {
  let resolve!: (value: { assetId: string; operationId: string; state: string }) => void;
  const promise = new Promise<{ assetId: string; operationId: string; state: string }>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}
it("ignores double clicks and uses the same receipt for Undo", async () => {
  const request = deferred();
  state.remove.mockReturnValueOnce(request.promise);
  const { result } = renderHook(usePositionDeletion);
  act(() => {
    result.current.removeAsset("asset", "TEST");
    result.current.removeAsset("asset", "TEST");
  });
  expect(state.remove).toHaveBeenCalledTimes(1);
  const entry = result.current.operations[0]!;
  expect(entry.phase).toBe("deleting");
  await act(async () => request.resolve({ ...entry, state: "deleted" }));
  act(() => {
    result.current.undo(result.current.operations[0]!);
    result.current.undo(result.current.operations[0]!);
  });
  await waitFor(() => expect(result.current.operations[0]!.phase).toBe("restored"));
  expect(state.restore).toHaveBeenCalledExactlyOnceWith("asset", entry.operationId);
});
it("reuses the operation after an uncertain delete response and can undo the committed deletion", async () => {
  state.remove.mockRejectedValueOnce(new Error("response lost after commit"));
  const { result } = renderHook(usePositionDeletion);
  act(() => result.current.removeAsset("asset", "TEST"));
  await waitFor(() => expect(result.current.operations[0]!.phase).toBe("delete-error"));
  const entry = result.current.operations[0]!;
  act(() => result.current.retry(entry));
  await waitFor(() => expect(result.current.operations[0]!.phase).toBe("deleted"));
  expect(state.remove).toHaveBeenNthCalledWith(2, "asset", entry.operationId);
  act(() => result.current.undo(result.current.operations[0]!));
  await waitFor(() => expect(result.current.operations[0]!.phase).toBe("restored"));
});
it("retains Undo and retries the same operation after a restore failure", async () => {
  state.restore.mockRejectedValueOnce(new Error("restore failed"));
  const { result } = renderHook(usePositionDeletion);
  act(() => result.current.removeAsset("asset", "TEST"));
  await waitFor(() => expect(result.current.operations[0]!.phase).toBe("deleted"));
  act(() => result.current.undo(result.current.operations[0]!));
  await waitFor(() => expect(result.current.operations[0]!.phase).toBe("restore-error"));
  const entry = result.current.operations[0]!;
  act(() => result.current.retry(entry));
  await waitFor(() => expect(result.current.operations[0]!.phase).toBe("restored"));
  expect(state.restore).toHaveBeenNthCalledWith(2, "asset", entry.operationId);
});
it("does not expose another owner's receipts or execute their old Undo callback", async () => {
  const { result, rerender } = renderHook(usePositionDeletion);
  act(() => result.current.removeAsset("asset", "TEST"));
  await waitFor(() => expect(result.current.operations[0]!.phase).toBe("deleted"));
  const entry = result.current.operations[0]!;
  state.user = { id: "other" };
  rerender();
  expect(result.current.operations).toEqual([]);
  act(() => result.current.undo(entry));
  expect(state.restore).not.toHaveBeenCalled();
});
it("keeps a late receipt scoped to its owner and does not strand it after returning", async () => {
  const request = deferred();
  state.remove.mockReturnValueOnce(request.promise);
  const { result, rerender } = renderHook(usePositionDeletion);
  act(() => result.current.removeAsset("asset", "PRIVATE"));
  const entry = result.current.operations[0]!;
  state.user = { id: "other" };
  rerender();
  await act(async () => request.resolve({ ...entry, state: "deleted" }));
  expect(result.current.operations).toEqual([]);
  state.user = { id: "owner" };
  state.list.mockReset().mockResolvedValue([]);
  rerender();
  expect(result.current.operations[0]!.phase).toBe("deleted");
});

function recoveryReceipt() {
  return {
    operationId: "88888888-8888-4888-8888-888888888888",
    assetId: "asset",
    symbol: "TEST",
    state: "deleted" as const,
    expiresAt: "2026-11-14T12:00:00Z",
    serverNow: "2026-11-13T12:00:00Z",
  };
}
it("makes Undo available again after the page unmounts and reloads the owner's server list", async () => {
  const receipt = recoveryReceipt();
  state.list.mockResolvedValue([receipt]);
  const first = renderHook(usePositionDeletion);
  await waitFor(() => expect(first.result.current.operations).toHaveLength(1));
  first.unmount();
  const second = renderHook(usePositionDeletion);
  await waitFor(() => expect(second.result.current.operations).toHaveLength(1));
  expect(second.result.current.operations[0]).toMatchObject({
    operationId: receipt.operationId,
    expiresAt: receipt.expiresAt,
    phase: "deleted",
  });
  act(() => second.result.current.undo(second.result.current.operations[0]!));
  await waitFor(() => expect(second.result.current.operations[0]!.phase).toBe("restored"));
  expect(state.restore).toHaveBeenCalledExactlyOnceWith(receipt.assetId, receipt.operationId);
});
it("hides the previous owner's server list immediately and ignores their delayed list response", async () => {
  let resolve!: (value: ReturnType<typeof recoveryReceipt>[]) => void;
  state.list
    .mockReturnValueOnce(
      new Promise((yes) => {
        resolve = yes;
      }),
    )
    .mockResolvedValueOnce([]);
  const { result, rerender } = renderHook(usePositionDeletion);
  state.user = { id: "other" };
  rerender();
  await act(async () => resolve([recoveryReceipt()]));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.operations).toEqual([]);
});
it("shows a retryable recovery-list error without treating it as an empty list", async () => {
  state.list.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce([recoveryReceipt()]);
  const { result } = renderHook(usePositionDeletion);
  await waitFor(() => expect(result.current.listError).toBe(true));
  act(() => result.current.refresh());
  await waitFor(() => expect(result.current.operations).toHaveLength(1));
  expect(result.current.listError).toBe(false);
});
it("disables expired Undo using server-relative time even with a skewed browser clock", async () => {
  let monotonic = 0;
  vi.spyOn(performance, "now").mockImplementation(() => monotonic);
  state.list.mockResolvedValue([recoveryReceipt()]);
  const { result } = renderHook(usePositionDeletion);
  await waitFor(() => expect(result.current.operations).toHaveLength(1));
  const oldButton = result.current.operations[0]!;
  monotonic = 24 * 60 * 60 * 1000;
  act(() => result.current.undo(oldButton));
  expect(result.current.operations[0]!.phase).toBe("expired");
  expect(state.restore).not.toHaveBeenCalled();
});

it("does not load or show recovery data to a signed-out visitor", () => {
  state.user = null;
  const { result } = renderHook(usePositionDeletion);
  expect(result.current.operations).toEqual([]);
  expect(result.current.loading).toBe(false);
  expect(result.current.listError).toBe(false);
  expect(state.list).not.toHaveBeenCalled();
});
