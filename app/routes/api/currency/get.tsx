import { LoaderFunction } from "@remix-run/node";
import { getSessionData } from "~/utils/auth.utils.server";
import { logError } from "~/utils/logger.utils.server";

export let loader: LoaderFunction = async ({ request }) => {
  try {
    const sessionData = await getSessionData(request);
    if (sessionData == null || sessionData.userId == null) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currency } = sessionData;

    if (request.method !== "GET") {
      return Response.json(
        { success: false, error: "Invalid request method" },
        { status: 405 }
      );
    }

    return Response.json({ currency });
  } catch (error) {
    logError(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
};
