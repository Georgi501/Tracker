import { describe, expect, it } from "vitest";
import { searchCatalog, ucitsInfo, isIsin } from "@/lib/market-search";
import { nativeCurrency, resolveAsset } from "@/components/AddTransactionDialog";
describe("UCITS ETFs", () => {
  it("finds VWCE by ISIN", () => { expect(searchCatalog("IE00BK5BQT80")[0]?.symbol).toBe("VWCE.DE"); });
  it("finds MSCI World UCITS by index words", () => { expect(searchCatalog("msci world").map((a) => a.symbol)).toContain("IWDA.AS"); });
  it("resolves an ISIN typed as the name to the ticker", () => { expect(resolveAsset("IE00B5BMR087", "")?.symbol).toBe("SXR8.DE"); });
  it("knows accumulating vs distributing", () => { expect(ucitsInfo("VWRL.AS")?.policy).toBe("dist"); expect(ucitsInfo("VWCE.DE")?.policy).toBe("acc"); });
  it("XETRA listings default to EUR", () => { expect(nativeCurrency("SXR8.DE")).toBe("EUR"); });
  it("validates ISIN shape", () => { expect(isIsin("IE00BK5BQT80")).toBe(true); expect(isIsin("VWCE")).toBe(false); });
});
