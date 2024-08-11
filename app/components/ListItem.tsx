import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Ripple } from "@rmwc/ripple";

export default function ListItem({
  dataTestId,
  hideDivider = false,
  index,
  expandedIndex,
  setExpandedIndex,
  content,
  expandedContent,
}: {
  dataTestId: string;
  hideDivider: boolean;
  index: number;
  expandedIndex?: number;
  setExpandedIndex: React.Dispatch<React.SetStateAction<number | undefined>>;
  content: React.ReactNode;
  expandedContent?: React.ReactNode;
}) {
  const [listItemParent] = useAutoAnimate<HTMLDivElement>();
  return (
    <div ref={listItemParent}>
      <Ripple>
        <button
          data-test-id={dataTestId}
          className={`w-full bg-base focus-border border-primary p-2 
          ${hideDivider ? "" : "border-b"} 
          ${expandedIndex === index ? "border-t border-l border-r rounded-t-md" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            setExpandedIndex((prevIndex) => (prevIndex === index ? undefined : index));
          }}
        >
          {content}
        </button>
      </Ripple>

      {expandedIndex === index && expandedContent}
    </div>
  );
}
