import { defineConfig } from "vitest/config";
import path from "path";

// Standalone from vite.config.ts: the app's dev-server plugins are not needed
// for unit tests, only the "@/" path alias the source uses.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
