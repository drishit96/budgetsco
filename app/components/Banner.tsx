import { Link } from "@remix-run/react";
import { Ripple } from "@rmwc/ripple";
import { useEffect, useState } from "react";
import {
  getBoolSettingFromLocalStorage,
  saveBoolSettingToLocalStorage,
} from "~/utils/setting.utils";
import BulbIcon from "./icons/BulbIcon";
import ErrorIcon from "./icons/ErrorIcon";
import InfoIcon from "./icons/InfoIcon";
import { InlineSpacer } from "./InlineSpacer";
import { Spacer } from "./Spacer";

type BannerType = "tip" | "important" | "urgent";

function getTextColorFromBannerType(bannerType: BannerType) {
  if (bannerType === "important") return "text-important";
  else if (bannerType === "urgent") return "text-urgent";
  else return "text-info";
}

function getBackgroundColorFromBannerType(bannerType: BannerType) {
  if (bannerType === "important") return "bg-important";
  else if (bannerType === "urgent") return "bg-urgent";
  else return "bg-info";
}

function getBorderColorFromBannerType(bannerType: BannerType) {
  if (bannerType === "important") return "border-important";
  else if (bannerType === "urgent") return "border-red-900";
  else return "border-sky-900";
}

function DismissButton({
  bannerType,
  onClick,
  permanent = false,
  tabIndex,
}: {
  bannerType: BannerType;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  permanent?: boolean;
  tabIndex?: number;
}) {
  return (
    <>
      <Ripple>
        <button
          className={`pl-2 pr-2 pt-1 pb-1 grow sm:grow-0 rounded-md border focus:ring-1 focus:ring-offset-2 ${getBorderColorFromBannerType(
            bannerType
          )}`}
          onClick={onClick}
          tabIndex={tabIndex}
        >
          {permanent ? "Don't show again" : "Dismiss"}
        </button>
      </Ripple>
    </>
  );
}

export default function Banner({
  type,
  message,
  showAction = false,
  actionText,
  onActionClick,
  showLink = false,
  link,
  linkText,
  allowDismiss = true,
  allowPermanentDismiss = false,
  permanentDismissSettingName,
  onDismiss,
  carouselMode = false,
  isVisible = true,
}: {
  type: BannerType;
  message: string;
  showAction?: boolean;
  actionText?: string;
  onActionClick?: React.MouseEventHandler<HTMLButtonElement>;
  showLink?: boolean;
  link?: string;
  linkText?: string;
  allowDismiss?: boolean;
  allowPermanentDismiss?: boolean;
  permanentDismissSettingName?: string;
  onDismiss?: () => void;
  carouselMode?: boolean;
  isVisible?: boolean;
}) {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    setShowBanner(
      permanentDismissSettingName
        ? getBoolSettingFromLocalStorage(permanentDismissSettingName, true)
        : true
    );
  }, []);

  const handleDismiss = (permanent = false) => {
    if (permanent && permanentDismissSettingName) {
      saveBoolSettingToLocalStorage(permanentDismissSettingName, false);
    }

    if (carouselMode && onDismiss) {
      // In carousel mode, let the carousel handle the dismissal
      onDismiss();
    } else {
      // In standalone mode, handle dismissal internally
      setShowBanner(false);
    }
  };

  // In carousel mode, make interactive elements non-focusable if not visible
  const interactiveTabIndex = carouselMode && !isVisible ? -1 : undefined;

  return (
    <>
      {(carouselMode || showBanner) && (
        <div
          className={`p-4 rounded-md w-full h-full flex flex-col
    ${getTextColorFromBannerType(type)} ${getBackgroundColorFromBannerType(type)}`}
        >
          <div className="flex">
            <div>
              {type === "urgent" && (
                <ErrorIcon size={28} color="var(--text-color-urgent)" />
              )}
              {type === "important" && (
                <InfoIcon size={28} color="var(--text-color-important)" />
              )}
              {type === "tip" && <BulbIcon size={28} color="var(--text-color-info)" />}
            </div>
            <div>
              <InlineSpacer size={1} />
              <span className="font-bold">
                {type === "urgent"
                  ? "Urgent: "
                  : type === "important"
                  ? "Important: "
                  : "Tip: "}
              </span>
              <InlineSpacer size={1} />
              <span>{message}</span>
              {/* <span className="grow"></span> */}
            </div>
          </div>
          <Spacer />
          <div className="grow"></div>
          {showAction && (
            <div className="flex justify-end flex-wrap-reverse gap-1">
              {allowPermanentDismiss && (
                <DismissButton
                  bannerType={type}
                  permanent={true}
                  onClick={() => handleDismiss(true)}
                  tabIndex={interactiveTabIndex}
                />
              )}
              {allowDismiss && (
                <DismissButton
                  bannerType={type}
                  onClick={() => handleDismiss(false)}
                  tabIndex={interactiveTabIndex}
                />
              )}
              <Ripple>
                <button
                  className={`pl-2 pr-2 pt-1 pb-1 grow sm:grow-0 border 
            ${getBorderColorFromBannerType(
              type
            )} rounded-md focus:ring-1 focus:ring-offset-2`}
                  onClick={onActionClick}
                  tabIndex={interactiveTabIndex}
                >
                  {actionText}
                </button>
              </Ripple>
            </div>
          )}
          {showLink && (
            <div className="flex justify-end flex-wrap-reverse gap-1">
              {allowPermanentDismiss && (
                <DismissButton
                  bannerType={type}
                  permanent={true}
                  onClick={() => handleDismiss(true)}
                  tabIndex={interactiveTabIndex}
                />
              )}
              {allowDismiss && (
                <DismissButton
                  bannerType={type}
                  onClick={() => handleDismiss(false)}
                  tabIndex={interactiveTabIndex}
                />
              )}

              <Ripple>
                <Link
                  className={`pl-2 pr-2 pt-1 pb-1 grow sm:grow-0 text-center border 
          ${getBorderColorFromBannerType(
            type
          )} rounded-md focus:ring-1 focus:ring-offset-2`}
                  to={link ?? ""}
                  tabIndex={interactiveTabIndex}
                >
                  {linkText}
                </Link>
              </Ripple>
            </div>
          )}
        </div>
      )}
    </>
  );
}
