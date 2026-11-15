import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { HistoryLoadError } from "@/components/HistoryLoadError";

afterEach(cleanup);
it("keeps the previous complete result visible and allows retry after a history failure", () => {
  const retry = vi.fn();
  const { rerender } = render(
    <>
      <p>Complete history: 1121</p>
      <HistoryLoadError lang="bg" failed pending={false} retry={retry} />
    </>,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Предишната пълна история остава видима");
  expect(screen.getByText("Complete history: 1121")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Опитай отново" }));
  expect(retry).toHaveBeenCalledOnce();
  rerender(<HistoryLoadError lang="bg" failed pending retry={retry} />);
  expect(screen.getByRole("button")).toBeDisabled();
  rerender(<HistoryLoadError lang="bg" failed={false} pending={false} retry={retry} />);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
