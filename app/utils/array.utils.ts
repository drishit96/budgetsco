import { formatDate_MMMM_YYYY } from "./date.utils";
import { isNullOrEmpty } from "./text.utils";

export function groupBy<T>(array: T[], key: keyof T, includeKeyInObject = false) {
  const validItems = array.filter(
    (item) => !isNullOrEmpty((item[key] as unknown as string)?.trim())
  );
  const map = Map.groupBy(validItems, (item) => (item[key] as unknown as string).trim());
  if (includeKeyInObject) {
    for (const [k, group] of map.entries()) {
      map.set(
        k,
        group.map((item) => {
          const copy = { ...item };
          delete copy[key];
          return copy;
        })
      );
    }
  }

  return map;
}

export function groupByDate<T>(array: T[], key: keyof T) {
  return Map.groupBy(array, (item) =>
    formatDate_MMMM_YYYY(new Date(item[key] as unknown as string))
  );
}

export function groupByDateToObject<T>(array: T[], key: keyof T) {
  return Object.groupBy(array, (item) =>
    formatDate_MMMM_YYYY(new Date(item[key] as unknown as string))
  ) as { [key: string]: T[] };
}

export function* getBatch<T>(array: T[], size: number) {
  for (let i = 0; i < array.length; i += size) {
    yield array.slice(i, i + size);
  }
}

export function sumOf<T>(array: T[], key: keyof T) {
  try {
    let sum = 0;
    array.forEach((element) => {
      sum += element[key] as number;
    });
    return sum;
  } catch (error) {
    return 0;
  }
}
