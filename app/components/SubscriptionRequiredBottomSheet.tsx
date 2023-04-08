import { Ripple } from "@rmwc/ripple";
import type { AppContext } from "~/root";
import { Spacer } from "./Spacer";

export default function SubscriptionRequiredBottomSheet({
  context,
  onRefresh,
}: {
  context: AppContext;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col text-primary">
      <p className="text-2xl font-semibold">
        {context.paymentGateway == null
          ? "Start your 45-day free trial"
          : "Subscription required"}
      </p>
      <Spacer />
      <p>You need an active budgetsco subscription to create transactions.</p>
      <Spacer size={1} />
      <p className="text-sm">
        (Already subscribed?{" "}
        <button className="underline" onClick={() => onRefresh()}>
          Refresh status
        </button>
        .<br /> If the issue persists, please contact{" "}
        <a href="mailto:support@budgetsco.online">support@budgetsco.online</a>)
      </p>
      <Spacer />
      <Ripple>
        <button
          type="button"
          autoFocus
          className="btn-primary text-center"
          onClick={() => {
            context.setBottomSheetProps((prev) => ({
              content: <></>,
              show: !prev.show,
            }));
            location.replace("/subscriptions/gpb");
          }}
        >
          Continue
        </button>
      </Ripple>
    </div>
  );
}
