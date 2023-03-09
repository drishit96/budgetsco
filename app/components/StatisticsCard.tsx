import type { Color } from "~/utils/colors.utils";
import { getTextColor } from "~/utils/colors.utils";
import type { Currency } from "~/utils/number.utils";
import { formatToCurrencyCompact } from "~/utils/number.utils";
import { Spacer } from "./Spacer";

export function StatisticsCard({
  name,
  num,
  color,
  positiveIsBetter,
  perc,
  currency,
  locale,
}: {
  name: string;
  num: number;
  positiveIsBetter?: boolean;
  perc?: number;
  color: Color;
  currency: Currency;
  locale: string;
}) {
  return (
    <div className={`flex-1 p-2 border rounded-md ${getTextColor(color)} bg-white shadow-sm`}>
      <p className="font-bold">{name}</p>
      <Spacer size={0.5} />
      <p className="text-2xl text-gray-700">
        {formatToCurrencyCompact(Math.round(num), locale, currency)}
      </p>
      {perc != null && (
        <p
          className={`text-xs font-bold ${
            positiveIsBetter
              ? perc >= 0
                ? "text-green-900"
                : "text-red-900"
              : perc < 0
              ? "text-green-900"
              : "text-red-900"
          }`}
        >
          {perc >= 0 ? "▲" : "▼"} {Math.round(perc)}%
        </p>
      )}
    </div>
  );
}
