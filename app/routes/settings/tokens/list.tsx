import { useEffect, useState } from "react";
import type { ActionFunction, LoaderFunctionArgs, TypedResponse } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import {
  useActionData,
  useOutletContext,
  useLoaderData,
  Link,
  useNavigation,
} from "@remix-run/react";
import PersonalAccessToken from "~/components/PersonalAccessToken";
import type { AppContext } from "~/root";
import { getUserIdFromSession } from "~/utils/auth.utils.server";
import { Spacer } from "~/components/Spacer";
import type { MetaFunction } from "@remix-run/node";
import { Ripple } from "@rmwc/ripple";
import AddIcon from "~/components/icons/AddIcon";
import { ErrorText } from "~/components/ErrorText";
import {
  deletePersonalAccessToken,
  getAllPersonalAccessTokens,
} from "~/modules/settings/tokens/tokens.service";
import { isNullOrEmpty } from "~/utils/text.utils";
import { logError } from "~/utils/logger.utils.server";

export const meta: MetaFunction = ({ matches }) => {
  const rootModule = matches.find((match) => match.id === "root");
  return [...(rootModule?.meta ?? []), { title: "Personal Access Tokens - Budgetsco" }];
};

export const loader = async ({
  request,
}: LoaderFunctionArgs): Promise<
  TypedResponse<
    {
      name: string;
      id: string;
      createdAt: Date;
      expiresAt: Date;
    }[]
  >
> => {
  const userId = await getUserIdFromSession(request);
  if (userId == null) return redirect("/auth/login");
  const tokens = await getAllPersonalAccessTokens(userId);
  return Response.json(tokens);
};

export const action: ActionFunction = async ({ request }) => {
  try {
    const userId = await getUserIdFromSession(request);
    if (userId == null) return redirect("/auth/login");

    const form = await request.formData();
    const formName = form.get("formName");

    if (formName === "DELETE_TOKEN") {
      if (request.method !== "DELETE") {
        return { formName, success: false, error: "Invalid request" };
      }

      const tokenId = form.get("tokenId")?.toString();
      if (isNullOrEmpty(tokenId)) {
        return { formName, success: false, error: "Token ID is required" };
      }

      const success = await deletePersonalAccessToken(userId, tokenId);
      return {
        formName,
        success,
        error: success ? null : "Failed to delete token",
      };
    }

    return { formName, success: false, error: "Invalid request" };
  } catch (error) {
    logError(error);
    return { error: "Something went wrong. Please try again" };
  }
};

export default function PersonalAccessTokens() {
  const context = useOutletContext<AppContext>();
  const tokens = useLoaderData<typeof loader>();
  const actionData = useActionData<{
    formName: string;
    success: boolean;
    error: string;
  }>();
  const [errorValue, setErrorValue] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number>();
  const navigation = useNavigation();

  useEffect(() => {
    context.setShowLoader(false);
    context.showBackButton(true);
  }, [context]);

  useEffect(() => {
    if (actionData?.error) {
      setErrorValue(actionData.error);
    } else if (actionData?.success) {
      setErrorValue("");
      switch (actionData.formName) {
        case "DELETE_TOKEN":
          context.setSnackBarMsg("Token deleted successfully");
          break;

        default:
          break;
      }
    }
  }, [actionData?.formName, actionData?.error, actionData?.success]);

  return (
    <main className="pt-7 pl-4 pr-4 pb-20">
      <h1 className="text-3xl text-center pb-5">Personal Access Tokens</h1>

      <div className="flex flex-col items-center">
        <p className="text-secondary mb-4 w-full lg:w-1/2">
          Personal access tokens are fine-grained tokens suitable for personal API use and
          for using Budgetsco with MCP. They can be used to authenticate to the API over
          Basic Authentication.
        </p>

        {errorValue && (
          <div className="flex justify-center w-full">
            <div className="w-full lg:w-1/2">
              <span className="text-center">
                <ErrorText error={errorValue} showIcon={true} />
              </span>
            </div>
          </div>
        )}
      </div>

      <Spacer />

      <div className="p-1 flex justify-center w-full">
        <ul className="flex flex-col w-full lg:w-1/2 border border-primary rounded-md">
          {tokens.length ? (
            tokens.map((token, index) => (
              <li key={token.id}>
                <PersonalAccessToken
                  key={token.id}
                  token={{
                    ...token,
                    createdAt: new Date(token.createdAt),
                    expiresAt: new Date(token.expiresAt),
                  }}
                  navigation={navigation}
                  hideDivider={index == tokens.length - 1}
                  index={index}
                  expandedIndex={expandedIndex}
                  setExpandedIndex={setExpandedIndex}
                />
              </li>
            ))
          ) : (
            <li className="p-4 text-center">No tokens found</li>
          )}
        </ul>
      </div>

      <Link
        to="/settings/tokens/token/new"
        className="z-20 fixed bottom-16 right-8 shadow-xl focus-ring"
      >
        <Ripple>
          <span className="flex items-center btn-primary">
            <AddIcon size={24} color={"#FFF"} />
            <p className="inline ml-1">Create Token</p>
          </span>
        </Ripple>
      </Link>
    </main>
  );
}
