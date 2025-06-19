import { Ripple } from "@rmwc/ripple";
import { Form, useActionData, useLoaderData, useOutletContext } from "@remix-run/react";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useEffect, useState } from "react";
import { Input } from "~/components/Input";
import { Spacer } from "~/components/Spacer";
import { getSessionData } from "~/utils/auth.utils.server";
import { createPersonalAccessToken } from "~/modules/settings/tokens/tokens.service";
import {
  parseTokenInput,
  TokenInput,
  TokenPermissions,
} from "~/modules/settings/tokens/tokens.schema";
import CheckIcon from "~/components/icons/CheckIcon";
import { InlineSpacer } from "~/components/InlineSpacer";
import type { AppContext } from "~/root";
import { add } from "date-fns";
import { logError } from "~/utils/logger.utils.server";
import { formatDate_YYYY_MM_DD } from "~/utils/date.utils";
import { firstLetterToUpperCase } from "~/utils/text.utils";
import { ErrorText } from "~/components/ErrorText";
import { getDefaultTokenInput, getPermissionsFromForm } from "~/utils/token.utils";

export const loader: LoaderFunction = async ({ request }) => {
  const sessionData = await getSessionData(request);
  if (sessionData == null || sessionData.userId == null) {
    return redirect("/auth/login");
  }

  return getDefaultTokenInput();
};

export const action: ActionFunction = async ({ request }) => {
  try {
    const sessionData = await getSessionData(request);
    if (sessionData == null || sessionData.userId == null) {
      return redirect("/auth/login");
    }

    const { userId } = sessionData;
    const form = await request.formData();

    const tokenName = form.get("name")?.toString();
    const expiresAt =
      form.get("expiresAt") == null
        ? add(new Date(), { days: 30 })
        : new Date(form.get("expiresAt")!.toString());

    form.delete("name");
    form.delete("expiresAt");

    const tokenInput = {
      name: tokenName,
      expiresAt,
      permissions: getPermissionsFromForm(form),
    };

    const token = parseTokenInput(tokenInput);
    if (token.errors) {
      return { errors: token.errors, data: tokenInput };
    }

    const result = await createPersonalAccessToken(
      userId,
      token.token.name,
      token.token.expiresAt,
      token.token.permissions
    );

    if (!result.success) {
      return { error: "Failed to create token, please try again", data: tokenInput };
    }

    return { success: true, token: result.token };
  } catch (error) {
    logError(error);
    return { error: "Something went wrong. Please try again" };
  }
};

function renderPermissionSection(
  permissions: TokenPermissions,
  parent: string = ""
): React.ReactNode {
  return Object.entries(permissions).map((permissionKeyValue) => {
    const permissionName = permissionKeyValue[0];
    const permission = permissionKeyValue[1];
    if (
      permission.hasOwnProperty("read") ||
      permission.hasOwnProperty("write") ||
      permission.hasOwnProperty("delete")
    ) {
      return (
        <>
          <fieldset className="border border-primary p-3 rounded-md">
            <legend>
              {(permission.displayName as string) ??
                firstLetterToUpperCase(permissionName)}
            </legend>
            <label
              className={`flex items-center ${
                (permission.disabledPermissions as string[] | undefined)?.includes("read")
                  ? "opacity-75"
                  : ""
              }`}
            >
              <input
                className="form-checkbox checkbox"
                type="checkbox"
                name={`${parent ? `${parent}.` : ""}${permissionName}.read`}
                value="true"
                defaultChecked={permission.read as boolean}
                disabled={(
                  permission.disabledPermissions as string[] | undefined
                )?.includes("read")}
              />
              <InlineSpacer size={1} />
              <span>Read</span>
            </label>
            <Spacer size={1} />
            <label
              className={`flex items-center ${
                (permission.disabledPermissions as string[] | undefined)?.includes(
                  "write"
                )
                  ? "opacity-75"
                  : ""
              }`}
            >
              <input
                className="form-checkbox checkbox"
                type="checkbox"
                name={`${parent ? `${parent}.` : ""}${permissionName}.write`}
                value="true"
                defaultChecked={permission.write as boolean}
                disabled={(
                  permission.disabledPermissions as string[] | undefined
                )?.includes("write")}
              />
              <InlineSpacer size={1} />
              <span>Write</span>
            </label>
            {permission.hasOwnProperty("delete") && (
              <>
                <Spacer size={1} />
                <label
                  className={`flex items-center ${
                    (permission.disabledPermissions as string[] | undefined)?.includes(
                      "delete"
                    )
                      ? "opacity-75"
                      : ""
                  }`}
                >
                  <input
                    className="form-checkbox checkbox"
                    type="checkbox"
                    name={`${parent ? `${parent}.` : ""}${permissionName}.delete`}
                    value="true"
                    defaultChecked={permission.delete as boolean}
                    disabled={(
                      permission.disabledPermissions as string[] | undefined
                    )?.includes("delete")}
                  />
                  <InlineSpacer size={1} />
                  <span>Delete</span>
                </label>
              </>
            )}
          </fieldset>
          <Spacer />
        </>
      );
    } else {
      return (
        <>
          <fieldset className="border border-primary p-3 rounded-md">
            <legend>
              {(permission.displayName as string) ??
                firstLetterToUpperCase(permissionName)}
            </legend>
            {renderPermissionSection(
              permission as TokenPermissions,
              `${parent ? `${parent}.` : ""}${permissionName}`
            )}
          </fieldset>
        </>
      );
    }
  });
}

export default function CreateNewToken() {
  const context = useOutletContext<AppContext>();
  const defaultInput = useLoaderData<TokenInput>();
  const actionData = useActionData<{
    success?: boolean;
    error?: string;
    errors?: { [key: string]: string };
    data?: TokenInput;
    token?: string;
  }>();

  const [tokenInputForm, setTokenInputForm] = useState<TokenInput>(() => {
    const input = actionData?.data || defaultInput;
    return {
      ...input,
      expiresAt: new Date(input.expiresAt),
    };
  });

  useEffect(() => {
    context.showBackButton(true);
  }, [context]);

  useEffect(() => {
    if (actionData?.success) {
      context.setDialogProps({
        title: "Token Created",
        message: (
          <div>
            <p>
              Your new access token has been created successfully. Please make sure to
              copy it now, as you won't be able to see it again.
            </p>
            <Spacer />
            <div className="overflow-x-auto overflow-y-hidden">
              <code className="bg-gray-100 p-2 rounded-md">{actionData.token}</code>
            </div>
          </div>
        ),
        showDialog: true,
        positiveButton: "Done",
        onPositiveClick: () => {
          history.back();
        },
        onNegativeClick: () => {
          history.back();
        },
      });
    }
  }, [actionData?.success]);

  return (
    <main className="p-7 pb-28">
      <h1 className="text-3xl text-center pb-7">New Access Token</h1>
      <div className="flex justify-center">
        <div className="flex flex-col w-full max-w-2xl">
          <Form method="POST">
            <Input
              name="name"
              label="Token Name"
              required
              autoFocus
              error={actionData?.errors?.name}
              defaultValue={tokenInputForm.name}
            />
            <Spacer />

            <div>
              <label className="block text-base mb-2">Expiry</label>
              <input
                type="date"
                name="expiresAt"
                className="form-input input text-base"
                value={formatDate_YYYY_MM_DD(tokenInputForm.expiresAt, true)}
                onChange={(e) => {
                  const date = new Date(e.target.value);
                  setTokenInputForm({ ...tokenInputForm, expiresAt: date });
                }}
              />
              {actionData?.errors?.expiresAt && (
                <ErrorText error={actionData.errors.expiresAt} showIcon />
              )}
            </div>
            <Spacer size={3} />

            <fieldset className="border border-primary p-3 rounded-md">
              <legend className="text-lg">Token Permissions</legend>
              <p className="text-secondary">
                Select the minimal permissions necessary for your needs <br />
                (Note: Read permission is always granted if write or delete is selected.
                It is also provided by default for some permissions like currency and
                custom categories)
              </p>

              {actionData?.errors?.permissions && (
                <>
                  <ErrorText error={actionData?.errors?.permissions} showIcon />
                </>
              )}
              <Spacer />
              {renderPermissionSection(tokenInputForm.permissions)}
            </fieldset>

            <button type="submit" className="fixed bottom-8 right-8 shadow-xl focus-ring">
              <Ripple>
                <span className="flex items-center btn-primary">
                  <CheckIcon color="#FFF" />
                  <InlineSpacer size={1} />
                  Save
                </span>
              </Ripple>
            </button>
          </Form>
        </div>
      </div>
    </main>
  );
}
