import { vitePlugin as remix } from "@remix-run/dev";
import { createRoutesFromFolders } from "@remix-run/v1-route-convention";
import { defineConfig, UserConfig } from "vite";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(async (): Promise<UserConfig> => {
  const tsconfigPaths = (await import("vite-tsconfig-paths")).default;

  return {
    plugins: [
      remix({
        ignoredRouteFiles: ["**/*", "**/.*"],
        routes: (defineRoutes) => {
          return createRoutesFromFolders(defineRoutes, {
            ignoredFilePatterns: ["**/.*", "**/*.css"],
          });
        },
        future: {
          unstable_optimizeDeps: true,
          v3_throwAbortReason: true,
          v3_lazyRouteDiscovery: true,
          v3_fetcherPersist: true,
          v3_relativeSplatPath: true,
          v3_singleFetch: true,
        },
      }),
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
