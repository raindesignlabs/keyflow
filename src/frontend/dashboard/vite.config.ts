import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const dashboardRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: dashboardRoot,
  base: "/dashboard/",
  plugins: [react()],
  build: {
    outDir: resolve(dashboardRoot, "../../../dist/frontend/dashboard"),
    emptyOutDir: true,
    sourcemap: true,
  },
});
