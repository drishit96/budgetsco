import type { V2_MetaFunction } from "@remix-run/react";
import { Link, useOutletContext } from "@remix-run/react";
import { Ripple } from "@rmwc/ripple";
import { useEffect } from "react";
import type { AppContext } from "~/root";

export const meta: V2_MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.id === "root");
  return [...(rootModule?.meta ?? []), { title: "Security - Budgetsco" }];
};

export default function Security() {
  const context = useOutletContext<AppContext>();

  useEffect(() => {
    context.showBackButton(true);
  }, [context]);

  return (
    <>
      <main className="pt-7 pl-4 pr-4 pb-20">
        <h1 className="text-3xl text-center pb-7">Security</h1>

        <div className="flex justify-center">
          <div className="flex flex-col w-full lg:w-1/2">
            <Ripple>
              <Link
                to={`/settings/security/mfa`}
                className="p-4 border border-primary focus-border rounded-md"
              >
                <p>Two factor authentication (2FA)</p>
                <p className="text-gray-500">
                  Use an application on your phone to get two-factor authentication codes
                  when prompted.
                </p>
              </Link>
            </Ripple>
          </div>
        </div>
      </main>
    </>
  );
}
