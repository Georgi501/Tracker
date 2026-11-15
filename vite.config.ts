import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { resolveGoogleClientId } from "./config/google-oauth";

export default defineConfig(({ mode }) => ({
  define: {
    "import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID": JSON.stringify(
      resolveGoogleClientId(
        process.env["CLOUDFLARE_ENV"] || (mode === "production" ? "production" : "development"),
        { ...loadEnv(mode, process.cwd(), "VITE_"), ...process.env },
      ),
    ),
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    tanstackStart({ server: { entry: "server" } }),
    react(),
  ],
  // Worker production maps are disabled because Vite CSS URL rewriting cannot map them accurately.
  // Development source maps are unaffected; do not emit misleading production maps.
  environments: { ssr: { build: { sourcemap: false } } },
  resolve: {
    tsconfigPaths: true,
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
    ignoreOutdatedRequests: true,
  },
  server: {
    host: "::",
    port: 8080,
  },
}));
