import { Ripple } from "@rmwc/ripple";
import { useEffect, useState } from "react";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
  useOutletContext,
} from "@remix-run/react";
import CheckIcon from "~/components/icons/CheckIcon";
import { InlineSpacer } from "~/components/InlineSpacer";
import { parseCurrencyPreferenceInput } from "~/modules/settings/settings.schema";
import {
  getUserPreferences,
  updateCurrencyPreference,
} from "~/modules/settings/settings.service";
import type { AppContext } from "~/root";
import { getSessionData, getUserIdFromSession } from "~/utils/auth.utils.server";
import {
  getAllCurrencyOptions,
  saveLastModifiedToLocalStorage,
} from "~/utils/category.utils";
import type { Currency } from "~/utils/number.utils";
import { isNullOrEmpty } from "~/utils/text.utils";
import type { V2_MetaFunction } from "@remix-run/react/dist/routeModules";
import { saveBoolSettingToLocalStorage } from "~/utils/setting.utils";
import { ErrorValidation } from "~/components/ErrorValidation";
import { ComboBox } from "~/components/ComboBox";

const currencyOptions = getAllCurrencyOptions();

export const meta: V2_MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.route.id === "root");
  return [...(rootModule?.meta ?? []), { title: "Change currency - Budgetsco" }];
};

export const action: ActionFunction = async ({ request }) => {
  const user = await getSessionData(request);
  if (user == null || user.userId == null) return redirect("/auth/login");

  const form = await request.formData();
  const currency = form.get("currency")?.toString();

  const currentUserPreferences = await getUserPreferences(user.userId);
  if (currentUserPreferences == null)
    return json({
      data: {
        errors: { system: "Incorrect system state, please contact support" },
      },
    });

  if (isNullOrEmpty(currency)) return json({ data: { isCurrencySaved: true } });

  const userPreferenceInput = parseCurrencyPreferenceInput({ currency });

  let lastModified = 0;
  if (userPreferenceInput.errors) {
    return json({ errors: userPreferenceInput.errors });
  } else {
    lastModified = await updateCurrencyPreference(user.userId, currency);
  }

  return json({
    data: { isCurrencySaved: true, newCurrency: currency, lastModified },
  });
};

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await getUserIdFromSession(request);
  if (userId == null) return redirect("/auth/login");

  const urlParams = new URL(request.url).searchParams;
  let currency = urlParams.get("value");

  if (currency == null) {
    currency = (await getUserPreferences(userId))?.currency as string | null;
  }

  return json({ currency });
};

export default function ChangeCurrency() {
  const context = useOutletContext<AppContext>();
  const navigation = useNavigation();
  const actionData = useActionData<{
    data?: {
      isCurrencySaved: boolean;
      newCurrency?: string;
      lastModified?: number;
    };
    errors?: { [key: string]: string };
  }>();
  const { currency } = useLoaderData<{ currency: string }>();
  const [currentValue, setCurrentValue] = useState<{ label: string; value: string }>({
    label: currencyOptions.find((c) => c.value === currency)?.label ?? "",
    value: currency,
  });
  const isSubmittingData = navigation.state === "submitting";

  useEffect(() => {
    context.showBackButton(true);
  }, []);

  useEffect(() => {
    if (actionData?.data?.isCurrencySaved === true) {
      if (actionData.data.newCurrency) {
        context.setUserPreferredCurrency(actionData.data.newCurrency as Currency);
        localStorage.setItem("currency", actionData.data.newCurrency);
        saveBoolSettingToLocalStorage("showChangeCurrencyBanner", false);
        context.setSnackBarMsg("Currency updated");
      }

      if (actionData.data.lastModified) {
        saveLastModifiedToLocalStorage(actionData.data.lastModified);
      }

      history.back();
    }
  }, [actionData?.data?.isCurrencySaved]);

  return (
    <>
      <main className="pt-7 pb-12 pl-3 pr-3">
        <p className="text-3xl text-center pb-7">Change currency</p>
        <div className="flex flex-col justify-center items-center">
          <Form className="w-full md:w-1/3" method="post" replace>
            <ComboBox
              name="currencyToShow"
              labelId="New Currency"
              autoFocus
              placeholder="Type a currency name here"
              onSelectedItemChange={(changes) => {
                if (isNullOrEmpty(changes.selectedItem)) return;
                setCurrentValue({
                  label: changes.selectedItem.label,
                  value: changes.selectedItem.value,
                });
              }}
              selectedItem={currentValue}
              items={currencyOptions}
              itemToString={(item) => (item ? `${item.label}` : "")}
            />
            <input type="hidden" name="currency" value={currentValue?.value} />
            <ErrorValidation error={actionData?.errors?.currency} />

            <button type="submit" className="fixed bottom-8 right-8 shadow-xl focus-ring">
              <Ripple>
                <span className="flex items-center btn-primary">
                  <CheckIcon color="#FFF" />
                  <InlineSpacer size={1} />
                  {isSubmittingData ? "Saving..." : "Save"}
                </span>
              </Ripple>
            </button>
          </Form>
        </div>
      </main>
    </>
  );
}
