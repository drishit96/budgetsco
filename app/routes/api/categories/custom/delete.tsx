import type { ActionFunction } from "@remix-run/node";
import { EventNames } from "~/lib/anaytics.contants";
import { removeCustomCategories } from "~/modules/transaction/transaction.service";
import { getSessionData } from "~/utils/auth.utils.server";
import { trackEvent } from "~/utils/analytics.utils.server";
import { parseCustomCategoryActionInput } from "~/modules/settings/settings.schema";
import { logError } from "~/utils/logger.utils.server";

export const action: ActionFunction = async ({ request }) => {
  try {
    const sessionData = await getSessionData(request);
    if (sessionData == null || sessionData.userId == null) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = sessionData;

    if (request.method !== "DELETE") {
      return Response.json(
        { success: false, error: "Invalid request method" },
        { status: 405 }
      );
    }

    const urlSearchParams = new URL(request.url).searchParams;
    const type = urlSearchParams.get("type");
    const categories = urlSearchParams.getAll("category");

    const { errors, data: input } = parseCustomCategoryActionInput({ type, categories });

    if (errors) {
      return Response.json({ success: false, errors }, { status: 400 });
    }

    const isDeleted = await removeCustomCategories(userId, input.type, input.categories);
    if (isDeleted) {
      trackEvent(request, EventNames.CUSTOM_CATEGORY_DELETED);
    } else {
      return Response.json(
        { success: false, error: "Failed to delete categories" },
        { status: 400 }
      );
    }

    return { success: isDeleted };
  } catch (error) {
    logError(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
};
