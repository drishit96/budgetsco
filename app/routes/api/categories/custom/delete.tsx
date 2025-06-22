import type { ActionFunction } from "@remix-run/node";
import { EventNames } from "~/lib/anaytics.contants";
import { removeCustomCategory } from "~/modules/transaction/transaction.service";
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
    const category = urlSearchParams.get("category");

    const { errors, data: input } = parseCustomCategoryActionInput({ type, category });

    if (errors) {
      return Response.json({ success: false, errors }, { status: 400 });
    }

    const isDeleted = await removeCustomCategory(userId, input.type, input.category);
    if (isDeleted) {
      trackEvent(request, EventNames.CUSTOM_CATEGORY_DELETED);
    } else {
      return Response.json(
        { success: false, error: "Failed to delete category" },
        { status: 400 }
      );
    }

    return { success: isDeleted };
  } catch (error) {
    logError(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
};
