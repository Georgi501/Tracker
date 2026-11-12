import { CommandMenu } from "@/components/CommandMenu";
import { dictionaries, type Lang } from "@/lib/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  navigate: vi.fn(),
  search: vi.fn(),
  add: vi.fn(),
  theme: vi.fn(),
  language: vi.fn(),
  lang: "en" as Lang,
  user: null as { id: string } | null,
  holdings: [] as { asset: { id: string; symbol: string; name: string } }[],
}));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => state.navigate }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/market.functions", () => ({ searchMarket: (args: unknown) => state.search(args) }));
vi.mock("@/lib/store", () => ({
  usePortfolio: () => ({
    lang: state.lang,
    user: state.user,
    holdings: state.holdings,
    t: (key: keyof typeof dictionaries.en) => dictionaries[state.lang][key],
    toggleTheme: state.theme,
    setLang: state.language,
  }),
}));
let client: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  state.lang = "en";
  state.user = null;
  state.holdings = [];
  state.search.mockResolvedValue({ assets: [], news: [], unavailable: false });
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => {
  cleanup();
  client.clear();
});
function setup() {
  render(
    <QueryClientProvider client={client}>
      <CommandMenu onAddTx={state.add} />
    </QueryClientProvider>,
  );
}
async function open() {
  const trigger = screen.getByRole("button", { name: "Command center" });
  trigger.focus();
  fireEvent.click(trigger);
  const input = screen.getByRole("combobox");
  await waitFor(() => expect(input).toHaveFocus());
  return input;
}
it.each(["ctrlKey", "metaKey"])(
  "opens globally with %s+K for signed-out visitors",
  async (modifier) => {
    setup();
    fireEvent.keyDown(window, { key: "k", [modifier]: true });
    expect(await screen.findByRole("dialog", { name: "Command center" })).toBeInTheDocument();
    expect(state.search).not.toHaveBeenCalled();
  },
);
it("closes on Escape, restores focus, and clears the previous query", async () => {
  setup();
  const input = await open();
  fireEvent.change(input, { target: { value: "a" } });
  fireEvent.keyDown(input, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.getByRole("button", { name: "Command center" })).toHaveFocus();
  expect(await open()).toHaveValue("");
  expect(state.search).not.toHaveBeenCalled();
});
it("shows immediate catalog matches and opens the actual asset detail", async () => {
  setup();
  const input = await open();
  fireEvent.change(input, { target: { value: "NVDA" } });
  fireEvent.click(screen.getByRole("option", { name: /NVDA NVIDIA/ }));
  expect(state.navigate).toHaveBeenCalledWith({ to: "/asset/$symbol", params: { symbol: "NVDA" } });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
it("debounces rapid typing and sends only the public query", async () => {
  setup();
  const input = await open();
  fireEvent.change(input, { target: { value: "n" } });
  fireEvent.change(input, { target: { value: "nv" } });
  fireEvent.change(input, { target: { value: "nvda" } });
  await waitFor(() => expect(state.search).toHaveBeenCalledTimes(1));
  expect(state.search).toHaveBeenCalledWith({ data: { query: "nvda", includeNews: false } });
});
it("never replaces newer results with a slow response for an older query", async () => {
  let resolveOld!: (value: unknown) => void;
  state.search.mockImplementation(({ data }: { data: { query: string } }) =>
    data.query === "zzold"
      ? new Promise((resolve) => {
          resolveOld = resolve;
        })
      : Promise.resolve({
          assets: [{ symbol: "ZZNEW", name: "Latest provider match", type: "stock" }],
          unavailable: false,
        }),
  );
  setup();
  const input = await open();
  fireEvent.change(input, { target: { value: "zzold" } });
  await waitFor(() => expect(state.search).toHaveBeenCalledTimes(1));
  fireEvent.change(input, { target: { value: "zznew" } });
  expect(await screen.findByText("Latest provider match")).toBeInTheDocument();
  await act(async () =>
    resolveOld({
      assets: [{ symbol: "ZZOLD", name: "Earlier provider match", type: "stock" }],
      unavailable: false,
    }),
  );
  expect(screen.queryByText("Earlier provider match")).not.toBeInTheDocument();
  expect(screen.getByText("Latest provider match")).toBeInTheDocument();
});
it("keeps catalog matches available when the provider is unavailable", async () => {
  state.search.mockResolvedValue({ assets: [], news: [], unavailable: true });
  setup();
  const input = await open();
  fireEvent.change(input, { target: { value: "NVDA" } });
  expect(await screen.findByText(/Live search unavailable/)).toBeInTheDocument();
  expect(screen.getByText("NVIDIA Corp.")).toBeInTheDocument();
});
it("supports all registered languages without the old BG/EN toggle", async () => {
  state.lang = "de";
  setup();
  fireEvent.click(screen.getByRole("button", { name: "Kommandozentrale" }));
  expect(screen.getByRole("dialog", { name: "Kommandozentrale" })).toBeInTheDocument();
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "Italiano" } });
  fireEvent.click(screen.getByRole("option", { name: /Italiano/ }));
  expect(state.language).toHaveBeenCalledWith("it");
});
it("searches positions beyond the first twenty holdings", async () => {
  state.user = { id: "owner" };
  state.holdings = Array.from({ length: 25 }, (_, i) => ({
    asset: { id: String(i), symbol: `OWN${i}`, name: `Owned asset ${i}` },
  }));
  setup();
  const input = await open();
  fireEvent.change(input, { target: { value: "OWN24" } });
  expect(screen.getByText("Owned asset 24")).toBeInTheDocument();
});
it("opens the add transaction action only for a signed-in user", async () => {
  state.user = { id: "owner" };
  setup();
  const input = await open();
  fireEvent.change(input, { target: { value: "add transaction" } });
  fireEvent.click(screen.getByRole("option", { name: /Add transaction/ }));
  expect(state.add).toHaveBeenCalledTimes(1);
  expect(state.navigate).not.toHaveBeenCalled();
});

it("executes page navigation with Enter from the keyboard", async () => {
  setup();
  const input = await open();
  fireEvent.change(input, { target: { value: "pricing" } });
  await screen.findByRole("option", { name: /Plans & pricing/ });
  fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
  expect(state.navigate).toHaveBeenCalledWith({ to: "/pricing" });
});
it("reuses fresh public search results when reopening the palette", async () => {
  state.search.mockResolvedValue({
    assets: [{ symbol: "ZZCACHE", name: "Cached provider result", type: "stock" }],
    unavailable: false,
  });
  setup();
  let input = await open();
  fireEvent.change(input, { target: { value: "zzcache" } });
  await screen.findByText("Cached provider result");
  fireEvent.keyDown(input, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  input = await open();
  fireEvent.change(input, { target: { value: "zzcache" } });
  await screen.findByText("Cached provider result");
  expect(state.search).toHaveBeenCalledTimes(1);
});
it("sends signed-out transaction actions to authentication", async () => {
  setup();
  const input = await open();
  fireEvent.change(input, { target: { value: "add transaction" } });
  fireEvent.click(screen.getByRole("option", { name: /Add transaction/ }));
  expect(state.add).not.toHaveBeenCalled();
  expect(state.navigate).toHaveBeenCalledWith({ to: "/auth" });
});

it("keeps catalog navigation usable after a rejected provider request", async () => {
  state.search.mockRejectedValue(new Error("Provider disconnected"));
  setup();
  const input = await open();
  fireEvent.change(input, { target: { value: "NVDA" } });
  expect(await screen.findByText(/Live search unavailable/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("option", { name: /NVDA NVIDIA/ }));
  expect(state.navigate).toHaveBeenCalledWith({ to: "/asset/$symbol", params: { symbol: "NVDA" } });
});
