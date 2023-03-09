if (process.env.DEPLOYMENT_TARGET === "flyio") {
  module.exports = {
    ignoredRouteFiles: ["**/.*"],
    // appDirectory: "app",
    // assetsBuildDirectory: "public/build",
    // serverBuildPath: "build/index.js",
    // publicPath: "/build/",
    future: {
      v2_meta: true,
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
    serverBuildTarget: "vercel",
    // When running locally in development mode, we use the built in remix
    // server. This does not understand the vercel lambda module format,
    // so we default back to the standard build output.
    server: process.env.NODE_ENV === "development" ? undefined : "./server.js",
    ignoredRouteFiles: [".*"],
    // appDirectory: "app",
    // assetsBuildDirectory: "public/build",
    // serverBuildPath: "api/index.js",
    // publicPath: "/build/",
    sourcemap: true,
    future: {
      v2_meta: true,
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
