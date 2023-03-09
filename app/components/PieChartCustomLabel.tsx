import { formatToCurrency } from "~/utils/number.utils";
import type { Currency } from "~/utils/number.utils";

export type PieChartCustomLabelProps = {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  value: number;
  index: number;
  colors: string[];
  currency: Currency;
};

export default function PieChartCustomLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  value,
  index,
  colors,
  currency,
}: PieChartCustomLabelProps) {
  const RADIAN = Math.PI / 180;
  const radius = 25 + innerRadius + (outerRadius - innerRadius);
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill={colors[index % colors.length]}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
    >
      {formatToCurrency(value, "en-US", currency)}
    </text>
  );
}
