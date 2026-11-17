import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
// @ts-expect-error plain ESM script without type declarations
import { findProblems } from "../../scripts/check-build-env.mjs";

const NAMES = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"];
const emptyDir = () => mkdtempSync(path.join(tmpdir(), "build-env-"));

describe("production build environment check", () => {
  // Vite's loadEnv also reads process.env, so isolate it from the developer's real values.
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const n of NAMES) {
      saved[n] = process.env[n];
      delete process.env[n];
    }
  });
  afterEach(() => {
    for (const n of NAMES) {
      if (saved[n] === undefined) delete process.env[n];
      else process.env[n] = saved[n];
    }
  });

  it("reports both Supabase settings when they are missing", () => {
    const problems = findProblems("production", emptyDir(), {});
    expect(problems).toHaveLength(2);
    expect(problems.join(" ")).toContain("VITE_SUPABASE_URL");
    expect(problems.join(" ")).toContain("VITE_SUPABASE_PUBLISHABLE_KEY");
  });

  it("reports only the setting that is missing", () => {
    const problems = findProblems("production", emptyDir(), {
      VITE_SUPABASE_URL: "https://example.supabase.co",
    });
    expect(problems).toEqual(["VITE_SUPABASE_PUBLISHABLE_KEY is missing or empty"]);
  });

  it("rejects an invalid URL", () => {
    const problems = findProblems("production", emptyDir(), {
      VITE_SUPABASE_URL: "not-a-url",
      VITE_SUPABASE_PUBLISHABLE_KEY: "key",
    });
    expect(problems).toEqual(["VITE_SUPABASE_URL is not a valid http(s) URL"]);
  });

  it("passes with environment variables", () => {
    expect(
      findProblems("production", emptyDir(), {
        VITE_SUPABASE_URL: "https://example.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: "key",
      }),
    ).toEqual([]);
  });

  it("passes with values from .env.production", () => {
    const dir = emptyDir();
    writeFileSync(
      path.join(dir, ".env.production"),
      "VITE_SUPABASE_URL=https://example.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=key\n",
    );
    expect(findProblems("production", dir, {})).toEqual([]);
  });

  it("blocks staging build from using production Supabase or VITE_CREEM_MODE=prod", () => {
    const dir = emptyDir();
    writeFileSync(
      path.join(dir, ".env"),
      "VITE_SUPABASE_URL=https://xirvqdnqhyzkovnaqyrf.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=prod-key\nVITE_CREEM_MODE=prod\n",
    );
    const problems = findProblems("staging", dir, {});
    expect(problems.join(" ")).toContain("xirvqdnqhyzkovnaqyrf.supabase.co");
    expect(problems.join(" ")).toContain("VITE_CREEM_MODE=prod");
  });

  it("blocks production build from accidentally using staging Supabase", () => {
    const problems = findProblems("production", emptyDir(), {
      VITE_SUPABASE_URL: "https://ijaogqbfidyidxclfcij.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "staging-key",
    });
    expect(problems.join(" ")).toContain("ijaogqbfidyidxclfcij.supabase.co");
  });

  it("passes staging build only with staging Supabase and matching wrangler.jsonc", () => {
    const dir = emptyDir();
    writeFileSync(
      path.join(dir, ".env.staging"),
      "VITE_SUPABASE_URL=https://ijaogqbfidyidxclfcij.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=staging-key\nVITE_CREEM_MODE=test\n",
    );
    writeFileSync(
      path.join(dir, "wrangler.jsonc"),
      JSON.stringify({
        env: { staging: { vars: { SUPABASE_URL: "https://ijaogqbfidyidxclfcij.supabase.co" } } },
      }),
    );
    expect(findProblems("staging", dir, {})).toEqual([]);
  });
});
