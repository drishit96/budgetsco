export function getStorage<T>(key: string, defaultValue: T): T {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const value = window.localStorage.getItem(key);
      if (value == null) return defaultValue;
      if (typeof defaultValue === "boolean") {
        return (value === "true") as unknown as T;
      }
      if (typeof defaultValue === "object" && defaultValue !== null) {
        return JSON.parse(value) as T;
      }
      return value as unknown as T;
    }
  } catch (error) {
    console.log(error);
  }
  return defaultValue;
}

export function setStorage<T>(key: string, value: T): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const val =
        typeof value === "object" && value !== null
          ? JSON.stringify(value)
          : String(value);
      window.localStorage.setItem(key, val);
    }
  } catch (error) {
    console.log(error);
  }
}

export function getCurrentAppTheme() {
  return getStorage("theme", "system");
}

export function setAppTheme(theme: string) {
  if (theme === "system") {
    const isSystemInDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute(
      "data-theme",
      isSystemInDarkMode ? "dark" : "light"
    );
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }

  setStorage("theme", theme);
}
