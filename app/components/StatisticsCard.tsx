import type { Color } from "~/utils/colors.utils";
import { getTextColor } from "~/utils/colors.utils";
import type { Currency } from "~/utils/number.utils";
import { round, formatToCurrencyCompact } from "~/utils/number.utils";
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
  num: string;
  positiveIsBetter?: boolean;
  perc?: number;
  color?: Color;
  currency: Currency;
  locale: string;
}) {
  return (
    <div
      className={`flex-1 p-2 border border-primary rounded-md ${getTextColor(
        color
      )} bg-base shadow-sm`}
    >
      <p className="font-bold">{name}</p>
      <Spacer size={0.5} />
      <p className="text-2xl text-primary">
        {formatToCurrencyCompact(round(num), locale, currency)}
      </p>
      {perc != null && (
        <p
          className={`text-xs font-bold ${
            positiveIsBetter
              ? perc >= 0
                ? "text-accent"
                : "text-urgent"
              : perc < 0
              ? "text-accent"
              : "text-urgent"
          }`}
        >
          {perc >= 0 ? "▲" : "▼"} {Math.round(perc)}%
        </p>
      )}
    </div>
  );
}
