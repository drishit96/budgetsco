import type { Color } from "~/utils/colors.utils";
import type { Currency } from "~/utils/number.utils";
import { calculate, sum } from "~/utils/number.utils";
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
