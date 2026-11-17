import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadEnv } from "vite";

const REQUIRED = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"];
export const PRODUCTION_SUPABASE_HOST = "xirvqdnqhyzkovnaqyrf.supabase.co";
export const STAGING_SUPABASE_HOST = "ijaogqbfidyidxclfcij.supabase.co";

function readWranglerStagingSupabaseUrl(cwd) {
  const wranglerPath = path.join(cwd, "wrangler.jsonc");
  if (!existsSync(wranglerPath)) return null;
  const raw = readFileSync(wranglerPath, "utf8");
  const stagingBlock = raw.match(/"staging"\s*:\s*\{[\s\S]*?"SUPABASE_URL"\s*:\s*"([^"]+)"/);
  return stagingBlock?.[1]?.trim() ?? null;
}

// Mirrors Vite: .env files first, real environment variables override them.
export function findProblems(mode, cwd = process.cwd(), env = process.env) {
  const merged = { ...loadEnv(mode, cwd, "VITE_"), ...env };
  const problems = [];
  for (const name of REQUIRED) {
    if (!String(merged[name] ?? "").trim()) problems.push(`${name} is missing or empty`);
  }
  const url = String(merged.VITE_SUPABASE_URL ?? "").trim();
  let parsedUrl = null;
  if (url) {
    try {
      parsedUrl = new URL(url);
      if (!/^https?:$/.test(parsedUrl.protocol)) throw new Error();
    } catch {
      parsedUrl = null;
      problems.push("VITE_SUPABASE_URL is not a valid http(s) URL");
    }
  }
  if (parsedUrl) {
    const host = parsedUrl.hostname.toLowerCase();
    if (mode === "staging") {
      if (host === PRODUCTION_SUPABASE_HOST) {
        problems.push(
          `Staging build cannot use production Supabase project (${PRODUCTION_SUPABASE_HOST})`,
        );
      } else if (host !== STAGING_SUPABASE_HOST) {
        problems.push(
          `Staging build must use staging Supabase project (${STAGING_SUPABASE_HOST}), got ${host}`,
        );
      }
      const wranglerUrl = readWranglerStagingSupabaseUrl(cwd);
      if (wranglerUrl && wranglerUrl.replace(/\/+$/, "") !== url.replace(/\/+$/, "")) {
        problems.push(
          `Staging VITE_SUPABASE_URL (${url}) does not match wrangler.jsonc env.staging.vars.SUPABASE_URL (${wranglerUrl})`,
        );
      }
    } else if (mode === "production" && host === STAGING_SUPABASE_HOST) {
      problems.push(
        `Production build cannot use staging Supabase project (${STAGING_SUPABASE_HOST})`,
      );
    }
  }
  if (mode === "staging" && String(merged.VITE_CREEM_MODE ?? "").trim() === "prod") {
    problems.push("Staging build cannot set VITE_CREEM_MODE=prod");
  }
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2] ?? "production";
  const problems = findProblems(mode);
  if (problems.length) {
    const envFile = mode === "staging" ? ".env.staging" : ".env.production";
    console.error(
      [
        `Build stopped: invalid or missing Supabase/environment settings (mode: ${mode}).`,
        ...problems.map((p) => `  - ${p}`),
        `Set them in ${envFile} (or as environment variables) before building.`,
        "Worker secrets are not enough: they never reach the browser bundle.",
      ].join("\n"),
    );
    process.exit(1);
  }
  console.log(`Build environment OK (${mode}): ${REQUIRED.join(", ")} are set.`);
}
