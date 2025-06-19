import { LoaderFunction } from "@remix-run/node";
import { parseRecurringTransactionFilter } from "~/modules/recurring/recurring.schema";
import { getRecurringTransactions } from "~/modules/recurring/recurring.service";
import { getSessionData } from "~/utils/auth.utils.server";
import { logError } from "~/utils/logger.utils.server";

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const sessionData = await getSessionData(request);
    if (sessionData == null || sessionData.userId == null) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = sessionData;

    if (request.method !== "GET") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const urlSearchParams = new URL(request.url).searchParams;
    const filterInput = {
      startDate: urlSearchParams.get("startDate") ?? undefined,
      endDate: urlSearchParams.get("endDate") ?? undefined,
    };
    const { errors, data: filter } = parseRecurringTransactionFilter(filterInput);
    if (errors) {
      return Response.json({ error: errors }, { status: 400 });
    }

    const transactions = await getRecurringTransactions(userId, filter);
    return Response.json(transactions);
  } catch (error) {
    logError(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
};
