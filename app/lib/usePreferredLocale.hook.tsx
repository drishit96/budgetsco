import { useEffect, useState } from "react";

export default function usePreferredLocale() {
  const [userPreferredLocale, setUserPreferredLocale] = useState<string | null>(null);

  useEffect(() => {
    setUserPreferredLocale(localStorage.getItem("locale"));
  }, []);

  return [userPreferredLocale, setUserPreferredLocale] as [
    string,
    React.Dispatch<React.SetStateAction<string>>
  ];
}
