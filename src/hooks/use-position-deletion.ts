import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listPositionDeletions, type PositionReceipt } from "@/lib/position-deletion";
import { usePortfolio } from "@/lib/store";

type Action = "delete" | "restore";
export type PositionOperation = {
  operationId: string;
  assetId: string;
  symbol: string;
  userId: string;
  expiresAt?: string;
  deadlineAt?: number;
  phase:
    | "deleting"
    | "deleted"
    | "restoring"
    | "restored"
    | "expired"
    | "delete-error"
    | "restore-error";
};
function deadline(receipt: PositionReceipt) {
  return {
    expiresAt: receipt.expiresAt,
    deadlineAt:
      performance.now() +
      Math.max(0, Date.parse(receipt.expiresAt) - Date.parse(receipt.serverNow)),
  };
}
export function usePositionDeletion() {
  const p = usePortfolio();
  const userId = p.user?.id;
  const operations = useRef(new Map<string, PositionOperation>());
  const [, update] = useState(0);
  const [listAttempt, setListAttempt] = useState(0);
  const [listState, setListState] = useState<{
    userId: string;
    loading: boolean;
    error: boolean;
  } | null>(null);
  const mounted = useRef(false);
  const currentUser = useRef(userId);
  currentUser.current = userId;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const baseline = new Map(operations.current);
    setListState({ userId, loading: true, error: false });
    void listPositionDeletions(supabase)
      .then((receipts) => {
        if (!active) return;
        const present = new Set(receipts.map((receipt) => receipt.operationId));
        for (const [id, entry] of baseline) {
          if (
            entry.userId === userId &&
            entry.phase === "deleted" &&
            !present.has(id) &&
            operations.current.get(id) === entry
          )
            operations.current.delete(id);
        }
        for (const receipt of receipts) {
          const existing = operations.current.get(receipt.operationId);
          // A list started before a local write must not replace that write's state.
          if (
            existing &&
            (existing !== baseline.get(receipt.operationId) ||
              existing.phase === "deleting" ||
              existing.phase === "restoring" ||
              existing.phase === "restored")
          )
            continue;
          operations.current.set(receipt.operationId, {
            operationId: receipt.operationId,
            assetId: receipt.assetId,
            symbol: receipt.symbol,
            userId,
            ...deadline(receipt),
            phase: receipt.state,
          });
        }
        setListState({ userId, loading: false, error: false });
      })
      .catch(() => {
        if (active) setListState({ userId, loading: false, error: true });
      });
    return () => {
      active = false;
    };
  }, [userId, listAttempt]);
  const hasActiveCountdown = Array.from(operations.current.values()).some(
    (entry) => entry.phase === "deleted" && entry.deadlineAt !== undefined,
  );
  useEffect(() => {
    if (!userId) return;
    const refresh = () => setListAttempt((value) => value + 1);
    const timer = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [userId]);
  useEffect(() => {
    if (!userId || !hasActiveCountdown) return;
    const tick = setInterval(() => update((value) => value + 1), 1000);
    return () => clearInterval(tick);
  }, [userId, hasActiveCountdown]);
  const publish = (entry: PositionOperation) => {
    operations.current.set(entry.operationId, entry);
    if (mounted.current) update((version) => version + 1);
  };
  const run = async (entry: PositionOperation, action: Action) => {
    if (currentUser.current !== entry.userId) return;
    const latest = operations.current.get(entry.operationId);
    if (latest?.phase === "deleting" || latest?.phase === "restoring") return;
    if (
      action === "restore" &&
      entry.deadlineAt !== undefined &&
      performance.now() >= entry.deadlineAt
    ) {
      publish({ ...entry, phase: "expired" });
      return;
    }
    publish({ ...entry, phase: action === "delete" ? "deleting" : "restoring" });
    try {
      const result = await (action === "delete" ? p.deletePosition : p.restorePosition)(
        entry.assetId,
        entry.operationId,
      );
      publish({ ...entry, ...deadline(result), phase: result.state });
    } catch {
      publish({ ...entry, phase: action === "delete" ? "delete-error" : "restore-error" });
    }
  };
  const removeAsset = (assetId: string, symbol: string) => {
    if (!userId) return;
    const existing = [...operations.current.values()].find(
      (entry) =>
        entry.assetId === assetId &&
        entry.userId === userId &&
        entry.phase !== "restored" &&
        entry.phase !== "expired",
    );
    if (existing) {
      if (existing.phase === "delete-error") void run(existing, "delete");
      return;
    }
    void run(
      { assetId, symbol, userId, operationId: crypto.randomUUID(), phase: "restored" },
      "delete",
    );
  };
  const visible = [...operations.current.values()]
    .filter((entry) => entry.userId === userId)
    .map((entry) =>
      (entry.phase === "deleted" || entry.phase === "restore-error") &&
      entry.deadlineAt !== undefined &&
      performance.now() >= entry.deadlineAt
        ? { ...entry, phase: "expired" as const }
        : entry,
    );
  return {
    removeAsset,
    operations: visible,
    loading: !!userId && (listState?.userId !== userId || listState.loading),
    listError: !!(userId && listState?.userId === userId && listState.error),
    refresh: () => setListAttempt((value) => value + 1),
    retry: (entry: PositionOperation) =>
      void run(entry, entry.phase === "delete-error" ? "delete" : "restore"),
    undo: (entry: PositionOperation) => {
      if (entry.phase === "deleted") void run(entry, "restore");
    },
  };
}
