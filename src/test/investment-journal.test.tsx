import type { ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { InvestmentJournal } from "@/components/InvestmentJournal";

type Note = { thesis: string; horizon: string; review_date: string | null };
type Result = { data: Note | null; error: { message: string } | null };
const state = vi.hoisted(() => ({
  user: { id: "user-a" } as { id: string } | null,
  load: vi.fn(),
  upsert: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@/lib/store", () => ({ usePortfolio: () => ({ user: state.user, lang: "en" }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const filters: Record<string, string> = {};
      const query = {
        select: () => query,
        eq: (key: string, value: string) => {
          filters[key] = value;
          return query;
        },
        maybeSingle: () => state.load(filters),
        upsert: state.upsert,
      };
      return query;
    },
  },
}));
vi.mock("@/components/AppShell", () => ({
  Card: ({ children }: { children: ReactNode }) => <section>{children}</section>,
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));
vi.mock("sonner", () => ({ toast: { success: state.success, error: state.error } }));
const copy = {
  journal: "Journal",
  signIn: "Sign in",
  thesis: "Thesis",
  horizon: "Horizon",
  review: "Review",
  due: "Review due",
  save: "Save",
  saved: "Saved",
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const note = (thesis: string): Result => ({
  data: { thesis, horizon: "Long term", review_date: "2030-01-01" },
  error: null,
});
const empty: Result = { data: null, error: null };
const form = (symbol = "AAPL") => <InvestmentJournal symbol={symbol} c={copy} />;
const thesis = () => screen.getByLabelText("Thesis");
const save = () => screen.getByRole("button", { name: "Save" });
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  state.user = { id: "user-a" };
  state.load.mockReset().mockResolvedValue(empty);
  state.upsert.mockReset().mockResolvedValue({ error: null });
});

it("clears every field immediately for a new asset, then allows an empty note", async () => {
  const pending = deferred<Result>();
  state.load.mockResolvedValueOnce(note("Apple thesis")).mockReturnValueOnce(pending.promise);
  const view = render(form());
  await waitFor(() => expect(thesis()).toHaveValue("Apple thesis"));
  view.rerender(form("MSFT"));
  expect(thesis()).toHaveValue("");
  expect(screen.getByLabelText("Horizon")).toHaveValue("");
  expect(screen.getByLabelText("Review")).toHaveValue("");
  expect(save()).toBeDisabled();
  await act(async () => pending.resolve(empty));
  expect(thesis()).toHaveValue("");
  expect(save()).toBeEnabled();
});

it("ignores old loads across A to B to A, including the first A response", async () => {
  const first = deferred<Result>(),
    second = deferred<Result>(),
    latest = deferred<Result>();
  state.load
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise)
    .mockReturnValueOnce(latest.promise);
  const view = render(form());
  view.rerender(form("MSFT"));
  view.rerender(form());
  await act(async () => latest.resolve(note("Current A")));
  await act(async () => {
    second.resolve(note("Old B"));
    first.resolve(note("Old A"));
  });
  expect(thesis()).toHaveValue("Current A");
});

it("clears the previous user's draft and ignores their late load", async () => {
  const old = deferred<Result>(),
    current = deferred<Result>();
  state.load.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
  const view = render(form());
  state.user = { id: "user-b" };
  view.rerender(form());
  expect(thesis()).toHaveValue("");
  expect(save()).toBeDisabled();
  await act(async () => current.resolve(note("B private thesis")));
  await act(async () => old.resolve(note("A private thesis")));
  expect(thesis()).toHaveValue("B private thesis");
  expect(state.load).toHaveBeenLastCalledWith({ user_id: "user-b", symbol: "AAPL" });
  fireEvent.change(thesis(), { target: { value: "B edited" } });
  fireEvent.click(save());
  expect(state.upsert).toHaveBeenCalledWith(
    expect.objectContaining({ user_id: "user-b", symbol: "AAPL", thesis: "B edited" }),
    { onConflict: "user_id,symbol" },
  );
});

it("keeps a started save bound to its original user and asset and ignores its late completion", async () => {
  const saving = deferred<{ error: null }>();
  state.load.mockResolvedValueOnce(note("A thesis")).mockResolvedValueOnce(note("B thesis"));
  state.upsert.mockReturnValueOnce(saving.promise);
  const view = render(form());
  await waitFor(() => expect(thesis()).toHaveValue("A thesis"));
  fireEvent.click(save());
  expect(state.upsert).toHaveBeenCalledWith(
    expect.objectContaining({ user_id: "user-a", symbol: "AAPL", thesis: "A thesis" }),
    { onConflict: "user_id,symbol" },
  );
  state.user = { id: "user-b" };
  view.rerender(form("MSFT"));
  await waitFor(() => expect(thesis()).toHaveValue("B thesis"));
  fireEvent.change(thesis(), { target: { value: "B draft" } });
  await act(async () => saving.resolve({ error: null }));
  expect(thesis()).toHaveValue("B draft");
  expect(save()).toBeEnabled();
  expect(state.success).not.toHaveBeenCalled();
  fireEvent.click(save());
  expect(state.upsert).toHaveBeenLastCalledWith(
    expect.objectContaining({ user_id: "user-b", symbol: "MSFT", thesis: "B draft" }),
    { onConflict: "user_id,symbol" },
  );
  await waitFor(() => expect(state.success).toHaveBeenCalledWith("Saved"));
});

it.each(["response", "rejection"])(
  "blocks edits and saves after a load %s error until retry succeeds",
  async (failure) => {
    if (failure === "response")
      state.load.mockResolvedValueOnce({ data: null, error: { message: "Database failed" } });
    else state.load.mockRejectedValueOnce(new Error("Network failed"));
    const retry = deferred<Result>();
    state.load.mockReturnValueOnce(retry.promise);
    render(form());
    await screen.findByRole("alert");
    expect(thesis()).toBeDisabled();
    expect(save()).toBeDisabled();
    fireEvent.click(save());
    expect(state.upsert).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(save()).toBeDisabled();
    await act(async () => retry.resolve(note("Existing saved thesis")));
    expect(thesis()).toHaveValue("Existing saved thesis");
    expect(save()).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  },
);

it("does not show a loaded private draft after sign out or sign in as another user", async () => {
  state.load.mockResolvedValueOnce(note("Private A"));
  const view = render(form());
  await waitFor(() => expect(thesis()).toHaveValue("Private A"));
  state.user = null;
  view.rerender(form());
  expect(screen.queryByLabelText("Thesis")).not.toBeInTheDocument();
  state.user = { id: "user-b" };
  view.rerender(form());
  expect(thesis()).toHaveValue("");
  await waitFor(() => expect(save()).toBeEnabled());
});
it("keeps the new A save busy when an older A save completes after A to B to A", async () => {
  const oldSave = deferred<{ error: null }>(),
    currentSave = deferred<{ error: null }>();
  state.load.mockResolvedValue(note("Loaded thesis"));
  state.upsert.mockReturnValueOnce(oldSave.promise).mockReturnValueOnce(currentSave.promise);
  const view = render(form());
  await waitFor(() => expect(save()).toBeEnabled());
  fireEvent.click(save());
  view.rerender(form("MSFT"));
  view.rerender(form());
  await waitFor(() => expect(save()).toBeEnabled());
  fireEvent.change(thesis(), { target: { value: "New A draft" } });
  fireEvent.click(save());
  expect(save()).toBeDisabled();
  await act(async () => oldSave.resolve({ error: null }));
  expect(save()).toBeDisabled();
  expect(thesis()).toHaveValue("New A draft");
  expect(state.success).not.toHaveBeenCalled();
  await act(async () => currentSave.resolve({ error: null }));
  expect(save()).toBeEnabled();
  expect(state.success).toHaveBeenCalledTimes(1);
});

it("ignores a failed old save after changing identity", async () => {
  const oldSave = deferred<{ error: null }>();
  state.upsert.mockReturnValueOnce(oldSave.promise);
  render(form());
  await waitFor(() => expect(save()).toBeEnabled());
  fireEvent.click(save());
  cleanup();
  state.user = { id: "user-b" };
  render(form("MSFT"));
  await waitFor(() => expect(save()).toBeEnabled());
  await act(async () => oldSave.reject(new Error("Old write rejected by RLS")));
  expect(thesis()).toHaveValue("");
  expect(save()).toBeEnabled();
  expect(state.error).not.toHaveBeenCalled();
});

it("retains the current draft and allows retry when a save rejects", async () => {
  state.upsert.mockRejectedValueOnce(new Error("Network failed"));
  render(form());
  expect(save()).toBeDisabled();
  fireEvent.click(save());
  expect(state.upsert).not.toHaveBeenCalled();
  await waitFor(() => expect(save()).toBeEnabled());
  fireEvent.change(thesis(), { target: { value: "Unsaved draft" } });
  fireEvent.click(save());
  await waitFor(() => expect(state.error).toHaveBeenCalledTimes(1));
  expect(thesis()).toHaveValue("Unsaved draft");
  expect(save()).toBeEnabled();
  fireEvent.click(save());
  await waitFor(() => expect(state.success).toHaveBeenCalledWith("Saved"));
});
