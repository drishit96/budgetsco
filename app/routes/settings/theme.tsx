import type { V2_MetaFunction } from "@remix-run/react";
import { useOutletContext } from "@remix-run/react";
import { useEffect, useState } from "react";
import { Spacer } from "~/components/Spacer";
import type { AppContext } from "~/root";
import { getCurrentAppTheme, setAppTheme } from "~/utils/setting.utils";

export const meta: V2_MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.id === "root");
  return [...(rootModule?.meta ?? []), { title: "Theme - Budgetsco" }];
};

export default function Theme() {
  const context = useOutletContext<AppContext>();
  const [theme, setTheme] = useState("system");

  useEffect(() => {
    setTheme(getCurrentAppTheme());
  }, []);

  useEffect(() => {
    context.showBackButton(true);
  }, [context]);

  function setCurrentTheme(theme: string) {
    setTheme(theme);
    setAppTheme(theme);
  }

  return (
    <>
      <main className="pt-7 pl-4 pr-4 pb-20">
        <h1 className="text-3xl text-center pb-7">Theme</h1>
        <div className="flex justify-center">
          <div className="flex flex-col w-full border border-primary p-4 rounded-md lg:w-1/2">
            <h3 className="text-accent font-semibold">Appearance</h3>
            <Spacer />
            <label>
              <input
                className="form-radio radio"
                type="radio"
                name="theme"
                value="system"
                checked={theme === "system"}
                onChange={(e) => setCurrentTheme(e.target.value)}
              />
              <span className="pl-2">Use my system theme</span>
            </label>
            <Spacer size={1} />
            <label>
              <input
                className="form-radio radio"
                type="radio"
                name="theme"
                value="light"
                checked={theme === "light"}
                onChange={(e) => setCurrentTheme(e.target.value)}
              />
              <span className="pl-2">Light theme</span>
            </label>
            <Spacer size={1} />
            <label>
              <input
                className="form-radio radio"
                type="radio"
                name="theme"
                value="dark"
                checked={theme === "dark"}
                onChange={(e) => setCurrentTheme(e.target.value)}
              />
              <span className="pl-2">Dark theme</span>
            </label>
          </div>
        </div>
      </main>
    </>
  );
}
