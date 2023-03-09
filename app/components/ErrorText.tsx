import { isNotNullAndEmpty } from "~/utils/text.utils";
import ErrorIcon from "./icons/ErrorIcon";
import { InlineSpacer } from "./InlineSpacer";

export function ErrorText({
  error,
  showIcon,
}: {
  error: string | undefined;
  showIcon: boolean;
}) {
  return (
    <>
      {isNotNullAndEmpty(error) && (
        <>
          <div className="text-red-800 bg-red-50 p-2 mt-2 rounded-md">
            {showIcon && (
              <>
                <ErrorIcon size={24} color="#991B1B" />
                <InlineSpacer size={1} />
              </>
            )}
            {error}
          </div>
        </>
      )}
    </>
  );
}
