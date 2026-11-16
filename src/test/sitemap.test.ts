import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { handleSitemapRequest } from "@/routes/sitemap[.]xml";
import { describe, expect, it } from "vitest";

describe("dynamic /sitemap.xml route", () => {
  it("returns valid application/xml with cache headers and public canonical URLs", async () => {
    const response = handleSitemapRequest();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/xml; charset=utf-8");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600, s-maxage=86400");

    const xml = await response.text();
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    );

    for (const path of [
      "/",
      "/markets",
      "/demo",
      "/pricing",
      "/trading212-import",
      "/ibkr-import",
      "/revolut-import",
      "/etf-overlap",
      "/etf-overlap?etfs=VOO,QQQ",
      "/etf-overlap?etfs=VWCE,IWDA",
      "/etf-overlap?etfs=VUAA,EQQQ",
      "/dividend-tracker",
      "/asset/AAPL",
      "/asset/VOO",
      "/asset/VWCE",
    ]) {
      expect(xml).toContain(`<loc>https://capispot.com${path}</loc>`);
    }

    for (const hreflang of ["en", "bg", "de", "es", "it", "x-default"]) {
      expect(xml).toContain(`rel="alternate" hreflang="${hreflang}"`);
    }
    expect(xml).toContain("https://capispot.com/etf-overlap?etfs=VOO,QQQ&amp;lang=de");
  });

  it("strictly excludes authenticated and private routes", async () => {
    const xml = await handleSitemapRequest().text();
    for (const forbidden of [
      "/holdings",
      "/analytics",
      "/advisor",
      "/settings",
      "/account",
      "/admin",
      "/api/",
    ]) {
      expect(xml).not.toContain(forbidden);
    }
  });

  it("robots.txt declares sitemap.xml and disallows private app routes", () => {
    const robots = readFileSync(resolve(process.cwd(), "public/robots.txt"), "utf8");
    expect(robots).toContain("Sitemap: https://capispot.com/sitemap.xml");
    for (const disallowed of [
      "/holdings",
      "/analytics",
      "/advisor",
      "/settings",
      "/account",
      "/admin",
      "/api/",
    ]) {
      expect(robots).toContain(`Disallow: ${disallowed}`);
    }
  });
});
