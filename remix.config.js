const { createRoutesFromFolders } = require("@remix-run/v1-route-convention");

if (process.env.DEPLOYMENT_TARGET === "flyio") {
  module.exports = {
    ignoredRouteFiles: ["**/.*"],
    // appDirectory: "app",
    // assetsBuildDirectory: "public/build",
    // serverBuildPath: "build/index.js",
    // publicPath: "/build/",
    serverModuleFormat: "cjs",
    future: {
      v2_meta: true,
      v2_normalizeFormMethod: true,
      v2_errorBoundary: true,
      v2_routeConvention: true,
      v2_dev: true,
      v2_headers: true,
    },
    routes(defineRoutes) {
      // uses the v1 convention, works in v1.15+ and v2
      return createRoutesFromFolders(defineRoutes);
    },
    serverDependenciesToBundle: [
      "@formkit/auto-animate/react",
      "recharts",
      "d3-shape",
      "d3-scale",
      "d3-path",
      "d3-array",
      "d3-color",
      "internmap",
      "d3-interpolate",
      "d3-format",
      "d3-time",
      "d3-time-format",
      "react-is",
    ],
  };
} else {
  /**
   * @type {import('@remix-run/dev').AppConfig}
   */
  module.exports = {
    publicPath: "/build/",
    serverBuildPath: "api/index.js",
    serverMainFields: ["main", "module"],
    serverModuleFormat: "cjs",
    serverPlatform: "node",
    serverMinify: false,
    // When running locally in development mode, we use the built in remix
    // server. This does not understand the vercel lambda module format,
    // so we default back to the standard build output.
    server: process.env.NODE_ENV === "development" ? undefined : "./server.js",
    ignoredRouteFiles: [".*"],
    // appDirectory: "app",
    // assetsBuildDirectory: "public/build",
    sourcemap: true,
    future: {
      v2_meta: true,
      v2_normalizeFormMethod: true,
      v2_errorBoundary: true,
      v2_routeConvention: true,
      v2_dev: true,
      v2_headers: true,
    },
    routes(defineRoutes) {
      // uses the v1 convention, works in v1.15+ and v2
      return createRoutesFromFolders(defineRoutes);
    },
    serverDependenciesToBundle: [
      "@formkit/auto-animate/react",
      "recharts",
      "d3-shape",
      "d3-scale",
      "d3-path",
      "d3-array",
      "d3-color",
      "internmap",
      "d3-interpolate",
      "d3-format",
      "d3-time",
      "d3-time-format",
      "react-is",
    ],
  };
}
