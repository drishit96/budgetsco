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
      <span className="text-primary-dark">{name}</span>
      <span className="grow"></span>
      <span className="text-primary whitespace-nowrap tabular-nums">
        {value} {percentage != null ? `(${percentage}%)` : ""}
      </span>
    </div>
  );
}
