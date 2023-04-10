import { isNotNullAndEmpty } from "~/utils/text.utils";

export function ErrorValidation({ error }: { error: string | undefined }) {
  return (
    <>
      {isNotNullAndEmpty(error) ? (
        <p className="text-urgent bg-urgent p-2 mt-2 rounded-md">{error}</p>
      ) : null}
    </>
  );
}
