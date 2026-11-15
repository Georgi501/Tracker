import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PositionDeletionNotices } from "@/components/PositionDeletionNotices";
import type { PositionOperation } from "@/hooks/use-position-deletion";
afterEach(cleanup);
const entry: PositionOperation = {
  operationId: "operation",
  assetId: "asset",
  symbol: "TEST",
  userId: "owner",
  phase: "deleted",
  expiresAt: "2026-11-14T12:00:00Z",
};
it("shows the exact recovery deadline and 24-hour window with an accessible Undo button", () => {
  const undo = vi.fn();
  const view = render(
    <PositionDeletionNotices
      operations={[entry]}
      lang="bg"
      loading={false}
      listError={false}
      refresh={vi.fn()}
      undo={undo}
      retry={vi.fn()}
    />,
  );
  expect(screen.getByText(/24 часа/)).toBeInTheDocument();
  expect(view.container.querySelector("time")).toHaveAttribute("datetime", entry.expiresAt);
  fireEvent.click(screen.getByRole("button", { name: "Отмени" }));
  expect(undo).toHaveBeenCalledExactlyOnceWith(entry);
});
it("shows expiry with no Undo or retry action", () => {
  render(
    <PositionDeletionNotices
      operations={[{ ...entry, phase: "expired" }]}
      lang="en"
      loading={false}
      listError={false}
      refresh={vi.fn()}
      undo={vi.fn()}
      retry={vi.fn()}
    />,
  );
  expect(screen.getByText(/24-hour recovery period has expired/)).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
it("offers a list retry when deleted positions cannot be loaded", () => {
  const refresh = vi.fn();
  render(
    <PositionDeletionNotices
      operations={[]}
      lang="en"
      loading={false}
      listError
      refresh={refresh}
      undo={vi.fn()}
      retry={vi.fn()}
    />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Deleted positions could not be loaded");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(refresh).toHaveBeenCalledTimes(1);
});
