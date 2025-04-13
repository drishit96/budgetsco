import type { MetaFunction } from "@remix-run/react";
import { Link, useOutletContext } from "@remix-run/react";
import { Ripple } from "@rmwc/ripple";
import { useEffect } from "react";
import { Badge } from "~/components/Badge";
import { InlineSpacer } from "~/components/InlineSpacer";
import type { AppContext } from "~/root";

export const meta: MetaFunction = ({ matches }) => {
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
          <div className="flex flex-col w-full lg:w-1/2 border border-primary rounded-md">
            <Ripple>
              <Link to={`/settings/security/passkeys`} className="p-4 focus-border">
                <span className="font-bold">
                  <span>Passkeys</span>
                  <InlineSpacer size={1} />
                  <Badge value="Recommended" size="sm" />
                </span>

                <p className="text-secondary">
                  Passkeys are webauthn credentials that validate your identity using
                  touch, facial recognition, a device password, or a PIN. They can be used
                  as a password replacement.
                </p>
              </Link>
            </Ripple>
            <Ripple>
              <Link to={`/settings/security/mfa`} className="p-4 border-t border-primary focus-border">
                <p className="font-bold">Two factor authentication (2FA)</p>
                <p className="text-secondary">
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
