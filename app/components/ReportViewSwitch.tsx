import { Ripple } from "@rmwc/ripple";
import Report from "./Report";
import TableIcon from "./icons/TableIcon";

export default function ReportViewSwitch({
  chartView,
  onChange,
}: {
  chartView: boolean;
  onChange: React.MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <div className="flex border rounded-md">
      <Ripple>
        <button
          className={`p-2 border-r rounded-tl-md rounded-bl-md ${
            chartView ? "bg-emerald-700" : ""
          }`}
          onClick={onChange}
        >
          <Report size={24} color={`${chartView ? "#FFF" : "#000"}`}></Report>
        </button>
      </Ripple>
      <Ripple>
        <button
          className={`p-2 rounded-tr-md rounded-br-md ${
            !chartView ? "bg-emerald-700" : ""
          }`}
          onClick={onChange}
        >
          <TableIcon size={24} color={`${!chartView ? "#FFF" : "#000"}`}></TableIcon>
        </button>
      </Ripple>
    </div>
  );
}
