import { execFileSync } from "node:child_process";
import { findProblems } from "./check-build-env.mjs";

const problems = findProblems("staging");
if (problems.length) {
  console.error(
    [
      "Build stopped: invalid or missing Supabase/environment settings (mode: staging).",
      ...problems.map((p) => `  - ${p}`),
      "Set them in .env.staging (or as environment variables) before building.",
      "Worker secrets are not enough: they never reach the browser bundle.",
    ].join("\n"),
  );
  process.exit(1);
}

console.log(
  "Build environment OK (staging): VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY are set.",
);

const viteBin = process.platform === "win32" ? "npx.cmd" : "npx";
execFileSync(viteBin, ["vite", "build", "--mode", "staging"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    CLOUDFLARE_ENV: "staging",
  },
});
