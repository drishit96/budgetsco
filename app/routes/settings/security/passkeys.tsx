import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useOutletContext,
  useSubmit,
} from "@remix-run/react";
import { Ripple } from "@rmwc/ripple";
import { startRegistration } from "@simplewebauthn/browser";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { useEffect, useState } from "react";
import { ErrorText } from "~/components/ErrorText";
import AddIcon from "~/components/icons/AddIcon";
import Passkey from "~/components/Passkey";
import { Spacer } from "~/components/Spacer";
import {
  deletePasskey,
  getAllPasskeys,
  updatePasskeyDisplayName,
  verifyRegistration,
} from "~/modules/settings/security/passkeys.service";
import type { AppContext } from "~/root";
import { getSessionData } from "~/utils/auth.utils.server";
import { logError } from "~/utils/logger.utils.server";
import { isNotNullAndEmpty } from "~/utils/text.utils";

export const action: ActionFunction = async ({ request }) => {
  try {
    const sessionData = await getSessionData(request);
    if (sessionData == null || sessionData.userId == null) {
      return redirect("/auth/login");
    }

    const { userId } = sessionData;
    const form = await request.formData();

    const formName = form.get("formName")?.toString();
    if (formName === "ADD_PASSKEY") {
      const registrationResponseJSON = form.get("response")?.toString();
      if (isNotNullAndEmpty(registrationResponseJSON)) {
        const registrationResponse = JSON.parse(
          registrationResponseJSON
        ) as RegistrationResponseJSON;
        const isVerified = await verifyRegistration(userId, registrationResponse);
        return {
          formName,
          success: isVerified,
          error: isVerified ? null : "Invalid request",
        };
      }
    } else if (formName === "SAVE_PASSKEY_NAME") {
      const passkeyId = form.get("passkeyId")?.toString();
      const passkeyName = form.get("passkeyName")?.toString();
      if (isNotNullAndEmpty(passkeyId) && isNotNullAndEmpty(passkeyName)) {
        const success = await updatePasskeyDisplayName(userId, passkeyId, passkeyName);
        return {
          formName,
          success,
          error: success ? null : "Something went wrong",
        };
      }
    } else if (formName === "DELETE_PASSKEY") {
      if (request.method !== "DELETE") {
        return { formName, success: false, error: "Invalid request" };
      }

      const passkeyId = form.get("passkeyId")?.toString();
      if (isNotNullAndEmpty(passkeyId)) {
        const isPasskeyDeleted = await deletePasskey(userId, passkeyId);
        return {
          formName,
          success: isPasskeyDeleted,
          error: isPasskeyDeleted ? null : "Passkey not found",
        };
      }
    }

    return { formName, success: false, error: "Invalid request" };
  } catch (error) {
    logError(error);
    return { error: "Something went wrong. Please try again" };
  }
};

export const loader: LoaderFunction = async ({ request }) => {
  const sessionData = await getSessionData(request);
  if (sessionData == null || sessionData.userId == null) {
    return redirect("/auth/login");
  }

  const passkeys = await getAllPasskeys(sessionData.userId);
  return { passkeys };
};

export type PasskeyResponse = {
  id: string;
  displayName: string | null;
  createdAt: number;
  lastUsed: number;
};

export default function Passkeys() {
  const submit = useSubmit();
  const navigation = useNavigation();

  const {
    passkeys,
  }: {
    passkeys: PasskeyResponse[];
  } = useLoaderData<typeof loader>();

  const [errorValue, setErrorValue] = useState("");
  const context = useOutletContext<AppContext>();
  const actionData = useActionData<{
    formName: string;
    success: boolean;
    error: string;
  }>();

  const [expandedPasskeyIndex, setExpandedPasskeyIndex] = useState<number | undefined>(
    undefined
  );

  const [isAddingPasskey, setIsAddingPasskey] = useState(false);
  const isSavingPasskeyInProgress =
    navigation.state === "submitting" &&
    navigation.formData?.get("formName") === "ADD_PASSKEY";

  useEffect(() => {
    if (actionData?.error) {
      setErrorValue(actionData.error);
    } else if (actionData?.success) {
      setErrorValue("");
      switch (actionData.formName) {
        case "ADD_PASSKEY":
          context.setSnackBarMsg("Passkey added successfully");
          break;

        case "SAVE_PASSKEY_NAME":
          context.setSnackBarMsg("Passkey name updated successfully");
          break;

        case "DELETE_PASSKEY":
          context.setSnackBarMsg("Passkey deleted successfully");
          break;

        default:
          break;
      }
    }
  }, [actionData?.formName, actionData?.error, actionData?.success]);

  async function addNewPasskey() {
    setErrorValue("");
    setIsAddingPasskey(true);
    const resp = await fetch("/api/getPasskeyRegistrationOptions");
    let authResponse: RegistrationResponseJSON | null = null;
    try {
      const registrationOptions = await resp.json();
      authResponse = await startRegistration({ optionsJSON: registrationOptions });
    } catch (error: any) {
      if (error.name === "InvalidStateError") {
        setErrorValue("Authenticator is probably already registered");
      } else {
        console.log(error);
        setIsAddingPasskey(false);
        setErrorValue("Something went wrong. Please try again");
      }
    }

    if (authResponse == null) {
      setIsAddingPasskey(false);
      setErrorValue("Something went wrong. Please try again");
      return;
    }

    setIsAddingPasskey(false);

    const form = new FormData();
    form.set("formName", "ADD_PASSKEY");
    form.set("response", JSON.stringify(authResponse));
    submit(form, { method: "POST", replace: true });
  }

  return (
    <>
      <main className="pt-7 pl-4 pr-4 pb-20">
        <h1 className="text-3xl text-center pb-5">Passkeys</h1>
        {errorValue && (
          <div className="flex justify-center">
            <div className="w-full lg:w-1/2">
              <span className="text-center">
                <ErrorText error={errorValue} showIcon={true} />
              </span>
            </div>
          </div>
        )}
        <Spacer size={1} />
        <div className="p-1 flex justify-center">
          <ul className="flex flex-col w-full lg:w-1/2 border border-primary rounded-md">
            {passkeys.length ? (
              passkeys.map((passkey, index) => (
                <li key={passkey.id}>
                  <Passkey
                    passkey={passkey}
                    navigation={navigation}
                    hideDivider={index == passkeys.length - 1}
                    index={index}
                    expandedIndex={expandedPasskeyIndex}
                    setExpandedIndex={setExpandedPasskeyIndex}
                  />
                </li>
              ))
            ) : (
              <li className="p-4 text-center">No passkeys found</li>
            )}
          </ul>
        </div>

        <div className="z-20 fixed bottom-16 right-8 shadow-xl focus-ring">
          <Ripple>
            <button
              className="flex items-center btn-primary whitespace-nowrap"
              onClick={addNewPasskey}
              disabled={isAddingPasskey || isSavingPasskeyInProgress}
            >
              <AddIcon size={24} color={"#FFF"} />
              <p className="inline ml-1">Add new passkey</p>
            </button>
          </Ripple>
        </div>
      </main>
    </>
  );
}
