import { useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Label, Tooltip } from "recharts";
import type { Color, ColorMap } from "~/utils/colors.utils";
import { CHART_COLOR_MAP } from "~/utils/colors.utils";
import type { Currency } from "~/utils/number.utils";
import {
  formatNumber,
  formatToCurrency,
  formatToCurrencyCompact,
} from "~/utils/number.utils";
import { CustomLegend } from "./CustomLegend";
import { InfoText } from "./InfoText";
import ReportViewSwitch from "./ReportViewSwitch";
import { Spacer } from "./Spacer";

export default function PieChartCard({
  title,
  data,
  total,
  currency,
  locale,
  colors,
  zeroTotalInfoMsg,
  colHeaders,
}: {
  title: string;
  data: { name: string; value: string }[];
  total: string;
  currency?: Currency;
  locale: string;
  colors?: ColorMap;
  zeroTotalInfoMsg?: string;
  colHeaders: string[];
}) {
  const [chartView, setChartView] = useState(true);
  return (
    <>
      <div className="flex">
        <p className="text-xl font-bold">{title}</p>
        <span className="flex-grow"></span>
        <ReportViewSwitch
          chartView={chartView}
          onChange={() => setChartView((prev) => !prev)}
        />
      </div>

      <Spacer size={1} />
      {total === "0" && <InfoText text={zeroTotalInfoMsg} />}
      {total !== "0" && data.length > 0 && (
        <>
          <Spacer />

          {chartView && (
            <>
              <ResponsiveContainer width="99%" height={200}>
                <PieChart width={100} height={100}>
                  <Pie
                    animationDuration={800}
                    //need to convert back to number since recharts doesn't support numbers in strings
                    data={data.map((d) => ({ ...d, value: Number(d.value) }))}
                    cx="50%"
                    innerRadius={83}
                    outerRadius={100}
                    stroke="var(--bg-color)"
                    dataKey="value"
                    legendType="circle"
                  >
                    {data.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          Object.values(colors ?? CHART_COLOR_MAP)[
                            index % Object.values(colors ?? CHART_COLOR_MAP).length
                          ]
                        }
                      />
                    ))}
                    <Label
                      width={30}
                      position="center"
                      fontSize={28}
                      fill="var(--text-color-primary-dark)"
                    >
                      {formatToCurrencyCompact(total, locale, currency)}
                    </Label>
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-color)",
                      borderColor: "var(--border-color)",
                    }}
                    itemStyle={{ color: "var(--text-color-primary)" }}
                    formatter={(value) =>
                      formatToCurrency(value as number, locale, currency)
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
              <Spacer size={4} />
              <CustomLegend
                rows={data}
                valueType="currency"
                currency={currency}
                locale={locale}
                colorSet={colors ? (Object.keys(colors) as Color[]) : undefined}
              />
            </>
          )}

          {!chartView && (
            <table className="table-auto border-collapse w-full">
              <thead>
                <tr>
                  {colHeaders.map((header, index) => (
                    <th
                      className={`p-1 border border-primary ${
                        index == 0 ? "text-left" : "text-right"
                      }`}
                      key={header}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((item) => {
                  return (
                    <tr key={item.name}>
                      <td className="p-1 border border-primary">{item.name}</td>
                      <td className="p-1 border border-primary text-right">
                        {formatNumber(item.value, locale)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      )}
    </>
  );
}
