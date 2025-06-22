import type { Navigation, SubmitOptions } from "@remix-run/react";
import { useOutletContext, useSubmit, useNavigate } from "@remix-run/react";
import { Ripple } from "@rmwc/ripple";
import type { AppContext } from "~/root";
import { Spacer } from "./Spacer";
import ListItem from "./ListItem";
import TrashIcon from "./icons/TrashIcon";
import EditIcon from "./icons/EditIcon";
import { formatDate_DD_MMMM_YYYY } from "~/utils/date.utils";

export default function PersonalAccessToken({
  token,
  navigation,
  hideDivider = false,
  index,
  expandedIndex,
  setExpandedIndex,
}: {
  token: {
    name: string;
    id: string;
    createdAt: Date;
    expiresAt: Date;
  };
  navigation: Navigation;
  hideDivider?: boolean;
  index: number;
  expandedIndex?: number;
  setExpandedIndex: React.Dispatch<React.SetStateAction<number | undefined>>;
}) {
  const context = useOutletContext<AppContext>();
  const submit = useSubmit();
  const navigate = useNavigate();

  const isTokenDeletionInProgress =
    navigation.state === "submitting" &&
    navigation.formMethod === "DELETE" &&
    navigation.formData?.get("tokenId") === token.id;

  return (
    <ListItem
      dataTestId={`token-${token.name}`}
      hideDivider={hideDivider}
      index={index}
      expandedIndex={expandedIndex}
      setExpandedIndex={setExpandedIndex}
      content={
        <div className="flex flex-col items-start">
          <p className="text-lg text-primary font-bold">{token.name}</p>
          <p className="text-sm text-secondary">
            Expires on:{" "}
            {token.expiresAt
              ? formatDate_DD_MMMM_YYYY(new Date(token.expiresAt))
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
                  data-test-id={"btn-edit"}
                  className="flex flex-col w-full p-3 items-center focus-border"
                  onClick={() => navigate(`/settings/tokens/token/edit/${token.id}`)}
                >
                  <EditIcon size={24} />
                  <Spacer size={1} />
                  Edit
                </button>
              </Ripple>
            </div>
            <div className="flex-1 cursor-pointer border-l border-r border-primary">
              <Ripple>
                <button
                  data-test-id={"btn-delete"}
                  className="flex flex-col w-full p-3 items-center focus-border"
                  type="submit"
                  disabled={isTokenDeletionInProgress}
                  onClick={(e) => {
                    e.preventDefault();
                    context.setDialogProps({
                      title: "Delete token?",
                      message:
                        "Are you sure you want to delete this token? Any applications or scripts using this token will no longer be able to access the API.",
                      showDialog: true,
                      positiveButton: "Delete",
                      onPositiveClick: () => {
                        const form = new FormData();
                        form.set("formName", "DELETE_TOKEN");
                        form.set("tokenId", token.id);
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
                  {isTokenDeletionInProgress ? "Deleting..." : "Delete"}
                </button>
              </Ripple>
            </div>
          </div>
        </div>
      }
    />
  );
}
