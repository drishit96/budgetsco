export function saveBoolSettingToLocalStorage(settingName: string, value: boolean) {
  try {
    if (window && window.localStorage) {
      window.localStorage.setItem(settingName, value.toString());
    }
  } catch (error) {
    console.log(error);
  }
}

export function getBoolSettingFromLocalStorage(
  settingName: string,
  defaultValue: boolean
) {
  try {
    if (window && window.localStorage) {
      const value = window.localStorage.getItem(settingName);
      if (value == null) return defaultValue;
      return value === "true";
    }
    return defaultValue;
  } catch (error) {
    console.log(error);
    return false;
  }
}

export function getStringSettingFromLocalStorage(
  settingName: string,
  defaultValue: string
) {
  try {
    if (window && window.localStorage) {
      const value = window.localStorage.getItem(settingName);
      if (value == null) return defaultValue;
      return value;
    }
    return defaultValue;
  } catch (error) {
    console.log(error);
    return defaultValue;
  }
}

export function saveStringSettingToLocalStorage(settingName: string, value: string) {
  try {
    if (window && window.localStorage) {
      window.localStorage.setItem(settingName, value);
    }
  } catch (error) {
    console.log(error);
  }
}

export function getCurrentAppTheme() {
  return getStringSettingFromLocalStorage("theme", "system");
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

  saveStringSettingToLocalStorage("theme", theme);
}
