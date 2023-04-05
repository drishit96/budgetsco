import type { V2_MetaFunction } from "@remix-run/react/dist/routeModules";

export const meta: V2_MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.route.id === "root");
  return [
    ...(rootModule?.meta ?? []),
    { title: "Cancellation/Refund policy - Budgetsco" },
  ];
};

export default function cancelAndRefundPolicy() {
  return (
    <>
      <main className="pb-28">
        <h1 className="text-3xl text-center pb-5">Cancellation & Refund policy</h1>
        <h3 className="text-sm text-center">Last updated: January 7, 2022</h3>
        <div className="flex flex-col items-center p-4">
          <div className="flex justify-center w-full md:w-3/4 lg:w-2/3 xl:w-1/2">
            <div>
              <p>
                Budgetsco has monthly and yearly plans. If you are on a yearly plan and
                forgot to cancel your subscription, please reach out to us within 7 days
                after the renewal date to discuss a refund. There are no refunds for the
                monthly plan, you must cancel before the monthly renewal date.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
