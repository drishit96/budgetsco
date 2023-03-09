import type { Color } from "~/utils/colors.utils";
import type { Currency } from "~/utils/number.utils";
import { formatNumber } from "~/utils/number.utils";
import { formatPercentage } from "~/utils/number.utils";
import CustomLegendRow from "./CustomLegendRow";

export function CustomLegend({
  rows,
  valueType,
  currency,
  locale,
  colorSet,
}: {
  rows: { name: string; value: number }[];
  valueType: "number" | "currency";
  currency?: Currency;
  locale: string;
  colorSet?: Color[];
}) {
  const total = rows.reduce(
    (previousValue, currentValue) => previousValue + currentValue.value,
    0
  );

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
          percentage={formatPercentage((row.value / total) * 100, locale)}
        />
      ))}
    </>
  );
}
