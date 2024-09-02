import type { PasskeyResponse } from "~/routes/settings/security/passkeys";
import { formatDate_DD_MMMM_YYYY_hh_mm_aa } from "~/utils/date.utils";
import ListItem from "./ListItem";
import type { Navigation, SubmitOptions } from "@remix-run/react";
import { useOutletContext, useSubmit } from "@remix-run/react";
import { Ripple } from "@rmwc/ripple";
import TrashIcon from "./icons/TrashIcon";
import { Spacer } from "./Spacer";
import type { AppContext } from "~/root";
import { Input } from "./Input";
import { useRef, useState } from "react";
import EditIcon from "./icons/EditIcon";

export default function Passkey({
  passkey,
  navigation,
  hideDivider = false,
  index,
  expandedIndex,
  setExpandedIndex,
}: {
  passkey: PasskeyResponse;
  navigation: Navigation;
  hideDivider?: boolean;
  index: number;
  expandedIndex?: number;
  setExpandedIndex: React.Dispatch<React.SetStateAction<number | undefined>>;
}) {
  const context = useOutletContext<AppContext>();
  const submit = useSubmit();

  const passkeyNameRef = useRef(passkey.displayName ?? "");

  const isPasskeyNameUpdateInProgress =
    navigation.state === "submitting" &&
    navigation.formData?.get("formName") === "SAVE_PASSKEY_NAME" &&
    navigation.formData?.get("passkeyId") === passkey.id;

  const isPasskeyDeletionInProgress =
    navigation.state === "submitting" &&
    navigation.formMethod === "DELETE" &&
    navigation.formData?.get("passkeyId") === passkey.id;

  return (
    <ListItem
      dataTestId={`passkey-${passkey.displayName}`}
      hideDivider={hideDivider}
      index={index}
      expandedIndex={expandedIndex}
      setExpandedIndex={setExpandedIndex}
      content={
        <div className="flex flex-col items-start">
          <p className="text-lg text-primary font-bold">
            {passkey.displayName ?? "Passkey"}
          </p>
          <p className="text-sm text-secondary">
            Created on:{" "}
            {passkey.createdAt
              ? formatDate_DD_MMMM_YYYY_hh_mm_aa(new Date(passkey.createdAt))
              : "Never"}
          </p>
          <p className="text-sm text-secondary">
            Last used:{" "}
            {passkey.lastUsed
              ? formatDate_DD_MMMM_YYYY_hh_mm_aa(new Date(passkey.lastUsed))
              : "Never"}
          </p>
        </div>
      }
      expandedContent={
        <div>
          <div className="w-full flex border-b border-t border-primary rounded-b-md bg-base">
            <div className="flex-1 cursor-pointer border-l border-primary">
              <Ripple>
                <button
                  data-test-id={"btn-delete"}
                  className="flex flex-col w-full p-3 items-center focus-border"
                  type="submit"
                  disabled={isPasskeyNameUpdateInProgress}
                  onClick={(e) => {
                    e.preventDefault();
                    context.setDialogProps({
                      title: "Edit passkey name",
                      message: <PasskeyNameInput passkeyNameRef={passkeyNameRef} />,
                      showDialog: true,
                      positiveButton: "Save",
                      onPositiveClick: () => {
                        const form = new FormData();
                        form.set("formName", "SAVE_PASSKEY_NAME");
                        form.set("passkeyId", passkey.id);
                        form.set("passkeyName", passkeyNameRef.current);
                        const submitOptions: SubmitOptions = {
                          method: "POST",
                          replace: true,
                        };
                        submit(form, submitOptions);
                      },
                    });
                  }}
                >
                  <EditIcon size={24} />
                  <Spacer size={1} />
                  {isPasskeyNameUpdateInProgress ? "Saving..." : "Edit name"}
                </button>
              </Ripple>
            </div>
            <div className="flex-1 cursor-pointer border-l border-r border-primary">
              <Ripple>
                <button
                  data-test-id={"btn-delete"}
                  className="flex flex-col w-full p-3 items-center focus-border"
                  type="submit"
                  disabled={isPasskeyDeletionInProgress}
                  onClick={(e) => {
                    e.preventDefault();
                    context.setDialogProps({
                      title: "Delete passkey?",
                      message:
                        "By removing this passkey you will no longer be able to use it to sign-in to your account from any of the devices on which it has been synced. Continue with deletion?",
                      showDialog: true,
                      positiveButton: "Delete",
                      onPositiveClick: () => {
                        const form = new FormData();
                        form.set("formName", "DELETE_PASSKEY");
                        form.set("passkeyId", passkey.id);
                        const submitOptions: SubmitOptions = {
                          method: "DELETE",
                          replace: true,
                        };
                        submit(form, submitOptions);
                      },
                    });
                  }}
                >
                  <TrashIcon size={24} />
                  <Spacer size={1} />
                  {isPasskeyDeletionInProgress ? "Deleting..." : "Delete"}
                </button>
              </Ripple>
            </div>
          </div>
        </div>
      }
    ></ListItem>
  );
}

export function PasskeyNameInput({
  passkeyNameRef,
}: {
  passkeyNameRef: React.MutableRefObject<string>;
}) {
  const [passkeyName, setPasskeyName] = useState(passkeyNameRef.current ?? "");
  return (
    <>
      <Input
        name="passkeyName"
        label="Passkey name"
        autoFocus
        required
        type="text"
        value={passkeyName}
        onChangeHandler={(e) => {
          passkeyNameRef.current = e.target.value;
          setPasskeyName(e.target.value);
        }}
      />
    </>
  );
}
