import type { Color } from "~/utils/colors.utils";
import { getBackgroundDarkColor } from "~/utils/colors.utils";
import type { Currency } from "~/utils/number.utils";
import { calculate, sum } from "~/utils/number.utils";
import { formatNumber } from "~/utils/number.utils";
import { formatPercentage } from "~/utils/number.utils";

function CustomLegendRow({
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

export function CustomLegend({
  rows,
  valueType,
  currency,
  locale,
  colorSet,
}: {
  rows: { name: string; value: string }[];
  valueType: "number" | "currency";
  currency?: Currency;
  locale: string;
  colorSet?: Color[];
}) {
  const total = sum(rows.map((r) => r.value));

  return (
    <>
      {rows?.map((row, index) => (
        <CustomLegendRow
          key={row.name}
          color={colorSet ? colorSet[index] : "CHART-COLOR-1"}
          name={row.name}
          value={
            valueType == "currency"
              ? formatNumber(row.value, locale)
              : row.value.toString()
          }
          percentage={formatPercentage(
            calculate(row.value).dividedBy(total).mul(100).toString(),
            locale
          )}
        />
      ))}
    </>
  );
}
