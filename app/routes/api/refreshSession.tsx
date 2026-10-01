import type { ActionFunction } from "@remix-run/node";
import {
  getSessionCookie,
  getSessionData,
  getUserPreferencesFromSessionCookie,
} from "~/utils/auth.utils.server";
import { logError } from "~/utils/logger.utils.server";
import { isNotNullAndEmpty } from "~/utils/text.utils";

export const action: ActionFunction = async ({ request }) => {
  try {
    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const sessionData = await getSessionData(request);
    if (sessionData == null || sessionData.userId == null) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await request.formData();
    const idToken = form.get("idToken")?.toString();

    if (!isNotNullAndEmpty(idToken)) {
      return Response.json({ error: "Missing idToken" }, { status: 400 });
    }

    const preferences = await getUserPreferencesFromSessionCookie(request);
    if (preferences == null) {
      return Response.json({ error: "Missing user preferences" }, { status: 400 });
    }

    return Response.json(
      { sessionRefreshed: true },
      {
        headers: {
          "Set-Cookie": await getSessionCookie(idToken, preferences),
        },
      },
    );
  } catch (error) {
    logError(error);
    return Response.json({ error: "Failed to refresh session" }, { status: 500 });
  }
};
