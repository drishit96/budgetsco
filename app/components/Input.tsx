import { ErrorValidation } from "./ErrorValidation";
import { InfoText } from "./InfoText";

export function Input({
  name,
  label,
  type,
  min,
  max,
  minLength,
  suggestions,
  autoFocus,
  required,
  info,
  error,
  onChangeHandler,
  defaultValue,
  value,
  autoComplete,
}: {
  name: string;
  label?: string;
  type?: string;
  min?: number;
  max?: number;
  minLength?: number;
  suggestions?: string[];
  autoFocus?: boolean;
  required?: boolean;
  info?: string;
  error?: string;
  defaultValue?: string | number;
  value?: string | number;
  autoComplete?: string;
  onChangeHandler?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex flex-col w-full">
      <label className="text-primary">
        {label}
        <span className="text-urgent">{required ? "*" : ""}</span>
        <br />
        {!suggestions ? (
          <input
            name={name}
            type={type}
            value={value}
            autoComplete={autoComplete}
            defaultValue={defaultValue}
            className="input w-full text-base"
            autoFocus={autoFocus}
            required={required}
            min={min}
            max={max}
            minLength={minLength}
            step=".01"
            onChange={onChangeHandler}
          />
        ) : null}

        {suggestions ? (
          <>
            <input
              name={name}
              list={`${name}-options`}
              className="input w-full text-base"
              autoFocus={autoFocus}
              required={required}
              defaultValue={defaultValue}
              onChange={onChangeHandler}
            />
            <datalist id={`${name}-options`} className="w-full">
              {suggestions.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </>
        ) : null}
      </label>
      <InfoText text={info} />
      <ErrorValidation error={error} />
    </div>
  );
}
