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
  if (bannerType === "important") return "text-amber-900";
  else if (bannerType === "urgent") return "text-red-900";
  else return "text-sky-900";
}

function getBackgroundColorFromBannerType(bannerType: BannerType) {
  if (bannerType === "important") return "bg-amber-50";
  else if (bannerType === "urgent") return "bg-red-50";
  else return "bg-sky-50";
}

function getBorderColorFromBannerType(bannerType: BannerType) {
  if (bannerType === "important") return "border-amber-900";
  else if (bannerType === "urgent") return "border-red-900";
  else return "border-sky-900";
}

function DismissButton({
  bannerType,
  onClick,
  permanent = false,
}: {
  bannerType: BannerType;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  permanent?: boolean;
}) {
  return (
    <>
      <Ripple>
        <button
          className={`pl-2 pr-2 pt-1 pb-1 grow sm:grow-0 rounded-md border ${getBorderColorFromBannerType(
            bannerType
          )}`}
          onClick={onClick}
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
}) {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    setShowBanner(
      permanentDismissSettingName
        ? getBoolSettingFromLocalStorage(permanentDismissSettingName, true)
        : true
    );
  }, []);

  return (
    <>
      {showBanner && (
        <div
          className={`p-4 rounded-md w-full
    ${getTextColorFromBannerType(type)} ${getBackgroundColorFromBannerType(type)}`}
        >
          <div className="flex">
            <div>
              {type === "urgent" && <ErrorIcon size={28} color="#7F1D1D" />}
              {type === "important" && <InfoIcon size={28} color="#78350F" />}
              {type === "tip" && <BulbIcon size={28} color="#0C4A6E" />}
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
              {/* <span className="flex-grow"></span> */}
            </div>
          </div>
          <Spacer />
          {showAction && (
            <div className="flex justify-end flex-wrap-reverse gap-1">
              {allowPermanentDismiss && (
                <DismissButton
                  bannerType={type}
                  permanent={true}
                  onClick={() => {
                    permanentDismissSettingName &&
                      saveBoolSettingToLocalStorage(permanentDismissSettingName, false);
                    setShowBanner(false);
                  }}
                />
              )}
              {allowDismiss && (
                <DismissButton bannerType={type} onClick={() => setShowBanner(false)} />
              )}
              <Ripple>
                <button
                  className={`pl-2 pr-2 pt-1 pb-1 grow sm:grow-0 border 
            ${getBorderColorFromBannerType(type)} rounded-md`}
                  onClick={onActionClick}
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
                  onClick={() => {
                    permanentDismissSettingName &&
                      saveBoolSettingToLocalStorage(permanentDismissSettingName, false);
                    setShowBanner(false);
                  }}
                />
              )}
              {allowDismiss && (
                <DismissButton bannerType={type} onClick={() => setShowBanner(false)} />
              )}

              <Ripple>
                <Link
                  className={`pl-2 pr-2 pt-1 pb-1 grow sm:grow-0 text-center border 
          ${getBorderColorFromBannerType(type)} rounded-md`}
                  to={link ?? ""}
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
