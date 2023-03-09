export function InfoText({ text }: { text: string | undefined }) {
  return (
    <>
      {text ? (
        <p className="text-blue-900 bg-blue-50 p-2 mt-2 rounded-md">{text}</p>
      ) : null}
    </>
  );
}
