import type { LinksFunction, LoaderFunctionArgs, TypedResponse } from "@remix-run/node";
import type { ShouldRevalidateFunction } from "@remix-run/react";
import {
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useLocation,
  useMatches,
  useNavigation,
  useRouteError,
} from "@remix-run/react";

import styles from "./styles/app.css?url";
import Report from "./components/Report";
import GenericError from "./components/GenericError";
import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { Spacer } from "./components/Spacer";
import { isNotNullAndEmpty } from "./utils/text.utils";
import Back from "./components/Back";
import { Ripple } from "@rmwc/ripple";
import SettingIcon from "./components/icons/SettingIcon";
import usePreferredCurrency from "./lib/usePreferredCurrency.hook";
import type { Currency } from "./utils/number.utils";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogButton,
} from "@rmwc/dialog";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import clsx from "clsx";
import DashboardIcon from "./components/icons/DashboardIcon";
import type {
  ErrorBoundaryComponent,
  MetaFunction,
} from "@remix-run/react/dist/routeModules";
import usePreferredLocale from "./lib/usePreferredLocale.hook";
import type { UserSessionData } from "./utils/auth.utils.server";
import {
  getSessionCookieWithUpdatedPreferences,
  getSessionData,
} from "./utils/auth.utils.server";
import { getUserPreferencesAfterTimestamp } from "./modules/settings/settings.service";
import {
  saveCustomCategoriesToLocalStorage,
  saveBrowserPreferencesToLocalStorage,
  saveLastModifiedToLocalStorage,
} from "./utils/category.utils";
import { BottomSheet } from "./components/BottomSheet";
import { getCurrentAppTheme, setAppTheme } from "./utils/setting.utils";

export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: styles },
    { rel: "manifest", href: "/manifest.webmanifest" },
    { rel: "icon", type: "image/ico", href: "/images/favicon.ico", sizes: "48x48" },
    { rel: "icon", type: "image/png", href: "/images/favicon-32x32.png", sizes: "32x32" },
    { rel: "icon", type: "image/png", href: "/images/favicon-16x16.png", sizes: "16x16" },
    { rel: "apple-touch-icon", href: "/icons/budgetsco_192x192_v1.png" },
  ];
};

export const meta: MetaFunction = () => {
  return [
    { property: "charset", content: "utf-8" },
    { name: "description", content: "A smart, reliable & intuitive expense manager" },
    { name: "theme-color", content: "#047857" },
    { name: "viewport", content: "width=device-width,initial-scale=1" },
    {
      property: "og:image",
      content: "https://budgetsco.fly.dev/images/budgetsco-og-image.png",
    },
    { property: "og:image:width", content: "192" },
    { property: "og:image:height", content: "192" },
    { property: "og:title", content: "Budgetsco" },
    {
      property: "og:description",
      content: "A simple, fast and reliable expense manager",
    },
    { property: "og:url", content: "https://budgetsco.fly.dev" },
  ];
};

export const ErrorBoundary: ErrorBoundaryComponent = () => {
  let error = useRouteError();
  console.log(error);
  return <GenericError />;
};

export const loader = async ({
  request,
}: LoaderFunctionArgs): Promise<TypedResponse<Partial<UserSessionData>>> => {
  const sessionData = await getSessionData(request);
  if (sessionData == null) return Response.json({});
  const userPreferences = await getUserPreferencesAfterTimestamp(
    sessionData.lastModified,
    sessionData.userId
  );

  if (userPreferences != null) {
    const headers: Headers = new Headers({
      "Set-Cookie": await getSessionCookieWithUpdatedPreferences(
        request,
        userPreferences
      ),
    });

    return Response.json({ ...userPreferences, updateLocalStore: true }, { headers });
  }
  const {
    isActiveSubscription,
    currency,
    locale,
    isEmailVerified,
    isMFAOn,
    isPasskeyPresent,
    paymentGateway,
  } = sessionData;
  return Response.json({
    isActiveSubscription,
    currency,
    locale,
    isEmailVerified,
    isMFAOn,
    isPasskeyPresent,
    paymentGateway,
  });
};

export const shouldRevalidate: ShouldRevalidateFunction = ({
  currentUrl,
  formMethod,
  nextUrl,
}) => {
  if (nextUrl.pathname.includes("/dashboard")) {
    return true;
  }

  if (
    (currentUrl.pathname.includes("/changeCurrency") ||
      currentUrl.pathname.includes("/profile")) &&
    formMethod === "POST"
  ) {
    return true;
  }

  return false;
};

export type DialogProps = {
  title: string;
  message: JSX.Element | string;
  showDialog: boolean;
  positiveButton?: string;
  negativeButton?: string;
  onPositiveClick?: () => void;
  onNegativeClick?: () => void;
};

export type DialogPropsOnBackPress = {
  title: string;
  message: string;
  positiveButton?: string;
  negativeButton?: string;
};

export type BottomSheetProps = {
  show: boolean;
  content: ReactElement;
  closeButtonSize?: "sm" | "lg";
  addToHistoryStack?: boolean;
  onCloseClick?: () => void;
};

export type AppContext = {
  showBackButton: React.Dispatch<React.SetStateAction<boolean>>;
  setSnackBarMsg: React.Dispatch<React.SetStateAction<string>>;
  setShowLoader: React.Dispatch<React.SetStateAction<boolean>>;
  setDialogProps: React.Dispatch<React.SetStateAction<DialogProps>>;
  userPreferredCurrency: Currency;
  setUserPreferredCurrency: React.Dispatch<React.SetStateAction<Currency>>;
  userPreferredLocale: string;
  setUserPreferredLocale: React.Dispatch<React.SetStateAction<string>>;
  setBottomSheetProps: React.Dispatch<React.SetStateAction<BottomSheetProps>>;
} & Partial<UserSessionData>;

export default function App() {
  let isMount = true;

  const {
    isActiveSubscription,
    currency,
    locale,
    isEmailVerified,
    updateLocalStore,
    customCategories,
    isMFAOn,
    isPasskeyPresent,
    paymentGateway,
    lastModified,
  } = useLoaderData<typeof loader>();
  const snackBarRef = useRef<HTMLDivElement>(null);
  const [snackBarMsg, setSnackBarMsg] = useState("");
  const [showLoader, setShowLoader] = useState(false);
  const [dialogProps, setDialogProps] = useState<DialogProps>({
    title: "",
    message: "",
    showDialog: false,
    positiveButton: "OK",
    negativeButton: "Cancel",
    onPositiveClick: () => {},
    onNegativeClick: () => {},
  });
  const [bottomSheetProps, setBottomSheetProps] = useState<BottomSheetProps>({
    show: false,
    content: <></>,
  });
  const [userPreferredCurrency, setUserPreferredCurrency] = usePreferredCurrency();
  const [userPreferredLocale, setUserPreferredLocale] = usePreferredLocale();
  const location = useLocation();
  let matches = useMatches();
  const navigation = useNavigation();
  const loadingProgress = useRef<HTMLDivElement>(null);
  const [pageParent] = useAutoAnimate<HTMLDivElement>();
  const [isBackButtonVisible, showBackButton] = useState(false);
  const context: AppContext = {
    showBackButton,
    setSnackBarMsg,
    setShowLoader,
    setDialogProps,
    userPreferredCurrency,
    setUserPreferredCurrency,
    userPreferredLocale,
    setUserPreferredLocale,
    setBottomSheetProps,
    isActiveSubscription,
    currency,
    locale,
    isEmailVerified,
    isMFAOn,
    isPasskeyPresent,
    paymentGateway,
  };

  useEffect(() => {
    setAppTheme(getCurrentAppTheme());
  }, []);

  useEffect(() => {
    if (navigation.state === "loading") {
      loadingProgress.current?.classList.remove("w-0");
      loadingProgress.current?.classList.add("duration-1000", "w-full", "bg-yellow-500");
    } else {
      setShowLoader(false);
      loadingProgress.current?.classList.remove(
        "duration-1000",
        "w-full",
        "bg-yellow-500"
      );
      loadingProgress.current?.classList.add("w-0");
    }
  }, [navigation]);

  useEffect(() => {
    let mounted = isMount;
    isMount = false;
    if ("serviceWorker" in navigator) {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller?.postMessage({
          type: "REMIX_NAVIGATION",
          isMount: mounted,
          location,
          matches,
          manifest: window.__remixManifest,
        });
      } else {
        let listener = async () => {
          await navigator.serviceWorker.ready;
          navigator.serviceWorker.controller?.postMessage({
            type: "REMIX_NAVIGATION",
            isMount: mounted,
            location,
            matches,
            manifest: window.__remixManifest,
          });
        };
        navigator.serviceWorker.addEventListener("controllerchange", listener);
        return () => {
          navigator.serviceWorker.removeEventListener("controllerchange", listener);
        };
      }
    }
  }, [location]);

  useEffect(() => {
    if (updateLocalStore) {
      customCategories && saveCustomCategoriesToLocalStorage(customCategories);
      currency && locale && saveBrowserPreferencesToLocalStorage(currency, locale);
      lastModified && saveLastModifiedToLocalStorage(lastModified);
    }

    if (
      navigator.onLine &&
      localStorage &&
      sessionStorage &&
      localStorage.getItem("requestsPending") === "true" &&
      sessionStorage.getItem("isSyncCalled") !== "true"
    ) {
      navigator.serviceWorker.controller?.postMessage({
        type: "SYNC_PENDING_REQUESTS",
      });
      sessionStorage.setItem("isSyncCalled", "true");
      localStorage.removeItem("requestsPending");
    }
  }, [updateLocalStore, isActiveSubscription]);

  useEffect(() => {
    let messageHandler = async (event: MessageEvent<any>) => {
      if (event.data.type === "NEW_REQUEST_IN_RETRY_QUEUE") {
        localStorage?.setItem("requestsPending", "true");
        setSnackBarMsg(
          "Looks like you're offline. We will sync your transactions when you're back online"
        );
      } else if (event.data.type === "REQUESTS_SYNCED") {
        setSnackBarMsg("Transactions synced successfully");
      }
    };
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", messageHandler);
      return () => {
        navigator.serviceWorker.removeEventListener("message", messageHandler);
      };
    }
  }, []);

  useEffect(() => {
    if (isNotNullAndEmpty(snackBarMsg)) {
      snackBarRef?.current?.classList.remove("invisible");
      setTimeout(() => {
        snackBarRef?.current?.classList.add("invisible");
        setSnackBarMsg("");
      }, snackBarMsg.length * 80);
    }
  }, [snackBarMsg]);

  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <div
          className={clsx(
            "bg-black bg-opacity-60 h-screen fixed inset-0 z-40 transition-opacity duration-300",
            {
              "opacity-0 pointer-events-none": !showLoader,
              "opacity-100": showLoader,
            }
          )}
        >
          {showLoader && (
            <div className="flex w-full h-screen items-center justify-center">
              <div className="flex flex-col items-center p-4 rounded-md bg-background">
                <Spacer size={1} />
                <div className="z-50 border-accent border-2 rounded-full animate-ping p-2"></div>
                <Spacer />
                <p className="text-sm text-primary">Loading...</p>
              </div>
            </div>
          )}
        </div>

        {/* <div className="z-20 block fixed w-full bg-emerald-700">
          <div
            ref={loadingProgress}
            className="transition-all ease-out w-0 h-1"
          ></div>
        </div> */}

        {isBackButtonVisible ? (
          <nav className="z-20 fixed bg-base rounded-full focus-border">
            <Ripple unbounded>
              <button className="p-4" onClick={() => history.go(-1)}>
                <Back size={24} color={"var(--text-color-primary)"} />
              </button>
            </Ripple>
          </nav>
        ) : null}

        {!isBackButtonVisible && (
          <div className="z-20 flex items-center">
            <span className="flex justify-center w-full">
              <p className="text-base text-primary font-bold p-3 border-b">budgetsco</p>
            </span>
          </div>
        )}

        {(location.pathname.includes("/dashboard") ||
          location.pathname.includes("/reports") ||
          location.pathname.includes("/settings/list")) && (
          <nav className="z-20 flex justify-evenly fixed bottom-0 left-1/2 -translate-x-1/2 w-full md:w-3/4 lg:w-2/3 xl:w-1/2 backdrop-blur-md border border-primary text-primary rounded-t-md font-bold shadow-2xl">
            <Ripple accent>
              <Link
                className="flex flex-col items-center w-full p-1 focus-border"
                to="/dashboard"
                title="Dashboard"
                replace={location.pathname !== "/dashboard"}
              >
                <span>
                  <DashboardIcon
                    size={24}
                    color={
                      location.pathname.includes("/dashboard")
                        ? "var(--text-color-accent)"
                        : "var(--text-color-primary)"
                    }
                  />
                </span>
                <p
                  className={`text-xs ${
                    location.pathname.includes("/dashboard")
                      ? "text-accent"
                      : "text-primary"
                  }`}
                >
                  Dashboard
                </p>
              </Link>
            </Ripple>
            <Ripple accent>
              <Link
                className="flex flex-col items-center w-full p-1 focus-border"
                to="/reports/thisMonth"
                title="Reports"
                replace={location.pathname !== "/dashboard"}
              >
                <span>
                  <Report
                    size={24}
                    color={
                      location.pathname.includes("/reports")
                        ? "var(--text-color-accent)"
                        : "var(--text-color-primary)"
                    }
                  />
                </span>
                <p
                  className={`text-xs ${
                    location.pathname.includes("/reports")
                      ? "text-accent"
                      : "text-primary"
                  }`}
                >
                  Reports
                </p>
              </Link>
            </Ripple>
            <Ripple accent>
              <Link
                className="flex flex-col items-center w-full p-1 focus-border"
                to="/settings/list"
                title="Settings"
                replace={location.pathname !== "/dashboard"}
              >
                <span>
                  <SettingIcon
                    size={24}
                    color={
                      location.pathname.includes("/settings/list")
                        ? "var(--text-color-accent)"
                        : "var(--text-color-primary)"
                    }
                  />
                </span>
                <p
                  className={`text-xs ${
                    location.pathname.includes("/settings/list")
                      ? "text-accent"
                      : "text-primary"
                  }`}
                >
                  Settings
                </p>
              </Link>
            </Ripple>
          </nav>
        )}

        <div ref={snackBarRef} className="invisible fixed w-full bottom-24 z-30">
          <div className="flex justify-center ml-2 mr-2">
            <div className="sm:w-3/4 p-3 mb-3 max-w-max rounded-sm bg-gray-700 text-center text-white">
              {snackBarMsg}
            </div>
          </div>
        </div>

        <Dialog
          open={dialogProps.showDialog}
          onClose={(evt) => {
            if (
              evt.detail.action === "accept" &&
              dialogProps.onPositiveClick != null &&
              typeof dialogProps.onPositiveClick === "function"
            ) {
              dialogProps.onPositiveClick();
            } else if (
              evt.detail.action === "close" &&
              dialogProps.onNegativeClick != null &&
              typeof dialogProps.onNegativeClick === "function"
            ) {
              dialogProps.onNegativeClick();
            }
            setDialogProps((prev) => ({
              ...prev,
              showDialog: !prev.showDialog,
            }));
          }}
        >
          <DialogTitle>{dialogProps.title}</DialogTitle>
          <DialogContent>{dialogProps.message}</DialogContent>
          <DialogActions>
            <DialogButton action="close">
              {dialogProps.showDialog && (dialogProps.negativeButton ?? "Cancel")}
            </DialogButton>
            <DialogButton action="accept" isDefaultAction>
              {dialogProps.showDialog && (dialogProps.positiveButton ?? "Ok")}
            </DialogButton>
          </DialogActions>
        </Dialog>

        <BottomSheet
          show={bottomSheetProps.show}
          addToHistoryStack={bottomSheetProps.addToHistoryStack}
          closeButtonSize={bottomSheetProps.closeButtonSize}
          onCloseClick={bottomSheetProps.onCloseClick}
          setShow={() => {
            setBottomSheetProps((prev) => ({ ...prev, show: !prev.show }));
          }}
        >
          {bottomSheetProps.content}
        </BottomSheet>

        <Spacer size={4} />
        <div className="text-primary" ref={pageParent}>
          <Outlet context={context} />
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
