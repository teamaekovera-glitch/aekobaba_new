import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Vite 8 transforms with Oxc and honors tsconfig's `jsx: preserve` (a Next.js
  // convention) — which would leave JSX untransformed in tests. Pin the React
  // automatic runtime here; Next's own tsconfig stays untouched.
  oxc: {
    jsx: { runtime: "automatic" },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "data/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
    },
  },
});
