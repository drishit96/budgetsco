import { LoaderFunction } from "@remix-run/node";
import { getCustomCategories } from "~/modules/transaction/transaction.service";
import { getSessionData } from "~/utils/auth.utils.server";
import { logError } from "~/utils/logger.utils.server";
import { isNullOrEmpty } from "~/utils/text.utils";

export let loader: LoaderFunction = async ({ request }) => {
  try {
    const sessionData = await getSessionData(request);
    if (sessionData == null || sessionData.userId == null) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = sessionData;

    if (request.method !== "GET") {
      return Response.json(
        { success: false, error: "Invalid request method" },
        { status: 405 }
      );
    }

    const urlSearchParams = new URL(request.url).searchParams;
    const type = urlSearchParams.get("type");
    if (
      isNullOrEmpty(type) ||
      (type !== "income" && type !== "expense" && type !== "investment")
    ) {
      return Response.json({ error: "Type is required" }, { status: 400 });
    }

    const customCategories = await getCustomCategories(userId, type);
    return Response.json(customCategories);
  } catch (error) {
    logError(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
};
