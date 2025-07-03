import type { ActionFunction } from "@remix-run/node";
import { EventNames } from "~/lib/anaytics.contants";
import { addNewCustomCategories } from "~/modules/transaction/transaction.service";
import { getSessionData } from "~/utils/auth.utils.server";
import { trackEvent } from "~/utils/analytics.utils.server";
import { logError } from "~/utils/logger.utils.server";
import { parseCustomCategoryActionInput } from "~/modules/settings/settings.schema";

export const action: ActionFunction = async ({ request }) => {
  try {
    const sessionData = await getSessionData(request);
    if (sessionData == null || sessionData.userId == null) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = sessionData;

    if (request.method !== "POST") {
      return Response.json(
        { success: false, error: "Invalid request method" },
        { status: 405 }
      );
    }

    const body = await request.json();
    const { errors, data: input } = parseCustomCategoryActionInput(body);

    if (errors) {
      return Response.json({ success: false, errors }, { status: 400 });
    }

    const isCreated = await addNewCustomCategories(userId, input.type, input.categories);
    if (isCreated) {
      trackEvent(request, EventNames.CUSTOM_CATEGORY_CREATED);
    } else {
      return Response.json(
        { success: false, error: "Failed to create categories" },
        { status: 400 }
      );
    }

    return { success: isCreated };
  } catch (error) {
    logError(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
};
