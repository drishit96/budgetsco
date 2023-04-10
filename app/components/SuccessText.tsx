import { isNotNullAndEmpty } from "~/utils/text.utils";

export function SuccessText({ text }: { text: string | undefined }) {
  return (
    <>
      {isNotNullAndEmpty(text) ? (
        <p className="text-accent bg-accent p-2 mt-2 rounded-md">{text}</p>
      ) : null}
    </>
  );
}
