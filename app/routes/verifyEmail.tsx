import type { LoaderFunction } from "@remix-run/node";
import { redirect, json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useEffect, useState } from "react";
import { getSessionData } from "~/utils/auth.utils.server";
import { sendVerificationEmail } from "~/utils/firebase.utils";
import Banner from "~/components/Banner";
import type { V2_MetaFunction } from "@remix-run/react/dist/routeModules";

export const meta: V2_MetaFunction = ({ matches }) => {
  const rootModule = matches.find((match) => match.id === "root");
  return [...(rootModule?.meta ?? []), { title: "Verify email - Budgetsco" }];
};

export const loader: LoaderFunction = async ({ request }) => {
  const sessionData = await getSessionData(request);
  if (sessionData == null || sessionData.userId == null) {
    return redirect("/auth/login");
  }

  const { isEmailVerified, emailId } = sessionData;
  if (isEmailVerified) {
    return redirect("/dashboard");
  }

  return json({ isEmailVerified, emailId });
};

export default function VerifyEmail() {
  const { isEmailVerified, emailId }: { isEmailVerified?: boolean; emailId?: string } =
    useLoaderData();
  const [isEmailVerificationLinkSent, setIsEmailVerificationLinkSent] = useState(false);

  async function sendEmailVerificationLink() {
    const isEmailSent = await sendVerificationEmail();
    if (isEmailSent) {
      setIsEmailVerificationLinkSent(true);
    }
  }

  useEffect(() => {
    if (!isEmailVerified && !isEmailVerificationLinkSent) {
      sendEmailVerificationLink();
      setTimeout(() => {
        setIsEmailVerificationLinkSent(false);
      }, 30000);
    }
  }, []);

  return (
    <>
      <main className="pt-4 pb-28">
        <h1 className="text-3xl text-center pb-7">Email verification</h1>
        <div className="flex flex-col items-center p-4">
          <div className="flex justify-center w-full md:w-3/4 lg:w-2/3 xl:w-1/2">
            <Banner
              type="important"
              message={`We have sent an email with a confirmation link to your email address (${emailId}). Please allow 5-10 minutes for this message to arrive.`}
              showAction={!isEmailVerificationLinkSent}
              actionText="Resend email"
              onActionClick={sendEmailVerificationLink}
            />
          </div>
        </div>
      </main>
    </>
  );
}
