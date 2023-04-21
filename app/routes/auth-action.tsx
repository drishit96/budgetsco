import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Form,
  useLoaderData,
  useNavigation,
  useOutletContext,
  useSubmit,
} from "@remix-run/react";
import type { V2_MetaFunction } from "@remix-run/react/dist/routeModules";
import { Ripple } from "@rmwc/ripple";
import { useEffect, useState } from "react";
import { Input } from "~/components/Input";
import { Spacer } from "~/components/Spacer";
import { EventNames } from "~/lib/anaytics.contants";
import type { AppContext } from "~/root";
import { trackEvent } from "~/utils/analytics.utils.server";
import {
  getSessionCookie,
  getSessionData,
  getUserPreferencesFromSessionCookie,
} from "~/utils/auth.utils.server";
import {
  regenerateUserIdToken,
  resetToNewPassword,
  verifyEmailCode,
} from "~/utils/firebase.utils";
import { isNullOrEmpty } from "~/utils/text.utils";

enum AuthActionType {
  VERIFY_EMAIL = "verifyEmail",
  PASSWORD_RESET = "resetPassword",
}

export const meta: V2_MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.id === "root");
  return [...(rootModule?.meta ?? []), { title: "Budgetsco" }];
};

export let loader: LoaderFunction = async ({ request }) => {
  const urlParams = new URL(request.url).searchParams;
  const mode = urlParams.get("mode");
  const oobCode = urlParams.get("oobCode");

  if (mode == null || oobCode == null) {
    return json("Bad request", { status: 400 });
  }

  let isEmailVerified = false;

  if (mode !== AuthActionType.PASSWORD_RESET) {
    const sessionData = await getSessionData(request);
    if (sessionData == null || sessionData.userId == null) {
      return redirect("/auth/login");
    }
    isEmailVerified = sessionData.isEmailVerified ?? false;
    if (isEmailVerified) {
      return redirect("/dashboard");
    }
  }

  return json({
    mode,
    oobCode,
  });
};

export let action: ActionFunction = async ({ request }) => {
  const sessionData = await getSessionData(request);
  if (sessionData == null || sessionData.userId == null) {
    return redirect("/auth/login");
  }

  const { userId } = sessionData;
  const form = await request.formData();
  const mode = form.get("mode")?.toString();

  if (mode === "verifyEmail") {
    const idToken = form.get("idToken")?.toString();
    if (isNullOrEmpty(idToken)) return redirect("/auth/login");
    const userPreferences = await getUserPreferencesFromSessionCookie(request);
    if (userPreferences == null) {
      throw new Error(`userPreferences missing for userId: ${userId}`);
    }
    const sessionCookie = await getSessionCookie(idToken, userPreferences);
    trackEvent(request, EventNames.EMAIL_VERIFIED);
    return json(
      { isEmailVerified: true },
      {
        headers: {
          "Set-Cookie": sessionCookie,
        },
      }
    );
  }

  return redirect("auth/login");
};

export default function AuthAction() {
  const navigation = useNavigation();
  const {
    mode,
    oobCode,
    isEmailVerified,
  }: { mode: string; oobCode: string; isEmailVerified?: boolean } = useLoaderData();
  const [newPassword, setNewPassword] = useState("");
  const [errors, setErrors] = useState<{
    newPassword?: string;
  }>({});
  const context = useOutletContext<AppContext>();
  const submit = useSubmit();

  async function verifyUserEmail(code: string) {
    const isVerified = await verifyEmailCode(code);
    if (isVerified) {
      const idToken = await regenerateUserIdToken();
      const form = new FormData();
      form.set("mode", "verifyEmail");
      form.set("idToken", idToken);
      submit(form, { method: "POST", replace: true });
    }
  }

  async function handleSetNewPassword(
    e: React.FormEvent<HTMLFormElement>,
    newPassword: string,
    code: string
  ) {
    e.preventDefault();
    const isPasswordSet = await resetToNewPassword(code, newPassword);
    if (isPasswordSet) {
      context.setSnackBarMsg("Password reset successfully");
      setTimeout(() => window.location.replace("/auth/login"), 1000);
    } else {
      setErrors((prev) => ({
        ...prev,
        newPassword: "Something went wrong, please try again",
      }));
    }
  }

  useEffect(() => {
    if (isEmailVerified) {
      context.setSnackBarMsg("Email verified successfully");
      setTimeout(() => window.location.replace("/dashboard"), 1000);
    }
  }, [isEmailVerified]);

  useEffect(() => {
    if (mode === "verifyEmail") {
      verifyUserEmail(oobCode);
    }
  });

  return (
    <div>
      {mode === AuthActionType.VERIFY_EMAIL && (
        <h1 className="p-7 text-xl text-center">Verifying your e-mail, please wait...</h1>
      )}

      {mode === AuthActionType.PASSWORD_RESET && (
        <>
          <main className="p-7">
            <h1 className="text-3xl text-center pb-7">Set new password</h1>
            <div className="flex flex-col items-center justify-center">
              <Form
                replace
                method="POST"
                onSubmit={(e) => handleSetNewPassword(e, newPassword, oobCode)}
              >
                <Input
                  name="newPassword"
                  type="password"
                  label="New Password"
                  autoComplete="new-password"
                  autoFocus
                  required
                  value={newPassword}
                  error={errors.newPassword}
                  onChangeHandler={(e) => {
                    setNewPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, newPassword: "" }));
                  }}
                />
                <Spacer />
                <Ripple>
                  <button type="submit" className="btn-primary w-full">
                    {navigation.state === "submitting"
                      ? "Please wait..."
                      : "Set password"}
                  </button>
                </Ripple>
              </Form>
            </div>
          </main>
        </>
      )}
    </div>
  );
}
