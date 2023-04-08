import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Ripple } from "@rmwc/ripple";
import { useState, useEffect } from "react";
import { Form, useSubmit } from "@remix-run/react";
import { isMobileDevice } from "~/utils/browser.utils";
import { getAllMonths, getAllYears } from "~/utils/category.utils";
import { format_MMMM_YYYY } from "~/utils/date.utils";
import CompareIcon from "./icons/CompareIcon";
import EditIcon from "./icons/EditIcon";
import { Spacer } from "./Spacer";

const months = getAllMonths();
const years = getAllYears();

export default function MonthYearSelector({
  startMonth,
  startYear,
  endMonth,
  endYear,
  submitButtonName,
  submitAction,
}: {
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
  submitButtonName: string;
  submitAction: string;
}) {
  const [compareSettingContainer] = useAutoAnimate<HTMLDivElement>();
  const [showCompareSettingButton, setShowCompareSettingButton] = useState(true);
  const [showCompareSetting, setShowCompareSetting] = useState(false);
  const submit = useSubmit();

  useEffect(() => {
    if (!isMobileDevice()) {
      setShowCompareSettingButton(false);
      setShowCompareSetting(true);
    }
  }, []);
  return (
    <Form replace method="GET" className="lg:flex lg:justify-center flex-grow">
      {showCompareSettingButton && (
        <div className="flex w-full">
          <Ripple>
            <button
              className="flex p-3 border rounded-md mb-2 w-full"
              onClick={(e) => {
                e.preventDefault();
                setShowCompareSetting((prev) => !prev);
              }}
            >
              <span>{`${format_MMMM_YYYY(startMonth - 1, startYear)} - 
    ${format_MMMM_YYYY(endMonth - 1, endYear)}`}</span>
              <span className="flex-grow"></span>
              <EditIcon size={24} />
            </button>
          </Ripple>
        </div>
      )}

      <div
        className="lg:flex sm:flex-col lg:flex-row w-full"
        ref={compareSettingContainer}
      >
        {showCompareSetting && (
          <>
            <div className="flex gap-2 w-full">
              <select
                name="startMonth"
                className="form-select select w-full"
                defaultValue={months[startMonth - 1].value}
              >
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              <select
                name="startYear"
                className="form-select select w-full"
                defaultValue={startYear}
              >
                {years.map((year) => (
                  <option key={year.value} value={year.value}>
                    {year.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex pl-2 pr-2 justify-center">
              <CompareIcon size={48} color={"#5E5E5E"} />
            </div>

            <div className="flex gap-2 w-full">
              <select
                name="endMonth"
                className="form-select select w-full"
                defaultValue={months[endMonth - 1].value}
              >
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              <select
                name="endYear"
                className="form-select select w-full"
                defaultValue={endYear}
              >
                {years.map((year) => (
                  <option key={year.value} value={year.value}>
                    {year.label}
                  </option>
                ))}
              </select>
            </div>
            <Spacer size={3} />
            <div className="flex justify-center sm:justify-end">
              <Ripple>
                <button
                  type="submit"
                  className="btn-secondary w-full whitespace-nowrap"
                  onClick={(e) => {
                    e.preventDefault();
                    isMobileDevice() && setShowCompareSetting(false);
                    submit(e.currentTarget, {
                      method: "GET",
                      replace: true,
                      action: submitAction,
                    });
                  }}
                >
                  {submitButtonName}
                </button>
              </Ripple>
            </div>
          </>
        )}
      </div>
    </Form>
  );
}
