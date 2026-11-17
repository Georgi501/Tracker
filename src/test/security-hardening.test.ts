import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { isRateLimited, RATE_LIMITED_PATHS } from "@/server";

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

  describe("SQL migrations 0034 (Stage A) and 0035 (Stage C)", () => {
    const sql0034 = readFileSync(
      resolve(process.cwd(), "drizzle/migrations/0034_security_hardening.sql"),
      "utf8",
    );
    const sql0035 = readFileSync(
      resolve(process.cwd(), "drizzle/migrations/0035_profiles_owner_only_rls.sql"),
      "utf8",
    );

    it("prevents Pro-status enumeration via is_pro(uuid) for anon and other users", () => {
      expect(sql0034).toMatch(/auth\.uid\(\)\s+IS\s+NULL\s+OR\s+_user_id\s*=\s*auth\.uid\(\)/i);
      expect(sql0034).toMatch(
        /REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+public\.is_pro\(uuid\)\s+FROM\s+PUBLIC,\s*anon;/i,
      );
      expect(sql0034).toMatch(
        /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.is_pro\(uuid\)\s+TO\s+authenticated,\s*service_role;/i,
      );
    });

    it("creates public_profiles without referral_code and contracts profiles in 0035", () => {
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
});
