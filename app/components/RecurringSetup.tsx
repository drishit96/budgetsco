import { useEffect, useState } from "react";
import { getListOfHours, getListOfMinutes } from "~/utils/date.utils";
import { isNotNullAndEmpty } from "~/utils/text.utils";
import { ErrorValidation } from "./ErrorValidation";
import { Spacer } from "./Spacer";

const hours = getListOfHours();
const minutes = getListOfMinutes();

export default function RecurringSetup({
  disableInput,
  startDate,
  data,
  errors,
}: {
  disableInput: boolean;
  startDate?: string;
  data?: {
    occurrence: string;
    interval: number;
  };
  errors?: { [key: string]: string };
}) {
  const [date, setDate] = useState("");
  const [hour, setHour] = useState(0);
  const [minute, setMinute] = useState(0);
  const [meridiem, setMeridiem] = useState("");
  const [dateString, setDateString] = useState("");

  useEffect(() => {
    if (startDate != null) {
      const [tempDateString, tempTime, tempMeridiem] = startDate.split(" ");
      const tempDate = new Date(tempDateString);
      setDate(
        `${tempDate.getFullYear()}-${(tempDate.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-${tempDate.getDate().toString().padStart(2, "0")}`
      );
      setHour(Number(tempTime.split(":")[0]));
      setMinute(Number(tempTime.split(":")[1]));
      setMeridiem(tempMeridiem);
    }
  }, [startDate]);

  useEffect(() => {
    if (isNotNullAndEmpty(date)) {
      const tempDate = new Date(date);
      let tempHour = hour;
      if (hour === 12) {
        tempHour = 0;
      }
      if (meridiem === "PM") {
        tempHour += 12;
      }
      tempDate.setHours(tempHour, minute);
      setDateString(tempDate.toString());
    }
  }, [date, hour, minute, meridiem]);

  return (
    <fieldset className="text-primary" disabled={disableInput}>
      <p className="font-semibold">How often does this happen?</p>
      <Spacer size={1} />
      <div className="flex flex-wrap items-center gap-1">
        <span>Every</span>
        <input
          className="input text-base w-16"
          name="interval"
          type="number"
          min="1"
          defaultValue={data?.interval ?? 1}
        />
        <select
          className="form-select select"
          name="occurrence"
          defaultValue={data?.occurrence}
        >
          <option value="day">day(s)</option>
          <option value="month">month(s)</option>
          <option value="year">year(s)</option>
        </select>
        <ErrorValidation error={errors?.interval} />
      </div>

      {date && (
        <>
          <Spacer />
          <p>Start from:</p>
          <input
            className="form-input input text-base"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Spacer size={1} />
          <div className="flex gap-1">
            <select
              className="form-select select"
              value={hour.toString().padStart(2, "0")}
              onChange={(e) => setHour(Number(e.target.value))}
            >
              {hours.map((hour) => (
                <option key={hour}>{hour.toString().padStart(2, "0")}</option>
              ))}
            </select>
            <select
              className="form-select select"
              value={minute.toString().padStart(2, "0")}
              onChange={(e) => setMinute(Number(e.target.value))}
            >
              {minutes.map((minute) => (
                <option key={minute}>{minute.toString().padStart(2, "0")}</option>
              ))}
            </select>
            <select
              className="form-select select"
              name="meridiem"
              value={meridiem}
              onChange={(e) => setMeridiem(e.target.value)}
            >
              <option>AM</option>
              <option>PM</option>
            </select>
          </div>

          <input name="startDate" type="hidden" value={dateString} />

          <ErrorValidation error={errors?.startDate} />
        </>
      )}
    </fieldset>
  );
}
