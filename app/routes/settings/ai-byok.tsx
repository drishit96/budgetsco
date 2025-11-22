import { Ripple } from "@rmwc/ripple";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import type { MetaFunction } from "@remix-run/react";
import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useOutletContext,
} from "@remix-run/react";
import { useEffect, useState } from "react";
import CheckIcon from "~/components/icons/CheckIcon";
import { InlineSpacer } from "~/components/InlineSpacer";
import { Input } from "~/components/Input";
import { Spacer } from "~/components/Spacer";
import type { AppContext } from "~/root";
import {
  getAIProviderConfig,
  setAIProviderConfig,
} from "~/utils/aiProvider.utils.server";
import { parseAIProviderConfig } from "~/modules/ai/aiProvider.schema";
import { getSessionData } from "~/utils/auth.utils.server";

export const meta: MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.id === "root");
  return [...(rootModule?.meta ?? []), { title: "AI BYOK - Budgetsco" }];
};

export const loader: LoaderFunction = async ({ request }) => {
  const sessionData = await getSessionData(request);
  if (sessionData == null || sessionData.userId == null) {
    return redirect("/auth/login");
  }

  const config = await getAIProviderConfig(request);
  return Response.json({
    baseUrl: config?.baseUrl ?? "",
    model: config?.model ?? "",
    hasConfig: config !== null,
  });
};

export const action: ActionFunction = async ({ request }) => {
  const sessionData = await getSessionData(request);
  if (sessionData == null || sessionData.userId == null) {
    return redirect("/auth/login");
  }

  const formData = await request.formData();
  const apiKey = formData.get("apiKey") as string;
  const baseUrl = formData.get("baseUrl") as string;
  const model = formData.get("model") as string;

  const { errors, data: config } = parseAIProviderConfig({
    apiKey,
    baseUrl,
    model,
  });

  if (errors || !config) {
    return Response.json({ success: false, errors }, { status: 400 });
  }

  const cookie = await setAIProviderConfig(config);

  return Response.json(
    { success: true },
    {
      headers: {
        "Set-Cookie": cookie,
      },
    }
  );
};

export default function AIBYOK() {
  const context = useOutletContext<AppContext>();
  const {
    baseUrl: savedBaseUrl,
    model: savedModel,
    hasConfig,
  } = useLoaderData<{
    baseUrl: string;
    model: string;
    hasConfig: boolean;
  }>();
  const actionData = useActionData<typeof action>();
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(savedBaseUrl);
  const [model, setModel] = useState(savedModel);

  useEffect(() => {
    context.showBackButton(true);
  }, [context]);

  useEffect(() => {
    if (actionData?.success) {
      context.setSnackBarMsg("AI configuration saved successfully!");
      setApiKey("");
      history.back();
    }
  }, [actionData]);

  return (
    <>
      <main className="pt-7 pl-4 pr-4 pb-20">
        <h1 className="text-3xl text-center pb-7">AI BYOK</h1>
        <p className="text-secondary text-center">
          Bring Your Own API Keys - Connect to any OpenAI-compatible API
        </p>
        <Spacer size={2} />
        <div className="flex justify-center">
          <div className="flex flex-col w-full lg:w-1/2">
            <div className="border border-primary p-4 rounded-md">
              <Form method="post">
                <Input
                  type="url"
                  value={baseUrl}
                  onChangeHandler={(e) => setBaseUrl(e.target.value)}
                  name="baseUrl"
                  label="Base URL"
                  info="e.g., https://api.openai.com/v1 or https://openrouter.ai/api/v1"
                  required
                  autoFocus
                />
                <Spacer size={2} />

                <Input
                  type="password"
                  value={apiKey}
                  onChangeHandler={(e) => setApiKey(e.target.value)}
                  name="apiKey"
                  label="API Key"
                  required
                />
                <Spacer size={2} />

                <Input
                  type="text"
                  value={model}
                  onChangeHandler={(e) => setModel(e.target.value)}
                  name="model"
                  label="Model"
                  info="e.g., gpt-4, gpt-3.5-turbo, llama-3.1-70b-versatile"
                  required
                />
                <Spacer size={2} />

                {actionData?.errors && (
                  <>
                    <p className="text-urgent text-sm">{actionData.errors}</p>
                    <Spacer size={2} />
                  </>
                )}

                <Ripple>
                  <button type="submit" className="w-full btn-primary">
                    <CheckIcon color="#FFF" />
                    <InlineSpacer size={1} />
                    {hasConfig ? "Update Configuration" : "Save Configuration"}
                  </button>
                </Ripple>
              </Form>
              <Spacer size={2} />
              <p className="text-xs text-secondary">
                <strong>Note: </strong> Your API key is stored in your browser only and is
                sent to the server only when an AI-dependent feature is used. It does not
                sync to other devices.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
