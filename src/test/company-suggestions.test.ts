import { expect, it } from "vitest";
import { COMPANY_SUGGESTIONS, selectCompanySuggestions } from "@/lib/company-suggestions";
import { MARKET_ASSETS } from "@/lib/market-search";

const symbols = (items: { symbol: string }[]) => items.map(({ symbol }) => symbol);

it("uses only valid stock symbols from the existing instrument catalog", () => {
  for (const company of COMPANY_SUGGESTIONS) {
    expect(MARKET_ASSETS.find(({ symbol }) => symbol === company.symbol)?.type).toBe("stock");
  }
});

it("selects eight unique valid symbols without mutating the source pool", () => {
  const original = COMPANY_SUGGESTIONS.map(({ symbol }) => symbol);
  for (const draw of [0, 0.25, 0.5, 0.999999]) {
    const result = symbols(selectCompanySuggestions(undefined, () => draw));
    expect(result).toHaveLength(8);
    expect(new Set(result).size).toBe(8);
    expect(result.every((symbol) => original.includes(symbol))).toBe(true);
  }
  expect(COMPANY_SUGGESTIONS.map(({ symbol }) => symbol)).toEqual(original);
});

it("changes the combination even if the RNG repeats and previous order differs", () => {
  const first = selectCompanySuggestions(undefined, () => 0);
  const next = selectCompanySuggestions(symbols(first).reverse().join(","), () => 0);
  expect(new Set(symbols(next)).size).toBe(8);
  expect(new Set(symbols(next))).not.toEqual(new Set(symbols(first)));
});

it("ignores invalid previous selections and always returns catalog companies", () => {
  for (const prior of [undefined, "", "AAPL,AAPL", "bad,untrusted,input"]) {
    expect(selectCompanySuggestions(prior, () => 0.5)).toEqual(
      selectCompanySuggestions(undefined, () => 0.5),
    );
  }
});
