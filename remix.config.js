const { createRoutesFromFolders } = require("@remix-run/v1-route-convention");

if (process.env.DEPLOYMENT_TARGET === "flyio") {
  module.exports = {
    ignoredRouteFiles: ["**/.*"],
    // appDirectory: "app",
    // assetsBuildDirectory: "public/build",
    // serverBuildPath: "build/index.js",
    // publicPath: "/build/",
    serverModuleFormat: "cjs",
    future: {},
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
    serverMainFields: ["main", "module"],
    serverModuleFormat: "cjs",
    serverPlatform: "node",
    serverMinify: false,
    ignoredRouteFiles: [".*"],
    // appDirectory: "app",
    // assetsBuildDirectory: "public/build",
    sourcemap: true,
    future: {},
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
