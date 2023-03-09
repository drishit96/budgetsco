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
