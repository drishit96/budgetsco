import type { ActionFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getAuthenticationOptions } from "~/modules/settings/security/passkeys.service";
import { validateChallengeResponse } from "~/modules/user/user.service";
import { getPasskeyPartialSessionCookie } from "~/utils/auth.utils.server";
import { logError } from "~/utils/logger.utils.server";

export let action: ActionFunction = async ({ request }) => {
  try {
    const body = await request.json();
    if (body == null) return json({ apiError: "Invalid request" });

    const cfToken = body.cfToken?.toString();
    const isRequestFromHuman = await validateChallengeResponse(cfToken, "login");
    if (!isRequestFromHuman) return json({ apiError: "Invalid request" });

    const options = await getAuthenticationOptions();
    if (options == null) return json({ apiError: "Invalid request" });
    const { webAuthnUserID, authenticationOptions } = options;

    return json(authenticationOptions, {
      headers: {
        "Set-Cookie": await getPasskeyPartialSessionCookie(webAuthnUserID),
      },
    });
  } catch (error) {
    logError(error);
    return json({ apiError: "Invalid request" });
  }
};
