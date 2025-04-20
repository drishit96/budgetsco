import type { UseComboboxProps } from "downshift";
import { useCombobox } from "downshift";
import { matchSorter } from "match-sorter";
import { isMobileDevice } from "~/utils/browser.utils";
import { Ripple } from "@rmwc/ripple";
import { useState } from "react";
import DownIcon from "./icons/DownIcon";

export interface ComboBoxProps<T> extends UseComboboxProps<T> {
  onCreateItem?: (item: T) => void;
  name: string;
  placeholder: string;
  autoFocus?: boolean;
}

export const ComboBox = <
  T extends {
    label: string;
    value: string | number;
  }
>(
  props: ComboBoxProps<T>
): React.ReactElement<ComboBoxProps<T>> => {
  const { onCreateItem, name, placeholder, autoFocus, ...downshiftProps } = props;
  const [inputItems, setInputItems] = useState(downshiftProps.items);
  const {
    isOpen,
    getToggleButtonProps,
    getLabelProps,
    getMenuProps,
    getInputProps,
    highlightedIndex,
    getItemProps,
    inputValue,
  } = useCombobox({
    ...downshiftProps,
    items: inputItems,
    defaultHighlightedIndex: 0,
    onInputValueChange: ({ inputValue }) => {
      if (inputValue == null) return;
      const filteredItems = matchSorter(downshiftProps.items, inputValue || "", {
        keys: ["value", "label"],
      });

      if (onCreateItem) {
        setInputItems([
          ...filteredItems,
          { label: `Create '${inputValue}'`, value: inputValue } as T,
        ]);
      } else {
        setInputItems(filteredItems);
      }
    },
    onStateChange: (changes) => {
      if (
        changes.selectedItem?.value === inputValue &&
        !downshiftProps.items.includes(changes.selectedItem)
      ) {
        if (onCreateItem) {
          onCreateItem(changes.selectedItem);
          setInputItems(downshiftProps.items);
        }
      }
    },
  });

  return (
    <div className="w-full">
      <label className="text-primary" {...getLabelProps()}>
        {downshiftProps.labelId}
        <div className="rounded-md flex relative">
          <input
            className="w-full p-2 text-base bg-base rounded-l-md border-t border-b border-l border-primary focus:border-2 focus:border-emerald-700"
            placeholder={placeholder}
            name={name}
            autoFocus={autoFocus}
            {...getInputProps()}
            onFocus={(e) => {
              e.target.select();
            }}
          />
          <Ripple>
            <button
              type="button"
              className="px-3 border-t border-r border-b border-primary rounded-r-md"
              {...getToggleButtonProps()}
              aria-label="toggle menu"
            >
              <span>
                <DownIcon size={24} />
              </span>
            </button>
          </Ripple>

          <ul
            style={isMobileDevice() ? { bottom: "100%" } : { top: "100%" }}
            className={`absolute left-0 right-0 bg-base rounded shadow-xl cursor-pointer z-30 ${
              isOpen ? "max-h-36" : ""
            } overflow-y-auto`}
            {...getMenuProps()}
          >
            {isOpen &&
              inputItems.map((item, index) => (
                <li
                  style={
                    highlightedIndex === index
                      ? { backgroundColor: "var(--focus-color)" }
                      : {}
                  }
                  className="p-2 pt-3 pb-3 text-base border-l border-r border-primary"
                  key={`${item}${index}`}
                  {...getItemProps({ item, index })}
                >
                  {item.label}
                </li>
              ))}
          </ul>
        </div>
      </label>
    </div>
  );
};
