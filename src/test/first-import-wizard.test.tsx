import { FirstImportWizard } from "@/components/FirstImportWizard";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));
afterEach(cleanup);
const broker = { id: "b1", name: "Trading account", format: "trading212" };
it("guides the chosen existing account to a file preview and then summary without saving directly", async () => {
  const upload = vi.fn().mockResolvedValue(undefined),
    create = vi.fn();
  const props = {
    lang: "en" as const,
    brokers: [broker],
    onCreate: create,
    onUpload: upload,
    preparing: false,
    preview: false,
    completed: false,
  };
  const { rerender } = render(<FirstImportWizard {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Trading 212" }));
  expect(screen.getByLabelText("Broker account")).toHaveValue("b1");
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByText(/original currency/)).toBeInTheDocument();
  const file = new File(["csv"], "trades.csv", { type: "text/csv" });
  fireEvent.change(screen.getByLabelText("Choose CSV to preview"), { target: { files: [file] } });
  expect(upload).toHaveBeenCalledExactlyOnceWith("b1", "trading212", file);
  expect(create).not.toHaveBeenCalled();
  rerender(<FirstImportWizard {...props} preview />);
  expect(screen.getByText("3. Review preview")).toHaveAttribute("aria-current", "step");
  rerender(<FirstImportWizard {...props} completed />);
  expect(screen.getByText("4. Import summary")).toHaveAttribute("aria-current", "step");
});
it("offers broker creation instead of inventing or importing into an account", async () => {
  const create = vi.fn().mockResolvedValue(undefined);
  render(
    <FirstImportWizard
      lang="bg"
      brokers={[]}
      onCreate={create}
      onUpload={vi.fn()}
      preparing={false}
      preview={false}
      completed={false}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Revolut" }));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Създай тази брокерска сметка" }));
  });
  expect(create).toHaveBeenCalledExactlyOnceWith("revolut");
});
