import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, UserConfig } from "vite";
import { visualizer } from "rollup-plugin-visualizer";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(async (): Promise<UserConfig> => {
  const tsconfigPaths = (await import("vite-tsconfig-paths")).default;

  return {
    plugins: [
      reactRouter(),
      tailwindcss(),
      tsconfigPaths(),
      visualizer({ emitFile: true }),
    ],
    optimizeDeps: {
      exclude: ["newrelic"],
    },
    server: {
      port: 3000,
    },
  };
});
