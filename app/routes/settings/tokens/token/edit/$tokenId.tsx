import { useEffect, useState } from "react";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import {
  useActionData,
  useLoaderData,
  useOutletContext,
  useNavigation,
  Form,
} from "@remix-run/react";
import { add } from "date-fns";
import type { AppContext } from "~/root";
import { Spacer } from "~/components/Spacer";
import { InlineSpacer } from "~/components/InlineSpacer";
import { Input } from "~/components/Input";
import { ErrorText } from "~/components/ErrorText";
import { Ripple } from "@rmwc/ripple";
import CheckIcon from "~/components/icons/CheckIcon";
import {
  getPersonalAccessTokenById,
  updatePersonalAccessToken,
} from "~/modules/settings/tokens/tokens.service";
import {
  parseTokenInput,
  type TokenInput,
  type TokenPermissions,
} from "~/modules/settings/tokens/tokens.schema";
import { getUserIdFromSession } from "~/utils/auth.utils.server";
import type { MetaFunction } from "@remix-run/node";
import { firstLetterToUpperCase, isNullOrEmpty } from "~/utils/text.utils";
import { formatDate_YYYY_MM_DD } from "~/utils/date.utils";
import { getDefaultTokenInput, getPermissionsFromForm } from "~/utils/token.utils";
import { logError } from "~/utils/logger.utils.server";

export const meta: MetaFunction = ({ matches }) => {
  const rootModule = matches.find((match) => match.id === "root");
  return [...(rootModule?.meta ?? []), { title: "Edit Token - Budgetsco" }];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await getUserIdFromSession(request);
  if (userId == null) return redirect("/auth/login");
  if (isNullOrEmpty(params.tokenId)) return { token: null };

  const token = await getPersonalAccessTokenById(userId, params.tokenId);
  if (token == null) {
    return redirect("/settings/tokens/list");
  }
  return {
    token: getDefaultTokenInput({
      ...token,
      permissions: token.permissions as TokenPermissions,
    }),
  };
};

export const action: ActionFunction = async ({ request, params }) => {
  try {
    const userId = await getUserIdFromSession(request);
    if (userId == null || isNullOrEmpty(params.tokenId)) {
      return redirect("/auth/login");
    }

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

    const success = await updatePersonalAccessToken(
      userId,
      params.tokenId,
      token.token.name,
      token.token.expiresAt,
      token.token.permissions
    );

    if (!success) {
      return { error: "Failed to update token, please try again", data: tokenInput };
    }

    return { success: true };
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
          <fieldset
            className="border border-primary p-3 rounded-md"
            key={`${parent}${permissionName}`}
          >
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
          <fieldset
            className="border border-primary p-3 rounded-md"
            key={`${parent}${permissionName}`}
          >
            <legend>
              {(permission.displayName as string) ??
                firstLetterToUpperCase(permissionName)}
            </legend>
            {renderPermissionSection(
              permission as TokenPermissions,
              `${parent ? `${parent}.` : ""}${permissionName}`
            )}
          </fieldset>
          <Spacer />
        </>
      );
    }
  });
}

export default function EditToken() {
  const context = useOutletContext<AppContext>();
  const { token } = useLoaderData<{ token: TokenInput & { id: string } }>();
  const actionData = useActionData<{
    success?: boolean;
    error?: string;
    errors?: { [key: string]: string };
    data?: TokenInput;
  }>();
  const navigation = useNavigation();
  const isSubmittingData = navigation.state === "submitting";
  const [tokenInputForm, setTokenInputForm] = useState<TokenInput>(() => ({
    ...token,
    expiresAt: new Date(token.expiresAt),
  }));

  useEffect(() => {
    context.showBackButton(true);
  }, [context]);

  useEffect(() => {
    if (actionData?.success) {
      context.setSnackBarMsg("Token updated successfully");
      history.back();
    }
  }, [actionData?.success]);

  useEffect(() => {
    if (isSubmittingData) {
      context.setSnackBarMsg("Updating token...");
    }
  }, [isSubmittingData]);

  if (!token) {
    return (
      <main className="p-7">
        <div className="text-center">Token not found</div>
      </main>
    );
  }

  return (
    <main className="p-7 pb-28">
      <h1 className="text-3xl text-center pb-7">Edit Token</h1>
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
                  setTokenInputForm((prev) => ({ ...prev, expiresAt: date }));
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
                custom categories).
              </p>

              {actionData?.errors?.permissions && (
                <>
                  <ErrorText error={actionData?.errors?.permissions} showIcon />
                </>
              )}
              <Spacer />
              {renderPermissionSection(tokenInputForm.permissions, "")}
            </fieldset>

            <button
              type="submit"
              className="fixed bottom-8 right-8 shadow-xl focus-ring"
              disabled={isSubmittingData}
            >
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
      </div>
    </main>
  );
}
