import { expect, it, vi } from "vitest";
import { convertImport } from "@/lib/history.functions";

vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate: (input: unknown) => unknown = (input) => input;
    const builder = {
      middleware: () => builder,
      validator: (fn: typeof validate) => {
        validate = fn;
        return builder;
      },
      handler: (fn: (input: { data: unknown }) => unknown) => (input: { data: unknown }) =>
        fn({ data: validate(input.data) }),
    };
    return builder;
  },
}));
vi.mock("@/lib/history.server", () => ({
  dailyHistory: vi.fn().mockResolvedValue({ prices: [{ date: "2024-02-01", close: 1.1 }] }),
}));

it("keeps provider identity through server validation and dated FX conversion", async () => {
  const row = {
    symbol: "AAPL",
    name: "Apple",
    assetType: "stock" as const,
    kind: "buy" as const,
    quantity: 2,
    price: 100,
    fee: 2,
    date: "2024-02-01",
    currency: "EUR" as const,
    sourceTransactionId: "t212:fill:101",
    sourceExecutedAt: "2024-02-01 10:00:00",
  };
  const result = await convertImport({ data: { rows: [row] } });
  expect(result[0]).toMatchObject({
    sourceTransactionId: row.sourceTransactionId,
    sourceExecutedAt: row.sourceExecutedAt,
    currency: "USD",
  });
  expect(result[0]!.price).toBeCloseTo(110);
  expect(result[0]!.fee).toBeCloseTo(2.2);
});
