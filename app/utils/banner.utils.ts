import type { BannerData } from "~/components/BannerCarousel/types";
import type { AppContext } from "~/root";
import { getCurrencyName } from "./category.utils";
import { getStorage } from "./setting.utils";

export interface DashboardLoaderData {
  overDueTransactions: any[];
  upcomingTransactions: any[];
  transactions: any[];
  targetDetails: {
    thisMonth: { budget: string; expense: string; date: string };
    prevMonth: { budget: string; expense: string };
  } | null;
  askUserForNewTarget: boolean;
  recommendToSetBudget: boolean;
  refreshSession: boolean;
}

export interface BannerPreparationContext {
  browserSupportsNotification?: boolean;
  notificationPermission?: NotificationPermission;
}

/**
 * Converts dashboard conditions into BannerData array for the carousel
 * Maps existing banner logic (MFA, currency, notifications, budget) to new data structure
 * Handles conditional banner display based on context and loader data
 * Ensures proper banner ID assignment for dismissal tracking
 */
export function prepareBannerData(
  context: AppContext,
  loaderData: DashboardLoaderData,
  additionalContext: BannerPreparationContext = {}
): BannerData[] {
  const banners: BannerData[] = [];

  // Security banner - MFA/Passkey setup
  if (!context.isMFAOn && !context.isPasskeyPresent) {
    const show2FABanner = getStorage("show2FASuggestion", true);
    if (show2FABanner) {
      banners.push({
        id: "security-setup",
        type: "important",
        message:
          "Add a passkey to avoid the need to remember your password. Or enable two factor authentication (2FA) to add an additional layer of security to your account by requiring more than just a password to sign in. (You can always enable it from settings)",
        showLink: true,
        link: "/settings/security/list",
        linkText: "Set up passkey or 2FA",
        allowDismiss: false,
        allowPermanentDismiss: true,
        permanentDismissSettingName: "show2FASuggestion",
        shouldShow: true,
      });
    }
  }

  // Currency setup banner
  const showCurrency = getStorage("showChangeCurrencyBanner", true);
  if (showCurrency) {
    banners.push({
      id: "currency-setup",
      type: "tip",
      message: `Your currency is set to ${getCurrencyName(
        context.currency || "USD"
      )}. If this isn't right, you can change it now. You can always change it from settings.`,
      showLink: true,
      link: `/settings/changeCurrency?value=${
        context.userPreferredCurrency ?? context.currency ?? "USD"
      }`,
      linkText: "Change currency",
      allowDismiss: false,
      allowPermanentDismiss: true,
      permanentDismissSettingName: "showChangeCurrencyBanner",
      shouldShow: true,
    });
  }

  // Notification permission banner
  if (
    additionalContext.browserSupportsNotification &&
    additionalContext.notificationPermission !== "granted"
  ) {
    const shouldShowNotification = getStorage(
      "showNotificationBanner",
      true
    );
    if (shouldShowNotification) {
      banners.push({
        id: "notification-setup",
        type: "tip",
        message: "Enable notifications for recurring transactions.",
        showAction: true,
        actionText: "Enable",
        // Note: onActionClick will need to be set by the component using this data
        // as it requires access to navigation and submit functions
        allowDismiss: false,
        allowPermanentDismiss: true,
        permanentDismissSettingName: "showNotificationBanner",
        shouldShow: true,
      });
    }
  }

  // Budget setup banner - new target needed
  if (context.isEmailVerified && loaderData.askUserForNewTarget) {
    banners.push({
      id: "budget-setup-new",
      type: "important",
      message: "It's time to set a budget for this month",
      showLink: true,
      link: "/settings/createBudget",
      linkText: "Set now",
      allowDismiss: true,
      allowPermanentDismiss: false,
      shouldShow: true,
    });
  }

  // Budget recommendation banner
  if (loaderData.recommendToSetBudget) {
    banners.push({
      id: "budget-recommendation",
      type: "tip",
      message: "Don't let your expenses control you",
      showLink: true,
      link: "/settings/editBudget",
      linkText: "Set budget now",
      allowDismiss: true,
      allowPermanentDismiss: false,
      shouldShow: true,
    });
  }

  // Filter banners that should be shown
  return banners.filter((banner) => banner.shouldShow);
}
