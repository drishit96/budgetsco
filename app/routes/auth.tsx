import { Ripple } from "@rmwc/ripple";
import { useState } from "react";
import { Link, Outlet, useOutletContext } from "@remix-run/react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { AppContext } from "~/root";

export type AuthPageContext = {
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
} & AppContext;

export default function Auth() {
  const context = useOutletContext<AppContext>();
  const [activeTab, setActiveTab] = useState("");
  const [tabsParent] = useAutoAnimate<HTMLDivElement>();
  const authPageContext: AuthPageContext = { setActiveTab, ...context };

  return (
    <main className="pl-5 pr-5">
      <div className="flex justify-center">
        <div className="flex grow max-w-xl">
          <Link className="w-1/2" to="/auth/login" onClick={() => setActiveTab("login")}>
            <Ripple>
              <p
                className={`p-2 text-sm font-bold sm:text-base sm:font-normal text-center border-l-2 border-t-2 border-b-2 border-accent rounded-l-md ${
                  activeTab === "login" ? "bg-emerald-700 text-white" : "text-accent"
                }`}
              >
                Login
              </p>
            </Ripple>
          </Link>
          <Link
            className="w-1/2"
            to="/auth/register"
            onClick={() => setActiveTab("register")}
          >
            <Ripple>
              <p
                className={`p-2 text-sm font-bold sm:text-base sm:font-normal text-center border-r-2 border-t-2 border-b-2 border-emerald-700 rounded-r-md ${
                  activeTab === "register"
                    ? "bg-emerald-700 text-white"
                    : "text-emerald-700"
                }`}
              >
                Register
              </p>
            </Ripple>
          </Link>
        </div>
      </div>

      <div ref={tabsParent} className="flex flex-col justify-center items-center">
        <Outlet context={authPageContext} />
      </div>
    </main>
  );
}
