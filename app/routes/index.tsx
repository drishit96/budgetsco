import { Link } from "@remix-run/react";
import type { V2_MetaFunction } from "@remix-run/react/dist/routeModules";
import { Spacer } from "~/components/Spacer";

export const meta: V2_MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.route.id === "root");
  return [...(rootModule?.meta ?? []), { title: "Budgetsco" }];
};

export default function Home() {
  return (
    <>
      <section className="flex justify-between p-5">
        <div className="flex items-center w-full lg:w-1/2">
          <div className="flex flex-col items-center md:items-start">
            <h1 className="text-4xl lg:text-5xl xl:text-6xl text-center md:text-start">
              Handle your money like a pro
            </h1>
            <Spacer size={3} />
            <h2 className="text-xl text-center md:text-start">
              Start saving money for your dreams
            </h2>
            <Spacer size={4} />
            <Link to="/auth/register" className="btn-primary w-max shadow-lg">
              Start 45-day free trial
            </Link>
          </div>
        </div>

        <div className="hidden md:flex md:justify-center md:w-1/2">
          <picture>
            <img
              className="shadow-2xl rounded-lg"
              src="/images/hero-ss.png"
              alt="screenshot of budgeetsco app"
              width={350}
              loading="lazy"
            />
          </picture>
        </div>
      </section>
      <footer className="w-full p-5 justify-center bg-slate-800 text-slate-200">
        <p className="text-center">
          Made with <span className="text-red-700">♥</span> by{" "}
          <a
            className="text-amber-200"
            href="https://twitter.com/drishitmitra"
            target="_blank"
            rel="noopener noreferrer"
          >
            @drishitmitra
          </a>
        </p>
        <Spacer size={2} />
        <div className="flex flex-col flex-wrap gap-1 md:flex-row md:gap-3 justify-center">
          <Link className="text-amber-200" to="/privacy-policy">
            Privacy policy
          </Link>
          <Link className="text-amber-200" to="/terms-of-service">
            Terms of service
          </Link>
          <Link className="text-amber-200" to="/cancel-and-refund-policy">
            Cancel and Refund policy
          </Link>
        </div>
      </footer>
    </>
  );
}
