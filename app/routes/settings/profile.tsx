import { useEffect } from "react";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
  useOutletContext,
  useSubmit,
} from "@remix-run/react";
import {
  getUserPreferences,
  updateCollectAnalyticsPreference,
} from "~/modules/settings/settings.service";
import type { AppContext } from "~/root";
import { getSessionData, getUserIdFromSession } from "~/utils/auth.utils.server";
import type { V2_MetaFunction } from "@remix-run/react/dist/routeModules";
import { trackUserProfileUpdate } from "~/utils/analytics.utils.server";
import { InlineSpacer } from "~/components/InlineSpacer";

export const meta: V2_MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.id === "root");
  return [...(rootModule?.meta ?? []), { title: "My profile - Budgetsco" }];
};

export const action: ActionFunction = async ({ request }) => {
  const user = await getSessionData(request);
  if (user == null || user.userId == null) return redirect("/auth/login");

  const form = await request.formData();
  const formName = form.get("formName")?.toString();
  if (formName === "COLLECT_ANALYTICS") {
    const collectAnalytics = form.get("collectAnalytics")?.toString() === "true";
    if (collectAnalytics == null) return json({ isCollectAnalyticsSaved: false });

    const currentUserPreferences = await getUserPreferences(user.userId);
    if (currentUserPreferences == null)
      return json({
        data: {
          errors: { system: "Incorrect system state, please contact support" },
        },
      });

    let lastModified = 0;
    if (collectAnalytics) {
      lastModified = await updateCollectAnalyticsPreference(user.userId, true);
      lastModified > 0 &&
        trackUserProfileUpdate({
          request,
          updateType: "set",
          data: { collectAnalytics: "yes" },
        });
    } else {
      lastModified = await updateCollectAnalyticsPreference(user.userId, false);
      lastModified > 0 &&
        trackUserProfileUpdate({
          request,
          updateType: "unset",
          data: ["collectAnalytics"],
        });
    }

    return json({
      data: { isCollectAnalyticsSaved: lastModified > 0, collectAnalytics },
    });
  }

  return json({});
};

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await getUserIdFromSession(request);
  if (userId == null) return redirect("/auth/login");

  const collectAnalytics = (await getUserPreferences(userId))?.collectAnalytics ?? true;
  return json({ collectAnalytics });
};

export default function Profile() {
  const context = useOutletContext<AppContext>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData<{
    data?: {
      isCollectAnalyticsSaved?: boolean;
      collectAnalytics?: boolean;
    };
    errors?: { [key: string]: string };
  }>();
  const { collectAnalytics } = useLoaderData<{ collectAnalytics: boolean }>();
  const isSubmittingData = navigation.state === "submitting";

  useEffect(() => {
    context.showBackButton(true);
  }, []);

  useEffect(() => {
    if (actionData?.data?.isCollectAnalyticsSaved === true) {
      actionData?.data?.collectAnalytics === true
        ? context.setSnackBarMsg("Enabled usage data collection")
        : context.setSnackBarMsg("Disabled usage data collection");
    }
  }, [actionData?.data?.isCollectAnalyticsSaved, actionData?.data?.collectAnalytics]);

  function saveCollectAnalytics(collectAnalytics: boolean) {
    const form = new FormData();
    form.set("collectAnalytics", collectAnalytics.toString());
    form.set("formName", "COLLECT_ANALYTICS");
    context.setSnackBarMsg("Saving, please wait...");
    submit(form, { method: "POST", replace: true });
  }

  return (
    <>
      <main className="pt-7 pb-12 pl-3 pr-3">
        <p className="text-3xl text-center pb-7">My profile</p>
        <div className="flex flex-col justify-center items-center">
          <Form className="w-full md:w-2/3 p-4 border rounded-md" method="POST" replace>
            <label className="flex w-full">
              <input
                className="form-checkbox checkbox mt-1"
                type="checkbox"
                name="collectAnalytics"
                disabled={isSubmittingData}
                defaultChecked={collectAnalytics}
                onChange={(e) => saveCollectAnalytics(e.target.checked)}
              />
              <InlineSpacer size={1} />
              <span>
                <span className="text-md">Collect usage statistics</span>
                <br />
                <span className="text-secondary">
                  Enable to help us improve Budgetsco by sending anonymous usage data
                </span>
              </span>
            </label>
          </Form>
        </div>
      </main>
    </>
  );
}
