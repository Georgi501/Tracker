import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isRateLimited, RATE_LIMITED_PATHS } from "@/server";
import { handleAssetCountriesRequest } from "@/routes/api/public/asset-countries";
import * as assetCountriesServer from "@/lib/asset-countries.server";

describe("security hardening regressions", () => {
  describe("/api/public/analytics rate limiting", () => {
    it("includes /api/public/analytics in RATE_LIMITED_PATHS", () => {
      expect(RATE_LIMITED_PATHS).toContain("/api/public/analytics");
    });

    it("rate-limits per cf-connecting-ip and ignores spoofable x-forwarded-for", async () => {
      const limit = vi.fn(async ({ key }: { key: string }) => ({
        success: !key.endsWith(":198.51.100.7"),
      }));
      const env = { AI_LIMITER: { limit } };

      const blockedReq = new Request("https://capispot.com/api/public/analytics", {
        method: "POST",
        headers: {
          "cf-connecting-ip": "198.51.100.7",
          "x-forwarded-for": "203.0.113.99",
        },
      });
      expect(await isRateLimited(blockedReq, env, "/api/public/analytics")).toBe(true);
      expect(limit).toHaveBeenCalledWith({ key: "/api/public/analytics:198.51.100.7" });

      const otherUserReq = new Request("https://capispot.com/api/public/analytics", {
        method: "POST",
        headers: { "cf-connecting-ip": "203.0.113.10" },
      });
      expect(await isRateLimited(otherUserReq, env, "/api/public/analytics")).toBe(false);
    });

    it("does not fall back to a shared global bucket when cf-connecting-ip is absent", async () => {
      const limit = vi.fn(async () => ({ success: false }));
      const env = { AI_LIMITER: { limit } };

      const req = new Request("https://capispot.com/api/public/analytics", {
        method: "POST",
        headers: { "x-forwarded-for": "198.51.100.7" },
      });
      expect(await isRateLimited(req, env, "/api/public/analytics")).toBe(false);
      expect(limit).not.toHaveBeenCalled();
    });
  });

  describe("SQL migrations 0034 (Stage A) and post-deploy 0035 (Stage C)", () => {
    const sql0034 = readFileSync(
      resolve(process.cwd(), "drizzle/migrations/0034_security_hardening.sql"),
      "utf8",
    );
    const sql0035 = readFileSync(
      resolve(process.cwd(), "drizzle/post-deploy/0035_profiles_owner_only_rls.sql"),
      "utf8",
    );

    it("restricts is_pro(uuid) without relying on SECURITY DEFINER current_user and isolates is_pro_internal", () => {
      expect(sql0034).toMatch(/SET\s+search_path\s*=\s*''/i);
      expect(sql0034).not.toMatch(/auth\.uid\(\)\s+IS\s+NULL/i);
      expect(sql0034).not.toMatch(/current_user\s+IN/i);
      expect(sql0034).toMatch(
        /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.is_pro_internal\(uuid\)\s+FROM\s+PUBLIC,\s*anon,\s*authenticated;/i,
      );
      expect(sql0034).toMatch(
        /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.is_pro_internal\(uuid\)\s+TO\s+service_role;/i,
      );
      expect(sql0034).toMatch(
        /\(auth\.uid\(\)\s+IS\s+NOT\s+NULL\s+AND\s+_user_id\s*=\s*auth\.uid\(\)\)\s+OR\s+auth\.role\(\)\s*=\s*'service_role'/i,
      );
      expect(sql0034).toMatch(
        /REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+public\.is_pro\(uuid\)\s+FROM\s+PUBLIC,\s*anon;/i,
      );
      expect(sql0034).toMatch(
        /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.is_pro\(uuid\)\s+TO\s+authenticated,\s*service_role;/i,
      );
      const adminSource = readFileSync(resolve(process.cwd(), "src/routes/api/admin.ts"), "utf8");
      expect(adminSource).toContain('rpc("is_pro_internal"');
    });

    it("creates public_profiles without referral_code and keeps Stage C out of drizzle/migrations", () => {
      expect(sql0034).toMatch(/CREATE\s+OR\s+REPLACE\s+VIEW\s+public\.public_profiles\s+AS/i);
      expect(sql0034).not.toMatch(
        /CREATE\s+OR\s+REPLACE\s+VIEW\s+public\.public_profiles[\s\S]*referral_code/i,
      );
      expect(sql0034).not.toMatch(/DROP\s+POLICY[\s\S]*"public profiles visible to pro members"/i);
      expect(sql0035).toMatch(
        /DROP\s+POLICY\s+IF\s+EXISTS\s+"public profiles visible to pro members"\s+ON\s+public\.profiles;/i,
      );
    });

    it("updates direct_messages and avatars policies to use public_profiles", () => {
      expect(sql0034).toMatch(
        /CREATE\s+POLICY\s+"pro members send to public members"\s+ON\s+public\.direct_messages[\s\S]*FROM\s+public\.public_profiles/i,
      );
      expect(sql0034).toMatch(
        /DROP\s+POLICY\s+IF\s+EXISTS\s+"members view avatars"\s+ON\s+storage\.objects;/i,
      );
      expect(sql0034).toMatch(
        /CREATE\s+POLICY\s+"authorized members view public avatars"\s+ON\s+storage\.objects[\s\S]*FROM\s+public\.public_profiles/i,
      );
    });
  });

  describe("community routes use public_profiles instead of profiles", () => {
    it.each([
      "src/routes/community.tsx",
      "src/routes/community.$userId.tsx",
      "src/routes/messages.tsx",
      "src/routes/wall.tsx",
    ])("%s queries public_profiles", (file) => {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(source).toContain('.from("public_profiles")');
      expect(source).not.toContain('.from("profiles")');
    });
  });

  describe("/api/public/asset-countries security controls", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("includes /api/public/asset-countries in RATE_LIMITED_PATHS and limits GET per cf-connecting-ip", async () => {
      expect(RATE_LIMITED_PATHS).toContain("/api/public/asset-countries");
      const limit = vi.fn(async ({ key }: { key: string }) => ({
        success: !key.endsWith(":198.51.100.8"),
      }));
      const env = { AI_LIMITER: { limit } };

      const blocked = new Request(
        "https://capispot.com/api/public/asset-countries?symbols=SAP.DE",
        {
          method: "GET",
          headers: { "cf-connecting-ip": "198.51.100.8" },
        },
      );
      expect(await isRateLimited(blocked, env, "/api/public/asset-countries")).toBe(true);
      expect(limit).toHaveBeenCalledWith({ key: "/api/public/asset-countries:198.51.100.8" });

      const allowed = new Request(
        "https://capispot.com/api/public/asset-countries?symbols=SAP.DE",
        {
          method: "GET",
          headers: { "cf-connecting-ip": "203.0.113.11" },
        },
      );
      expect(await isRateLimited(allowed, env, "/api/public/asset-countries")).toBe(false);
    });

    it("rejects arbitrary URLs, oversized queries, and >30 unique symbols, while deduplicating duplicates", async () => {
      const ssrf = await handleAssetCountriesRequest(
        new Request("https://capispot.com/api/public/asset-countries?symbols=https://evil.com"),
      );
      expect(ssrf.status).toBe(400);

      const oversized = await handleAssetCountriesRequest(
        new Request(
          `https://capispot.com/api/public/asset-countries?symbols=${"AAPL,".repeat(120)}`,
        ),
      );
      expect(oversized.status).toBe(400);

      const tooManyUnique = Array.from({ length: 31 }, (_, i) => `SYM${i}`).join(",");
      const overMax = await handleAssetCountriesRequest(
        new Request(`https://capispot.com/api/public/asset-countries?symbols=${tooManyUnique}`),
      );
      expect(overMax.status).toBe(400);

      const spy = vi.spyOn(assetCountriesServer, "resolveAssetCountries").mockResolvedValue({
        countries: { "SAP.DE": "Germany" },
        rateLimited: false,
      });
      const duped = await handleAssetCountriesRequest(
        new Request(
          "https://capispot.com/api/public/asset-countries?symbols=sap.de,SAP.DE,%20sap.de%20",
        ),
      );
      expect(duped.status).toBe(200);
      expect(spy).toHaveBeenCalledWith(["SAP.DE"]);
    });

    it("returns 429 with Retry-After when upstream rate limit occurs with zero cached results", async () => {
      vi.spyOn(assetCountriesServer, "resolveAssetCountries").mockResolvedValue({
        countries: {},
        rateLimited: true,
      });
      const res = await handleAssetCountriesRequest(
        new Request("https://capispot.com/api/public/asset-countries?symbols=BMW.DE"),
      );
      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBe("60");
    });

    it("fails closed without querying Yahoo Finance when external provider is disabled", async () => {
      const { resolveAssetCountries } = await import("@/lib/asset-countries.server");
      const res = await resolveAssetCountries(["BMW.DE"]);
      expect(res).toEqual({ countries: {}, rateLimited: false, providerDisabled: true });

      const apiRes = await handleAssetCountriesRequest(
        new Request("https://capispot.com/api/public/asset-countries?symbols=BMW.DE"),
      );
      expect(apiRes.status).toBe(200);
      expect(await apiRes.json()).toEqual({ countries: {}, disabled: true });
    });
  });
});
