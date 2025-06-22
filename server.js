import express, { static as expressStatic } from "express";
import compression from "compression";
import morgan from "morgan";
import { createRequestHandler } from "@remix-run/express";
import { serve, setup } from "swagger-ui-express";
import openApiSpec from "./docs/api/openapi.spec.json" with { type: "json" };

const viteDevServer =
  process.env.NODE_ENV === "production"
    ? undefined
    : await import("vite").then((vite) => {
        return vite.createServer({
          server: { middlewareMode: true },
        });
      });

const app = express();

app.use(compression());
app.disable("x-powered-by");

// Remix fingerprints its assets so we can cache forever.
if (viteDevServer) {
  app.use(viteDevServer.middlewares);
} else {
  app.use(expressStatic("build/client/assets", { immutable: true, maxAge: "1y" }));
  app.use(
    "/icons",
    expressStatic("build/client/icons", { immutable: true, maxAge: "1y" })
  );
  app.use(
    "/images",
    expressStatic("build/client/images", { immutable: true, maxAge: "1y" })
  );
  app.use(
    "/fonts",
    expressStatic("build/client/fonts", { immutable: true, maxAge: "1y" })
  );
  app.use(
    "/sounds",
    expressStatic("build/client/sounds", { immutable: true, maxAge: "1y" })
  );
  app.use("/.well-known", expressStatic("build/client/.well-known", { maxAge: "1d" }));
}

//cache everything else for 1 day
app.use(expressStatic("build/client", { maxAge: "1d" }));

app.use("/docs/api", serve, setup(openApiSpec));

app.use(morgan("tiny"));

app.all(
  /(.*)/,
  createRequestHandler({
    build: viteDevServer
      ? () => viteDevServer.ssrLoadModule("virtual:remix/server-build")
      : await import("./build/server/index.js"),
  })
);
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});
