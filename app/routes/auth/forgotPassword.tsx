import { Ripple } from "@rmwc/ripple";
import type { LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useNavigation } from "@remix-run/react";
import { Input } from "~/components/Input";
import { Spacer } from "~/components/Spacer";
import { useState } from "react";
import { sendResetPasswordEmail } from "~/utils/firebase.utils";
import { getSessionData } from "~/utils/auth.utils.server";
import { InfoText } from "~/components/InfoText";
import type { MetaFunction } from "@remix-run/react/dist/routeModules";

export const meta: MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.id === "root");
  return [...(rootModule?.meta ?? []), { title: "Forgot password - Budgetsco" }];
};

export let loader: LoaderFunction = async ({ request }) => {
  const session = await getSessionData(request);

  if (session != null && session?.userId) {
    return redirect("/dashboard");
  }

  return { apiError: "" };
};

export default function ForgotPassword() {
  const navigation = useNavigation();
  const [emailId, setEmailId] = useState("");
  const [errors, setErrors] = useState<{
    emailId?: string;
  }>({});
  const [showEmailSentMsg, setShowEmailSentMsg] = useState(false);

  async function handlePasswordResetRequest(
    e: React.FormEvent<HTMLFormElement>,
    email: string
  ) {
    e.preventDefault();

    const { isEmailSent, error } = await sendResetPasswordEmail(email);
    setShowEmailSentMsg(isEmailSent);

    if (error) {
      if (error === "auth/user-not-found") {
        setErrors((prev) => ({
          ...prev,
          emailId: "E-mail id is not registered",
        }));
      } else {
        console.log(error);
      }
    }
  }

  return (
    <>
      <main className="p-9">
        <h1 className="text-3xl text-center pb-7">Password Reset</h1>

        <div className="flex flex-col items-center justify-center">
          {showEmailSentMsg && (
            <>
              <InfoText text="We have sent a password reset link to the e-mail id you have provided" />
              <Spacer />
            </>
          )}

          <Spacer />
          <Form
            replace
            method="POST"
            onSubmit={(e) => handlePasswordResetRequest(e, emailId)}
          >
            <Input
              name="emailId"
              type="email"
              label="E-mail Id"
              required
              value={emailId}
              autoFocus={true}
              error={errors.emailId}
              onChangeHandler={(e) => setEmailId(e.target.value)}
            />
            <Spacer />

            <Ripple>
              <button type="submit" className="w-full btn-primary float-right">
                {navigation.state === "submitting" ? "Please wait..." : "Reset password"}
              </button>
            </Ripple>
          </Form>
        </div>
      </main>
    </>
  );
}
