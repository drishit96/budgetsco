import { formatDate_MMMM_YYYY } from "./date.utils";
import { isNullOrEmpty } from "./text.utils";

export function groupBy<T>(array: T[], key: keyof T, includeKeyInObject = false) {
  let map = new Map<string, T[]>();
  for (let item of array) {
    const searchKey = (item[key] as unknown as string).trim();
    if (isNullOrEmpty(searchKey)) continue;
    if (includeKeyInObject) {
      item = { ...item };
      delete item[key];
    }
    if (map.has(searchKey)) {
      map.get(searchKey)!.push(item);
    } else {
      map.set(searchKey, [item]);
    }
  }

  return map;
}

export function groupByDate<T>(array: T[], key: keyof T) {
  let map = new Map<string, T[]>();
  for (const item of array) {
    let searchKey = item[key] as unknown as string;
    searchKey = formatDate_MMMM_YYYY(new Date(searchKey));
    if (map.has(searchKey)) {
      map.get(searchKey)!.push(item);
    } else {
      map.set(searchKey, [item]);
    }
  }

  return map;
}

export function groupByDateToObject<T>(array: T[], key: keyof T) {
  let map: { [key: string]: T[] } = {};
  for (const item of array) {
    let searchKey = item[key] as unknown as string;
    searchKey = formatDate_MMMM_YYYY(new Date(searchKey));
    if (map[searchKey]) {
      map[searchKey]!.push(item);
    } else {
      map[searchKey] = [item];
    }
  }

  return map;
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
