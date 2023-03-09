import { useEffect, useState } from "react";
import type { Currency } from "~/utils/number.utils";

export default function usePreferredCurrency() {
  const [userPreferredCurrency, setUserPreferredCurrency] =
    useState<Currency>(null);

  useEffect(() => {
    setUserPreferredCurrency(localStorage.getItem("currency") as Currency);
  }, []);

  return [userPreferredCurrency, setUserPreferredCurrency] as [
    Currency,
    React.Dispatch<React.SetStateAction<Currency>>
  ];
}
