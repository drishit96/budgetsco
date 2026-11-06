import type { LoaderFunction } from "react-router";
import { redirect } from "react-router";
import { getRegistrationOptions } from "~/modules/settings/security/passkeys.service";
import { getSessionData } from "~/utils/auth.utils.server";

export let loader: LoaderFunction = async ({ request }) => {
  const sessionData = await getSessionData(request);
  if (sessionData == null || sessionData.userId == null) {
    return redirect("/auth/login");
  }

  const { userId, emailId } = sessionData;
  return Response.json(await getRegistrationOptions(userId, emailId));
};
