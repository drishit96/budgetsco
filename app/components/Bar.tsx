export default function Bar({
  percentage,
  color,
}: {
  percentage: number;
  color: string;
}) {
  return (
    <div className="h-2 bg-gray-300 rounded-full">
      <div
        style={{ width: `${percentage}%` }}
        className={`h-full rounded-full ${color} print-color-adjust`}
      ></div>
    </div>
  );
}
