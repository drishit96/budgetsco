import { Ripple } from "@rmwc/ripple";
import DeleteIcon from "./icons/DeleteIcon";
import { InlineSpacer } from "./InlineSpacer";

function getSizeSpecificClassNames(size: "sm" | "md" | "lg") {
  if (size === "sm") {
    return "p-1 text-xs";
  } else if (size === "md") {
    return "p-2 text-base";
  } else {
    return "p-4 text-lg";
  }
}

export function Badge({
  value,
  size = "sm",
  isDeletable = false,
  onDelete,
}: {
  value: string;
  size?: "sm" | "md" | "lg";
  isDeletable?: boolean;
  onDelete?: () => void;
}) {
  return (
    <>
      <span
        className={`md:border-2 border-purple-200 text-purple-900 bg-purple-50 
        ${getSizeSpecificClassNames(size)} md:font-semibold rounded-lg`}
      >
        {value}
        {isDeletable && onDelete != null ? (
          <>
            <InlineSpacer size={1} />
            <Ripple unbounded>
              <button
                className="align-bottom"
                onClick={(e) => {
                  e.preventDefault();
                  onDelete();
                }}
              >
                <DeleteIcon size={24} color={"#581C87"} />
              </button>
            </Ripple>
          </>
        ) : null}
      </span>
    </>
  );
}
