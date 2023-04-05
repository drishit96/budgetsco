import { useRef, useState, useEffect } from "react";

export default function NumberInputLarge({
  name,
  min,
  autoFocus,
  selectOnAutoFocus,
  required,
  onChangeHandler,
  defaultValue,
  prefix,
  disabled,
}: {
  name: string;
  min?: number;
  autoFocus?: boolean;
  selectOnAutoFocus?: boolean;
  required?: boolean;
  defaultValue?: string | number;
  prefix?: string;
  disabled?: boolean;
  onChangeHandler?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const amountRef = useRef<HTMLInputElement>(null);
  const [hiddenAmount, setHiddenAmount] = useState(defaultValue?.toString() ?? "0");

  useEffect(() => {
    if (selectOnAutoFocus) {
      amountRef.current?.select();
    }
  }, [selectOnAutoFocus]);

  return (
    <>
      {prefix != null ? <span className="text-4xl">{prefix}</span> : null}
      <span className="relative">
        <span
          className={`text-5xl pl-2 pr-2 ${disabled ? "invisible" : ""}`}
          aria-hidden="true"
        >
          {hiddenAmount}
        </span>
        <input
          name={name}
          ref={amountRef}
          className="absolute w-full bg-base left-0 text-5xl selection:bg-focus disabled:bg-transparent"
          type="number"
          autoFocus={autoFocus}
          defaultValue={defaultValue}
          required={required}
          min={min}
          step={0.01}
          disabled={disabled}
          onChange={(e) => {
            setHiddenAmount(e.target.value);
            if (onChangeHandler != null) {
              onChangeHandler(e);
            }
          }}
        />
      </span>
    </>
  );
}
