import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useLoaderData, useNavigation, useOutletContext, useFetcher } from "@remix-run/react";
import type { MetaFunction } from "@remix-run/react/dist/routeModules";
import type { Navigation } from "@remix-run/router";
import { useState, useEffect } from "react";
import type { AppContext } from "~/root";
import { RecurringTransaction } from "~/components/RecurringTransaction";
import { RecurringRecommendationCard } from "~/components/RecurringRecommendationCard";
import { AIProgressBox } from "~/components/AIProgressBox";
import type { RecurringRecommendation, RecurringRecommendationsResponse } from "~/modules/recurring/recurringRecommendation.schema";
import type { RecurringTransactionsResponse } from "~/modules/recurring/recurring.schema";
import {
  deleteRecurringTransaction,
  getAllRecurringTransactions,
} from "~/modules/recurring/recurring.service";
import { getSessionData } from "~/utils/auth.utils.server";
import { Spacer } from "~/components/Spacer";
import AiIcon from "~/components/icons/AiIcon";
import CheckIcon from "~/components/icons/CheckIcon";
import { Ripple } from "@rmwc/ripple";
import { InlineSpacer } from "~/components/InlineSpacer";



export const meta: MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.id === "root");
  return [
    ...(rootModule?.meta ?? []),
    {
      title: "Manage recurring transactions - Budgetsco",
    },
  ];
};

export let action: ActionFunction = async ({ request }) => {
  const sessionData = await getSessionData(request);
  if (sessionData == null || sessionData.userId == null) {
    return redirect("/auth/login");
  }

  const { userId } = sessionData;
  switch (request.method) {
    case "DELETE": {
      const form = await request.formData();
      const transactionId = form.get("transactionId")?.toString();
      if (transactionId == null) return null;

      const formName = form.get("formName")?.toString();
      if (formName === "DELETE_RECURRING_TRANSACTION_FORM") {
        return {
          isDeleted: await deleteRecurringTransaction(userId, transactionId),
        };
      }
    }
  }
};

export let loader: LoaderFunction = async ({ request }): Promise<any> => {
  const sessionData = await getSessionData(request);
  if (sessionData == null || sessionData.userId == null) {
    return redirect("/auth/login");
  }

  const recurringTransactions = await getAllRecurringTransactions(sessionData.userId);

  return Response.json({ recurringTransactions });
};

function renderRecurringTransactions(
  recurringTransactions: RecurringTransactionsResponse,
  navigation: Navigation,
  setExpandedTransactionIndex: React.Dispatch<React.SetStateAction<number | undefined>>,
  expandedTransactionIndex?: number
) {
  return recurringTransactions.map((transaction, index) => {
    return (
      <li key={transaction.id}>
        <RecurringTransaction
          transaction={transaction}
          navigation={navigation}
          hideDivider={index == recurringTransactions.length - 1}
          manageView={true}
          index={index}
          expandedIndex={expandedTransactionIndex}
          setExpandedIndex={setExpandedTransactionIndex}
        />
      </li>
    );
  });
}

export default function ManageRecurringTransactions() {
  const navigation = useNavigation();
  const [listParent] = useAutoAnimate<HTMLUListElement>();
  const [aiRecommendationsParent] = useAutoAnimate<HTMLDivElement>();
  const { recurringTransactions } = useLoaderData<{
    recurringTransactions: RecurringTransactionsResponse;
  }>();
  const [expandedTransactionIndex, setExpandedTransactionIndex] = useState<
    number | undefined
  >(undefined);
  const context = useOutletContext<AppContext>();

  const [recommendations, setRecommendations] = useState<RecurringRecommendation[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [selectedRecommendations, setSelectedRecommendations] = useState<Set<number>>(new Set());

  const recommendationsFetcher = useFetcher<RecurringRecommendationsResponse | { error: string }>();
  const bulkSaveFetcher = useFetcher();

  useEffect(() => {
    if (recommendationsFetcher.data) {
      const data = recommendationsFetcher.data;
      if ('error' in data) {
        setRecommendationError(data.error);
      } else {
        setRecommendations(data.recommendations || []);
        setSelectedRecommendations(new Set());
      }
      setIsLoadingRecommendations(false);
    }
  }, [recommendationsFetcher.data]);

  useEffect(() => {
    if (bulkSaveFetcher.data) {
      const result = bulkSaveFetcher.data as any;
      if (result.error) {
        context.setSnackBarMsg("Failed to create recurring transactions. Please try again.");
      } else {
        setRecommendations([]);
        setSelectedRecommendations(new Set());

        if (result.failed > 0) {
          context.setSnackBarMsg(
            `Created ${result.created} transaction(s). ${result.failed} failed.`
          );
        } else {
          context.setSnackBarMsg(
            `Successfully created ${result.created} recurring transaction(s)!`
          );
        }
      }
    }
  }, [bulkSaveFetcher.data]);

  const handleGetRecommendations = () => {
    setIsLoadingRecommendations(true);
    setRecommendationError(null);
    recommendationsFetcher.submit(
      {},
      { method: "POST", action: "/api/recommendRecurringTransactions" }
    );
  };

  const handleToggleRecommendation = (index: number) => {
    setSelectedRecommendations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleSaveSelected = () => {
    if (selectedRecommendations.size === 0) return;

    const selectedRecs = Array.from(selectedRecommendations)
      .map(index => recommendations[index])
      .filter(Boolean);

    const formData = new FormData();
    formData.append(
      "transactions",
      JSON.stringify(selectedRecs.map(recommendation => ({
        description: recommendation.description || "",
        amount: recommendation.amount.toString(),
        type: recommendation.type,
        category: recommendation.category,
        paymentMode: recommendation.paymentMode,
        occurrence: recommendation.occurrence,
        interval: recommendation.interval.toString(),
        startDate: recommendation.startDate,
      })))
    );

    bulkSaveFetcher.submit(formData, {
      method: "POST",
      action: "/transaction/recurring/bulk",
    });
  };

  const handleDismissAll = () => {
    setRecommendations([]);
    setSelectedRecommendations(new Set());
  };

  return (
    <>
      <main className="pt-7 pb-12 pl-3 pr-3">
        <p className="text-3xl text-center pb-7">Your Recurring Transactions</p>

        <div className="flex flex-col justify-center items-center">
          <div className="w-full md:w-3/4 lg:w-2/3 xl:w-1/2">
            <div ref={aiRecommendationsParent}>
              {!isLoadingRecommendations && recommendations.length <= 0 &&
                (<><div className="w-full flex justify-end">
                  <Ripple>
                    <button
                      onClick={handleGetRecommendations}
                      className="btn-secondary"
                    >
                      <AiIcon color="var(--text-color-accent)" size={24} />
                      <InlineSpacer size={1} />
                      <span>Get AI Recommendations</span>
                    </button>
                  </Ripple>
                </div></>)}


              {recommendationError && (
                <>
                  <Spacer size={2} />
                  <div className="bg-urgent rounded-md p-4">
                    <p className="text-urgent">{recommendationError}</p>
                  </div>
                </>
              )}

              {isLoadingRecommendations && (
                <>
                  <Spacer size={2} />
                  <AIProgressBox
                    messages={[
                      "Analysing your data",
                      "Finding recurring patterns",
                      "Generating recommendations"
                    ]}
                    messageDuration={5000}
                  />
                </>
              )}
            </div>

            {recommendations.length > 0 && (

              <>
                <Spacer size={3} />
                <div className="bg-info rounded-lg p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                    <div className="flex items-center">
                      <AiIcon color="var(--text-color-info)" size={24} />
                      <Spacer size={1} />
                      <p className="text-xl text-info font-semibold">AI Recommendations</p>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                      <Ripple>
                        <button
                          onClick={handleSaveSelected}
                          disabled={selectedRecommendations.size === 0 || bulkSaveFetcher.state === "submitting"}
                          className="flex-1 md:flex-none btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckIcon color="#FFF" size={20} />
                          <InlineSpacer size={1} />
                          <span>
                            {bulkSaveFetcher.state === "submitting" ? "Saving..." : `Save (${selectedRecommendations.size})`}
                          </span>
                        </button>
                      </Ripple>
                      <Ripple>
                        <button
                          onClick={handleDismissAll}
                          disabled={bulkSaveFetcher.state === "submitting"}
                          className="flex-1 md:flex-none btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Dismiss All
                        </button>
                      </Ripple>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    {recommendations.map((recommendation, index) => (
                      <RecurringRecommendationCard
                        key={index}
                        recommendation={recommendation}
                        isSelected={selectedRecommendations.has(index)}
                        onToggle={() => handleToggleRecommendation(index)}
                      />
                    ))}
                  </div>
                </div>
                <Spacer size={4} />
                <div className="border-t-2 border-primary"></div>
                <Spacer size={4} />
              </>
            )}
          </div>

          <div className="border border-primary rounded-md w-full md:w-3/4 lg:w-2/3 xl:w-1/2 mt-3">
            <ul ref={listParent}>
              {renderRecurringTransactions(
                recurringTransactions as unknown as RecurringTransactionsResponse,
                navigation,
                setExpandedTransactionIndex,
                expandedTransactionIndex
              )}
            </ul>
          </div>
        </div>
      </main>
    </>
  );
}
