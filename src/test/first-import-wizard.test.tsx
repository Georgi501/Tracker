import { FirstImportWizard } from "@/components/FirstImportWizard";
import { SAMPLE_IBKR_CSV, SAMPLE_REVOLUT_CSV, SAMPLE_TRADING212_CSV } from "@/lib/sample-import";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

it("pre-selects the matching broker and account when initialFormat is provided from ?broker=", () => {
  render(
    <FirstImportWizard
      lang="en"
      brokers={[broker, { id: "b2", name: "IBKR Main", format: "ibkr" }]}
      initialFormat="ibkr"
      onCreate={vi.fn()}
      onUpload={vi.fn()}
      preparing={false}
      preview={false}
      completed={false}
    />,
  );
  expect(screen.getByRole("button", { name: "Interactive Brokers" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByLabelText("Broker account")).toHaveValue("b2");
});

it("auto-detects a dropped Trading 212 CSV and uploads directly to an existing account", async () => {
  const upload = vi.fn().mockResolvedValue(undefined);
  const create = vi.fn();
  render(
    <FirstImportWizard
      lang="en"
      brokers={[broker]}
      onCreate={create}
      onUpload={upload}
      preparing={false}
      preview={false}
      completed={false}
    />,
  );
  const file = new File([SAMPLE_TRADING212_CSV], "t212.csv", { type: "text/csv" });
  fireEvent.change(screen.getByLabelText("Drop a broker CSV here to auto-detect"), {
    target: { files: [file] },
  });
  await waitFor(() => expect(upload).toHaveBeenCalledExactlyOnceWith("b1", "trading212", file));
  expect(create).not.toHaveBeenCalled();
  expect(screen.getByText("Detected format: Trading 212")).toBeInTheDocument();
});

it("auto-detects a dropped IBKR or Revolut CSV, creates the account if needed, and triggers preview upload", async () => {
  const upload = vi.fn().mockResolvedValue(undefined);
  const create = vi.fn().mockResolvedValue("new-ibkr-id");
  render(
    <FirstImportWizard
      lang="en"
      brokers={[]}
      onCreate={create}
      onUpload={upload}
      preparing={false}
      preview={false}
      completed={false}
    />,
  );
  const ibkrFile = new File([SAMPLE_IBKR_CSV], "ibkr.csv", { type: "text/csv" });
  const dropzone = screen
    .getByLabelText("Drop a broker CSV here to auto-detect")
    .closest("div") as HTMLElement;
  fireEvent.drop(dropzone, { dataTransfer: { files: [ibkrFile] } });
  await waitFor(() => expect(create).toHaveBeenCalledExactlyOnceWith("ibkr"));
  await waitFor(() =>
    expect(upload).toHaveBeenCalledExactlyOnceWith("new-ibkr-id", "ibkr", ibkrFile),
  );

  const revolutFile = new File([SAMPLE_REVOLUT_CSV], "revolut.csv", { type: "text/csv" });
  create.mockResolvedValueOnce("new-revolut-id");
  fireEvent.drop(dropzone, { dataTransfer: { files: [revolutFile] } });
  await waitFor(() => expect(create).toHaveBeenCalledWith("revolut"));
  await waitFor(() =>
    expect(upload).toHaveBeenCalledWith("new-revolut-id", "revolut", revolutFile),
  );
});
