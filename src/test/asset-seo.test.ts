import { hreflangLinks } from "@/lib/seo";
import { buildAssetHeadScripts } from "@/routes/asset.$symbol";
import { describe, expect, it } from "vitest";

describe("asset & hreflang technical SEO", () => {
  it("emits BreadcrumbList and Corporation JSON-LD for curated stocks", () => {
    const scripts = buildAssetHeadScripts("AAPL");
    const parsed = scripts.map((s) => JSON.parse(s.children) as Record<string, unknown>);
    expect(parsed[0]?.["@type"]).toBe("BreadcrumbList");
    expect(parsed[1]?.["@type"]).toBe("Corporation");
    expect(parsed[1]?.["tickerSymbol"]).toBe("AAPL");
  });

  it("emits BreadcrumbList and InvestmentFund JSON-LD for supported ETFs", () => {
    const scripts = buildAssetHeadScripts("VOO");
    const parsed = scripts.map((s) => JSON.parse(s.children) as Record<string, unknown>);
    expect(parsed[0]?.["@type"]).toBe("BreadcrumbList");
    expect(parsed[1]?.["@type"]).toBe("InvestmentFund");
    expect(parsed[1]?.["tickerSymbol"]).toBe("VOO");
  });

  it("emits hreflang alternates for all 5 languages plus x-default", () => {
    const links = hreflangLinks("/etf-overlap");
    expect(links.map((l) => l.hrefLang)).toEqual(["en", "bg", "de", "es", "it", "x-default"]);
    expect(links.find((l) => l.hrefLang === "de")?.href).toBe(
      "https://capispot.com/etf-overlap?lang=de",
    );
    expect(links.find((l) => l.hrefLang === "x-default")?.href).toBe(
      "https://capispot.com/etf-overlap",
    );
  });
});
