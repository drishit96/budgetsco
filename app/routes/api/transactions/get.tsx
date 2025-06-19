import { LoaderFunction } from "@remix-run/node";
import { parseTransactionFilter } from "~/modules/transaction/transaction.schema";
import { getTransactions } from "~/modules/transaction/transaction.service";
import { getSessionData } from "~/utils/auth.utils.server";
import { logError } from "~/utils/logger.utils.server";

export let loader: LoaderFunction = async ({ request }) => {
  try {
    const sessionData = await getSessionData(request);
    if (sessionData == null || sessionData.userId == null) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, timezone } = sessionData;

    if (request.method !== "GET") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const urlSearchParams = new URL(request.url).searchParams;
    const filterInput = {
      types: urlSearchParams.getAll("type") ?? undefined,
      categories: urlSearchParams.getAll("category") ?? undefined,
      paymentModes: urlSearchParams.getAll("paymentMode") ?? undefined,
      startDate: urlSearchParams.get("startDate") ?? undefined,
      endDate: urlSearchParams.get("endDate") ?? undefined,
    };
    const { errors, data: filter } = parseTransactionFilter(filterInput);
    if (errors) {
      return Response.json({ error: errors }, { status: 400 });
    }
    const transactions = await getTransactions(userId, timezone, undefined, filter);
    return Response.json(transactions);
  } catch (error) {
    logError(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
};
