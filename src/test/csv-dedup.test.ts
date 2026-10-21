import { describe, expect, it } from "vitest";
import { splitDuplicates, type ImportedTx } from "@/lib/csv-import";
const tx = (o: Partial<ImportedTx>): ImportedTx => ({ symbol: "AAPL", name: "Apple", assetType: "stock", kind: "buy", quantity: 10, price: 100, date: "2024-01-15", ...o });
describe("splitDuplicates", () => {
  it("skips a trade already in the portfolio", () => {
    const r = splitDuplicates([tx({}), tx({ date: "2024-02-01" })], [{ symbol: "aapl", kind: "buy", date: "2024-01-15", quantity: 10 }]);
    expect(r.fresh).toHaveLength(1); expect(r.duplicates).toHaveLength(1);
  });
  it("skips a repeated row within the same file", () => {
    expect(splitDuplicates([tx({}), tx({})], []).fresh).toHaveLength(1);
  });
});
