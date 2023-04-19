import { Links, Meta, Scripts } from "@remix-run/react";

export default function GenericError() {
  return (
    <html className="h-full">
      <head>
        <title>Something went wrong...</title>
        <Meta />
        <Links />
      </head>
      <body className="flex min-h-full p-5 justify-center items-center">
        <div className="p-2 bg-urgent w-full">
          <p className="text-md text-urgent">
            Looks like something went wrong. Please try again later.
          </p>
        </div>

        <Scripts />
      </body>
    </html>
  );
}
