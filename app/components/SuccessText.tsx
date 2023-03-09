import { isNotNullAndEmpty } from "~/utils/text.utils";

export function SuccessText({ text }: { text: string | undefined }) {
  return (
    <>
      {isNotNullAndEmpty(text) ? (
        <p className="text-emerald-800 bg-emerald-50 p-2 mt-2 rounded-md">
          {text}
        </p>
      ) : null}
    </>
  );
}
