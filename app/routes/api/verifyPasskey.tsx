import type { ActionFunction } from "@remix-run/node";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { verifyPasskey } from "~/modules/settings/security/passkeys.service";
import { getCustomToken, getPasskeyPartialSessionData } from "~/utils/auth.utils.server";
import { logError } from "~/utils/logger.utils.server";

export let action: ActionFunction = async ({ request }) => {
  try {
    if (request.method !== "POST") return { isVerified: false, token: null };
    const body = await request.json();
    if (body == null) return { isVerified: false, token: null };

    const sessionData = await getPasskeyPartialSessionData(request);
    if (sessionData == null) return { isVerified: false, token: null };
    const { webAuthnUserID } = sessionData;

    const userId = await verifyPasskey(
      webAuthnUserID,
      body.authResponse as unknown as AuthenticationResponseJSON
    );

    if (userId == null) return { isVerified: false, token: null };
    const token = await getCustomToken(userId);
    return { isVerified: true, token };
  } catch (error) {
    logError(error);
    return { isVerified: false, token: null };
  }
};
