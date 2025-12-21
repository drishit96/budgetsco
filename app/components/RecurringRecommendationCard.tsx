import { Ripple } from "@rmwc/ripple";
import type { RecurringRecommendation } from "~/modules/recurring/recurringRecommendation.schema";
import { useOutletContext } from "@remix-run/react";
import type { AppContext } from "~/root";
import { getTransactionColor } from "~/utils/colors.utils";
import { formatNumber } from "~/utils/number.utils";
import InfoIcon from "./icons/InfoIcon";
import { Spacer } from "./Spacer";

export function RecurringRecommendationCard({
  recommendation,
  isSelected,
  onToggle,
}: {
  recommendation: RecurringRecommendation;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const context = useOutletContext<AppContext>();

  const getOccurrenceText = () => {
    const { occurrence, interval } = recommendation;
    if (occurrence === "month" && interval === 1) return "Monthly";
    if (occurrence === "year" && interval === 1) return "Yearly";
    if (occurrence === "day") {
      if (interval === 1) return "Daily";
      if (interval === 7) return "Weekly";
      if (interval === 14) return "Bi-weekly";
    }
    return `Every ${interval} ${occurrence}${interval > 1 ? "s" : ""}`;
  };

  return (
    <Ripple>
      <div
        onClick={onToggle}
        className={`border rounded-md p-4 cursor-pointer bg-base transition-all ${isSelected
          ? "border-2 border-info"
          : "border-primary"
          }`}
      >
        <div className="flex flex-col">
          <div className="flex items-start">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggle}
              onClick={(e) => e.stopPropagation()}
              className="form-checkbox checkbox mt-1 mr-3"
            />
            <div className="flex-1">
              <div className="flex">
                <span className="font-bold">{recommendation.category}</span>
                <span className="grow"></span>
                <span className={getTransactionColor(recommendation.type) + " font-bold"}>
                  {recommendation.type === "income" ? "+" : "-"}
                  {formatNumber(recommendation.amount.toString(), context.userPreferredLocale)}
                </span>
              </div>

              {recommendation.description && (
                <div>
                  <Spacer size={1} />
                  <span className="flex gap-2">
                    <InfoIcon size={24} />
                    <span className="text-primary">{recommendation.description}</span>
                  </span>
                </div>
              )}

              <Spacer size={1} />
              <div className="flex">
                <span className="text-secondary">{getOccurrenceText()}</span>
                <span className="grow"></span>
                <span className="text-secondary">{recommendation.paymentMode}</span>
              </div>

              <Spacer size={2} />

              <div className="bg-info rounded-md p-3">
                <div className="flex items-start gap-2">
                  <span className="text-sm font-semibold text-info">
                    AI Insight ({recommendation.confidence} confidence):
                  </span>
                </div>
                <Spacer size={1} />
                <p className="text-sm text-info">{recommendation.reasoning}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Ripple>
  );
}
