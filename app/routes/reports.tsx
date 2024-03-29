import { Ripple } from "@rmwc/ripple";
import { useEffect, useState } from "react";
import { Link, Outlet, useOutletContext } from "@remix-run/react";
import type { AppContext } from "~/root";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { MetaFunction } from "@remix-run/react/dist/routeModules";

export const meta: MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.id === "root");
  return [...(rootModule?.meta ?? []), { title: "Reports - Budgetsco" }];
};

export type ReportsPageContext = {
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
} & AppContext;

export default function Reports() {
  const context = useOutletContext<AppContext>();
  const [activeTab, setActiveTab] = useState("");
  const [tabsParent] = useAutoAnimate<HTMLDivElement>({ easing: "ease-out" });
  const reportsPageContext: ReportsPageContext = { setActiveTab, ...context };

  useEffect(() => {
    context.showBackButton(true);
  }, [context]);

  return (
    <main className="pt-6 pb-16 pl-3 pr-3">
      <div className="flex justify-center">
        <div className="flex grow max-w-xl p-1 bg-emerald-700 rounded-xl">
          <Link className="w-1/3" to="/reports/thisMonth" replace>
            <Ripple>
              <p
                className={`p-1 text-sm font-bold sm:text-base sm:font-normal text-center rounded-lg focus-ring ${
                  activeTab === "thisMonth" ? "bg-background text-accent" : "text-white"
                }`}
              >
                This Month
              </p>
            </Ripple>
          </Link>
          <Link className="w-1/3" to="/reports/compare" replace>
            <Ripple>
              <p
                className={`p-1 text-sm font-bold sm:text-base sm:font-normal text-center rounded-lg ${
                  activeTab === "compare" ? "bg-background text-accent" : "text-white"
                }`}
              >
                Compare
              </p>
            </Ripple>
          </Link>
          <Link className="w-1/3" to="/reports/trend/expense" replace>
            <Ripple>
              <p
                className={`p-1 text-sm font-bold sm:text-base sm:font-normal text-center rounded-lg ${
                  activeTab === "trend" ? "bg-background text-accent" : "text-white"
                }`}
              >
                Trend
              </p>
            </Ripple>
          </Link>
        </div>
      </div>
      <div className="flex justify-center">
        <div ref={tabsParent} className="flex flex-col w-full xl:w-3/4">
          <Outlet context={reportsPageContext} />
        </div>
      </div>
    </main>
  );
}
