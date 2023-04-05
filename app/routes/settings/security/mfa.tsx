import type { ActionFunction, LoaderFunction, V2_MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import type { ShouldRevalidateFunction } from "@remix-run/react";
import { Form, useActionData, useLoaderData, useOutletContext } from "@remix-run/react";
import { useEffect } from "react";
import { InlineSpacer } from "~/components/InlineSpacer";
import { Input } from "~/components/Input";
import { Spacer } from "~/components/Spacer";
import {
  disable2FA,
  encryptAndSaveMFASecret,
} from "~/modules/settings/security/mfa.service";
import type { AppContext } from "~/root";
import {
  generateAuthenticatorSecret,
  getSessionData,
  verifyAuthenticatorToken,
} from "~/utils/auth.utils.server";
import { logError } from "~/utils/logger.utils.server";

export const meta: V2_MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.route.id === "root");
  return [...(rootModule?.meta ?? []), { title: "2FA - Budgetsco" }];
};

export const action: ActionFunction = async ({ request }) => {
  const user = await getSessionData(request);
  if (user == null || user.userId == null) return redirect("/auth/login");
  if (request.method !== "POST" && request.method !== "DELETE") return null;

  if (request.method === "DELETE") {
    await disable2FA(user.userId);
    return json({ mfaOn: false });
  }

  const form = await request.formData();
  const token = form.get("token")?.toString();
  const secret = form.get("secret")?.toString();
  if (token == null || token.length !== 6 || secret == null) {
    return json({ error: "Invalid code" });
  }

  const isValid = verifyAuthenticatorToken(token, secret);
  if (!isValid) return json({ error: "Invalid code" });

  await encryptAndSaveMFASecret(user.userId, secret);

  return json({ mfaOn: true });
};

export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  actionResult,
  defaultShouldRevalidate,
}) => {
  const result = actionResult as { error?: string; data: string };
  if (formMethod === "post" && result != null && result.error) {
    return false;
  }

  return defaultShouldRevalidate;
};

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const sessionData = await getSessionData(request);
    if (sessionData == null || sessionData.userId == null) return redirect("/auth/login");
    const { isEmailVerified, emailId, isMFAOn } = sessionData;
    if (!isEmailVerified || emailId == null) return redirect("/verifyEmail");

    if (isMFAOn) return json({ isMFAOn: true });
    return json(await generateAuthenticatorSecret(emailId));
  } catch (error) {
    logError(error);
  }
};

export default function MFA() {
  const context = useOutletContext<AppContext>();
  const { isMFAOn, secret, uri } = useLoaderData<{
    isMFAOn?: boolean;
    secret?: string;
    uri?: string;
  }>();
  const actionData = useActionData<{ error?: string; mfaOn?: boolean }>();

  useEffect(() => {
    context.showBackButton(true);
  }, [context]);

  useEffect(() => {
    if (actionData?.mfaOn === true) {
      context.setSnackBarMsg("2FA enabled");
      history.back();
    } else if (actionData?.mfaOn === false) {
      context.setSnackBarMsg("2FA disabled");
      history.back();
    }
  }, [actionData?.mfaOn, context]);

  return (
    <>
      <main className="pt-7 pl-4 pr-4 pb-20">
        <h1 className="text-3xl text-center pb-3">Two factor authentication (2FA)</h1>

        <div className="flex justify-center">
          <div className="flex flex-col w-full lg:w-1/2">
            <h2 className="text-center text-base">
              Two-factor authentication adds an additional layer of security to your
              account by requiring more than just a password to sign in.
            </h2>
            <Spacer size={4} />
            {isMFAOn && (
              <div className="flex items-center p-4 border rounded-md">
                <p>Status:</p>
                <InlineSpacer size={1} />
                <span className="pl-2 pr-2 pt-1 pb-1 rounded-md border border-green-900 bg-green-50 text-green-900 text-sm font-bold">
                  Enabled
                </span>
                <span className="flex-grow"></span>
                <Form method="delete">
                  <button className="btn-secondary-sm border-red-900 text-red-900 focus:ring-red-900">
                    Disable 2FA
                  </button>
                </Form>
              </div>
            )}
            {!isMFAOn && (
              <div className="flex flex-col p-3 border rounded-md">
                <h3 className="font-bold">Scan the QR code</h3>
                <p>
                  Use a phone app like Google Authenticator,{" "}
                  <a
                    className="link-green"
                    href="https://support.1password.com/one-time-passwords/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    1Password
                  </a>
                  ,{" "}
                  <a
                    className="link-green"
                    href="https://support.authy.com/hc/en-us/articles/360006303934-Add-a-New-Two-Factor-Authentication-2FA-Account-Token-in-the-Authy-App"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Authy
                  </a>{" "}
                  or{" "}
                  <a
                    className="link-green"
                    href="https://www.microsoft.com/en-us/security/mobile-authenticator-app"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Microsoft Authenticator
                  </a>
                  , etc. to get 2FA codes when prompted during sign-in.
                </p>
                <Spacer />

                <div className="flex justify-center">
                  <img
                    className="border p-2"
                    src={`https://chart.googleapis.com/chart?chs=166x166&chld=L|0&cht=qr&chl=${uri}`}
                    width={180}
                    height={180}
                    loading="lazy"
                    alt="QR code for two-factor authentication"
                  />
                </div>

                <Spacer />
                <span>
                  If you are unable to scan, enter this code: {secret}
                  <InlineSpacer size={1} />
                  <button
                    className="pl-1 pr-1 border border-emerald-700 text-emerald-700 focus-ring rounded-lg"
                    onClick={() => {
                      if (
                        navigator &&
                        navigator.clipboard &&
                        typeof navigator.clipboard.writeText === "function"
                      ) {
                        navigator.clipboard.writeText(secret || "").then(() => {
                          context.setSnackBarMsg("Copied to clipboard!");
                        });
                      } else {
                        context.setSnackBarMsg("System doesn't allow copy");
                      }
                    }}
                  >
                    Copy
                  </button>
                </span>
                <Spacer size={1} />
                <p className="text-red-900">
                  <strong>Note:</strong> Keep this code somewhere safe. If you lose it, we
                  won't be able to recover your account.
                </p>
                <Spacer />
                <Form method="post">
                  <Input
                    label="Token from authenticator app"
                    name="token"
                    type="number"
                    max={999999}
                    required
                    minLength={6}
                    autoComplete="one-time-code"
                    error={actionData?.error}
                  />
                  <input type="hidden" name="secret" value={secret} />
                  <Spacer size={1} />
                  <button className="btn-primary w-full">Verify code</button>
                </Form>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
