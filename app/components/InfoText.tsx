export function InfoText({ text }: { text: string | undefined }) {
  return (
    <>
      {text ? (
        <p className="text-info bg-info p-2 mt-2 rounded-md">{text}</p>
      ) : null}
    </>
  );
}
