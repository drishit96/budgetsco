import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
} from "recharts";
import type { Currency } from "~/utils/number.utils";
import { formatToCurrency, formatNumber } from "~/utils/number.utils";
import ReportViewSwitch from "./ReportViewSwitch";
import { Spacer } from "./Spacer";

export default function LineChartCard({
  title,
  data,
  xAxis,
  currency,
  locale,
  lines,
  zeroTotalInfoMsg,
  children,
}: {
  title: string;
  data: { [key: string]: string | number }[];
  xAxis: { name: string; dataKey: string };
  currency?: Currency;
  locale: string;
  lines: { name: string; dataKey: string; color: string }[];
  zeroTotalInfoMsg?: string;
  children?: React.ReactNode;
}) {
  const [chartView, setChartView] = useState(true);
  return (
    <>
      <div className="flex">
        <p className="text-xl font-bold">{title}</p>
        <span className="grow"></span>
        <ReportViewSwitch
          chartView={chartView}
          onChange={() => setChartView((prev) => !prev)}
        />
      </div>
      {children}
      {data?.length > 0 && lines?.length > 0 && (
        <>
          <Spacer />

          {chartView && (
            <ResponsiveContainer width="99%" height={350}>
              <LineChart
                width={500}
                height={300}
                data={data.map((item) => {
                  //need to convert back to number since recharts doesn't support numbers in strings
                  let numData: { [key: string]: string | number } = {};
                  for (let key in item) {
                    //excluding date column as it's not a number
                    if (key === "date") {
                      numData[key] = item[key];
                    } else {
                      numData[key] = Number(item[key]);
                    }
                  }
                  return numData;
                })}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <XAxis type="category" dataKey={xAxis.dataKey} />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-color)",
                    borderColor: "var(--border-color)",
                  }}
                  formatter={(value) =>
                    formatToCurrency(value as number, locale, currency)
                  }
                />
                <Legend />
                {lines.map((line) => {
                  return (
                    <Line
                      key={line.name}
                      name={line.name}
                      type="monotone"
                      dataKey={line.dataKey}
                      stroke={line.color}
                      strokeWidth={2.5}
                      activeDot={{ r: 8 }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          )}

          {!chartView && (
            <table className="table-auto border-collapse w-full">
              <thead>
                <tr>
                  {[xAxis.name, ...lines.map((l) => l.name)].map((header, index) => (
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
                {data.map((row) => {
                  return (
                    <tr key={row[xAxis.dataKey]}>
                      {[xAxis.dataKey, ...lines.map((l) => l.dataKey)].map(
                        (col, index) => {
                          return (
                            <td
                              className={`p-1 border border-primary tabular-nums ${
                                index == 0 ? "text-left" : "text-right"
                              }`}
                              key={row[col]}
                            >
                              {typeof row[col] === "number"
                                ? formatNumber(row[col] as number, locale)
                                : row[col]}
                            </td>
                          );
                        }
                      )}
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
