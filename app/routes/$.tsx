import type { V2_MetaFunction } from "@remix-run/react";
import { Link } from "@remix-run/react";
import { Spacer } from "~/components/Spacer";

export const meta: V2_MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.id === "root");
  return [...(rootModule?.meta ?? []), { title: "404 - Budgetsco" }];
};

export default function NotFound() {
  return (
    <html className="h-full">
      <head>
        <title>Looks like you are lost...</title>
      </head>
      <body className="flex flex-col h-full p-5 justify-center items-center">
        <h1 className="text-5xl">404</h1>
        <h2 className="text-lg">Not found</h2>
        <Spacer />
        <h3>
          Looks like you are lost, start from{" "}
          <Link className="link-green" to="/dashboard">
            here
          </Link>
        </h3>
      </body>
    </html>
  );
}
