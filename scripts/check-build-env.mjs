import { loadEnv } from "vite";
import { pathToFileURL } from "node:url";

const REQUIRED = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"];

// Mirrors Vite: .env files first, real environment variables override them.
export function findProblems(mode, cwd = process.cwd(), env = process.env) {
  const merged = { ...loadEnv(mode, cwd, "VITE_"), ...env };
  const problems = [];
  for (const name of REQUIRED) {
    if (!String(merged[name] ?? "").trim()) problems.push(`${name} is missing or empty`);
  }
  const url = String(merged.VITE_SUPABASE_URL ?? "").trim();
  if (url) {
    try {
      if (!/^https?:$/.test(new URL(url).protocol)) throw new Error();
    } catch {
      problems.push("VITE_SUPABASE_URL is not a valid http(s) URL");
    }
  }
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2] ?? "production";
  const problems = findProblems(mode);
  if (problems.length) {
    console.error(
      [
        `Build stopped: the browser bundle would ship without Supabase settings (mode: ${mode}).`,
        ...problems.map((p) => `  - ${p}`),
        "Set them in .env.production (or as environment variables) before building.",
        "Worker secrets are not enough: they never reach the browser bundle.",
      ].join("\n"),
    );
    process.exit(1);
  }
  console.log(`Build environment OK (${mode}): ${REQUIRED.join(", ")} are set.`);
}
