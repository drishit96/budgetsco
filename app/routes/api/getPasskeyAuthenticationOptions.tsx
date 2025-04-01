import type { ActionFunction } from "@remix-run/node";
import { getAuthenticationOptions } from "~/modules/settings/security/passkeys.service";
import { validateChallengeResponse } from "~/modules/user/user.service";
import { getPasskeyPartialSessionCookie } from "~/utils/auth.utils.server";
import { logError } from "~/utils/logger.utils.server";
import { data } from "@remix-run/node";

export let action: ActionFunction = async ({ request }) => {
  try {
    const body = await request.json();
    if (body == null) return { apiError: "Invalid request" };

    const cfToken = body.cfToken?.toString();
    const isRequestFromHuman = await validateChallengeResponse(cfToken, "login");
    if (!isRequestFromHuman) return { apiError: "Invalid request" };

    const options = await getAuthenticationOptions();
    if (options == null) return { apiError: "Invalid request" };
    const { webAuthnUserID, authenticationOptions } = options;

    return data(authenticationOptions, {
      headers: {
        "Set-Cookie": await getPasskeyPartialSessionCookie(webAuthnUserID),
      },
    });
  } catch (error) {
    logError(error);
    return { apiError: "Invalid request" };
  }
};
