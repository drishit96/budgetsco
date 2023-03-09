import type { Color } from "~/utils/colors.utils";
import { getBackgroundDarkColor } from "~/utils/colors.utils";

export default function CustomLegendRow({
  color,
  name,
  value,
  percentage,
}: {
  color: Color;
  name: string;
  value: string;
  percentage?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`inline-block w-3 h-3 rounded-full 
        ${getBackgroundDarkColor(color)}`}
      ></div>
      <span>{name}</span>
      <span className="flex-grow"></span>
      <span className="whitespace-nowrap tabular-nums">
        {value} {percentage != null ? `(${percentage}%)` : ""}
      </span>
    </div>
  );
}
