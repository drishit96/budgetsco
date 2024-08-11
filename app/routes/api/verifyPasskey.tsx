import { json, type ActionFunction } from "@remix-run/node";
import type { AuthenticationResponseJSON } from "@simplewebauthn/types";
import { verifyPasskey } from "~/modules/settings/security/passkeys.service";
import { validateChallengeResponse } from "~/modules/user/user.service";
import { getCustomToken, getPasskeyPartialSessionData } from "~/utils/auth.utils.server";
import { logError } from "~/utils/logger.utils.server";

export let action: ActionFunction = async ({ request }) => {
  try {
    if (request.method !== "POST") return { isVerified: false, token: null };
    const body = await request.json();
    if (body == null) return { isVerified: false, token: null };

    const cfToken = body.cfToken?.toString();
    const isRequestFromHuman = await validateChallengeResponse(cfToken, "login");
    if (!isRequestFromHuman) return json({ apiError: "Invalid request" });

    const sessionData = await getPasskeyPartialSessionData(request);
    if (sessionData == null) return { isVerified: false, token: null };
    const { webAuthnUserID } = sessionData;

    const userId = await verifyPasskey(
      webAuthnUserID,
      body.authResponse as unknown as AuthenticationResponseJSON
    );

    if (userId == null) return { isVerified: false, token: null };
    const token = await getCustomToken(userId);
    return json({ isVerified: true, token });
  } catch (error) {
    logError(error);
    return { isVerified: false, token: null };
  }
};
