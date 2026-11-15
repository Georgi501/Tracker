import { webcrypto } from "node:crypto";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AuthForm } from "@/components/AuthForm";
import { dictionaries, type Lang } from "@/lib/i18n";
import { authCopy } from "@/lib/auth-i18n";

const state = vi.hoisted(() => ({
  lang: "en" as Lang,
  load: vi.fn(),
  password: vi.fn(),
  token: vi.fn(),
  initialize: vi.fn(),
  button: vi.fn(),
}));
vi.mock("@/lib/google-identity", () => ({ loadGoogleIdentityScript: state.load }));
vi.mock("@/lib/analytics", () => ({ trackAnalyticsEvent: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signInWithPassword: state.password, signInWithIdToken: state.token } },
}));
vi.mock("@/lib/store", () => ({
  usePortfolio: () => ({
    lang: state.lang,
    user: null,
    t: (key: keyof typeof dictionaries.en) => dictionaries[state.lang][key],
  }),
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("crypto", webcrypto);
  vi.stubEnv("VITE_GOOGLE_WEB_CLIENT_ID", "123-test.apps.googleusercontent.com");
  state.lang = "en";
  state.load.mockResolvedValue(undefined);
  state.password.mockResolvedValue({ error: null });
  state.token.mockResolvedValue({ error: null });
  window.google = {
    accounts: { id: { initialize: state.initialize, renderButton: state.button } },
  };
});
afterEach(() => {
  cleanup();
  delete window.google;
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function passwordLogin() {
  fireEvent.change(screen.getByRole("textbox", { name: /email/i }), {
    target: { value: "tester@example.test" },
  });
  fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "test-password" } });
  fireEvent.click(screen.getByRole("button", { name: /^Sign in$/ }));
  await waitFor(() =>
    expect(state.password).toHaveBeenCalledWith({
      email: "tester@example.test",
      password: "test-password",
    }),
  );
}
it("keeps password login usable without loading GIS when no client is configured", async () => {
  vi.stubEnv("VITE_GOOGLE_WEB_CLIENT_ID", "");
  const signedIn = vi.fn();
  render(<AuthForm onSignedIn={signedIn} />);
  expect(state.load).not.toHaveBeenCalled();
  expect(screen.queryByText(authCopy.en.googleLoading)).not.toBeInTheDocument();
  await passwordLogin();
  await waitFor(() => expect(signedIn).toHaveBeenCalledOnce());
});
it("passes the configured client and preserves hashed/raw nonce verification", async () => {
  render(<AuthForm />);
  await waitFor(() => expect(state.initialize).toHaveBeenCalledOnce());
  const options = state.initialize.mock.calls[0]![0];
  expect(options.client_id).toBe("123-test.apps.googleusercontent.com");
  options.callback({ credential: "synthetic-google-credential" });
  await waitFor(() => expect(state.token).toHaveBeenCalledOnce());
  const args = state.token.mock.calls[0]![0];
  expect(args.provider).toBe("google");
  expect(args.token).toBe("synthetic-google-credential");
  const digest = await webcrypto.subtle.digest("SHA-256", new TextEncoder().encode(args.nonce));
  expect(options.nonce).toBe(Buffer.from(digest).toString("hex"));
  expect(options.nonce).not.toBe(args.nonce);
});
it("ignores an obsolete locale SDK response", async () => {
  let first!: () => void, second!: () => void;
  state.load
    .mockImplementationOnce(
      () =>
        new Promise<void>((r) => {
          first = r;
        }),
    )
    .mockImplementationOnce(
      () =>
        new Promise<void>((r) => {
          second = r;
        }),
    );
  const view = render(<AuthForm />);
  state.lang = "bg";
  view.rerender(<AuthForm />);
  first();
  await Promise.resolve();
  expect(state.initialize).not.toHaveBeenCalled();
  second();
  await waitFor(() => expect(state.button).toHaveBeenCalled());
  expect(state.initialize).toHaveBeenCalledOnce();
  expect(state.button.mock.calls[0]![1].locale).toBe("bg");
});
it("keeps password login usable when GIS fails", async () => {
  state.load.mockRejectedValueOnce(new Error("SDK unavailable"));
  render(<AuthForm />);
  await screen.findByText(authCopy.en.googleLoadError);
  await passwordLogin();
});
