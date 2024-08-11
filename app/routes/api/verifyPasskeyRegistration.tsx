import { json, redirect, type ActionFunction } from "@remix-run/node";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";
import { verifyRegistration } from "~/modules/settings/security/passkeys.service";
import { getSessionData } from "~/utils/auth.utils.server";
import { logError } from "~/utils/logger.utils.server";

export let action: ActionFunction = async ({ request }) => {
  try {
    const sessionData = await getSessionData(request);
    if (sessionData == null || sessionData.userId == null) {
      return redirect("/auth/login");
    }

    if (request.method !== "POST") return false;
    const body = await request.json();
    if (body == null) return false;
    const { userId } = sessionData;

    const isVerified = await verifyRegistration(
      userId,
      body as unknown as RegistrationResponseJSON
    );
    return json({ isVerified });
  } catch (error) {
    logError(error);
    return false;
  }
};
