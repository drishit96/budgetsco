import {
  format,
  sub,
  add,
  differenceInDays,
  differenceInMonths,
  differenceInYears,
} from "date-fns";

export function getFirstDateOfThisMonth(timezone: string) {
  const today = getCurrentLocalDateInUTC(timezone);
  return new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
}

export function getFirstDateOfMonth(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1));
}

export function getFirstDateOfXMonthsBeforeFormatted(difference = 1, timezone: string) {
  return formatDate_YYY_MM(getFirstDateOfXMonthsBefore(difference, timezone));
}

export function getFirstDateOfXMonthsBefore(difference = 1, timezone: string) {
  const firstDateOfThisMonth = getFirstDateOfThisMonth(timezone);
  return sub(firstDateOfThisMonth, { months: difference });
}

export function getFirstDateOfXMonthsAfter(difference = 1, timezone: string) {
  const firstDateOfThisMonth = getFirstDateOfThisMonth(timezone);
  return add(firstDateOfThisMonth, { months: difference });
}

/**
 * Returns the current datetime as per user timezone in UTC format (no conversion to UTC)
 * @param timezone
 * @returns date
 */
export function getCurrentLocalDateInUTC(timezone: string) {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hourCycle: "h23",
    });
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date()).map((p) => [p.type, p.value])
    );

    return new Date(
      Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
        Number(parts.second)
      )
    );
  } catch (e) {
    return new Date();
  }
}

export function formatDate_YYY_MM(date: Date) {
  return format(date, "yyyy-MM");
}

export function format_MMMM_YYYY(month: number, year: number) {
  const date = new Date(Date.UTC(year, month));
  return format(date, "MMMM yyyy");
}

export function format_MMM_YYYY(month: number, year: number) {
  const date = new Date(Date.UTC(year, month));
  return format(date, "MMM yyyy");
}

export function formatDate_MMMM_YYYY(date: Date) {
  return format(date, "MMMM yyyy");
}

export function formatDate_MMM_YYYY(date: Date) {
  return format(date, "MMM yyyy");
}

export function formatDate_DD_MMMM_YYYY(date: Date) {
  return format(date, "dd MMMM yyyy");
}

export function formatDate_DD_MMMM_YYYY_hh_mm_aa(date: Date) {
  return format(date, "dd MMMM yyyy, hh:mm aa");
}

export function formatDate_DD_MMMM_YYYY_hh_mm(date: Date) {
  return format(date, "yyyy-MM-dd hh:mm");
}

export function formatDate_YYYY_MM_DD(date: Date, silentError = false) {
  if (silentError) {
    try {
      return format(date, "yyyy-MM-dd");
    } catch (error) {
      return "";
    }
  }
  return format(date, "yyyy-MM-dd");
}

export function parseDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map((n) => Number(n));
  return new Date(Date.UTC(year, month - 1, day || 1));
}

export function getCurrentYear() {
  const today = new Date();
  return today.getFullYear();
}

export function getListOfYearsSince(year: number) {
  let currentYear = getCurrentYear();
  if (year > currentYear) return [];

  const yearsSoFar: number[] = [];
  while (currentYear >= year) {
    yearsSoFar.push(currentYear);
    currentYear--;
  }

  return yearsSoFar;
}

export function getListOfAllMonths() {
  return [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
}

export function getListOfHours() {
  return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
}

export function getListOfMinutes() {
  return Array.from({ length: 60 }, (_, i) => i);
}

export function getNextExecutionDate(
  occurrence: string,
  interval: number,
  previousDate?: Date,
  includeDiffWithCurrentDate: boolean = true
) {
  let executionDate = previousDate || new Date();
  if (occurrence === "day") {
    const diff = includeDiffWithCurrentDate
      ? Math.abs(differenceInDays(new Date(), executionDate))
      : 0;
    executionDate = add(executionDate, {
      days: diff + interval,
    });
  } else if (occurrence === "month") {
    const diff = includeDiffWithCurrentDate
      ? Math.abs(differenceInMonths(new Date(), executionDate))
      : 0;
    executionDate = add(executionDate, {
      months: diff + interval,
    });
  } else if (occurrence === "year") {
    const diff = includeDiffWithCurrentDate
      ? Math.abs(differenceInYears(new Date(), executionDate))
      : 0;
    executionDate = add(executionDate, {
      years: diff + interval,
    });
  }
  return executionDate;
}
