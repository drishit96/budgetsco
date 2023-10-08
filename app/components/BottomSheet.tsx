import { Ripple } from "@rmwc/ripple";
import clsx from "clsx";
import { useEffect } from "react";
import { Spacer } from "./Spacer";

type BottomSheetProps = {
  show: boolean;
  className?: string;
  setShow: React.Dispatch<React.SetStateAction<boolean>>;
  closeButtonSize?: "sm" | "lg";
  children?: any;
};

export const BottomSheet = ({
  show,
  className,
  setShow,
  closeButtonSize,
  children,
}: BottomSheetProps) => {
  useEffect(() => {
    if (show) {
      history.pushState(null, document.title, window.location.href);
      window.onpopstate = async () => {
        window.onpopstate = () => {};
        setShow(false);
      };
    }
  }, [show, setShow]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          "bg-black bg-opacity-60 h-screen fixed inset-0 z-40 transition-opacity duration-300",
          {
            "opacity-0 pointer-events-none": !show,
            "opacity-100": show,
          }
        )}
        onClick={() => {
          setShow(false);
          window.onpopstate = () => {};
          history.back();
        }}
        key="bottom-sheet"
      />
      {/* Bottom Sheet */}
      <div
        className={clsx(
          "flex flex-col items-center bg-base p-5 w-full h-fit md:w-3/4 lg:w-2/3 left-1/2 -translate-x-1/2 fixed bottom-0 transition-all duration-300 rounded-lg z-50 shadow-2xl",
          {
            "translate-y-full": !show,
            "translate-y-0": show,
          },

          className
        )}
      >
        <div className="w-full 2xl:w-2/3">
          {children}
          <Spacer size={1} />
          <Ripple>
            <button
              className={`w-full ${
                closeButtonSize === "sm" ? "btn-secondary-sm" : "btn-secondary"
              }`}
              onClick={() => {
                setShow(false);
                window.onpopstate = () => {};
                history.back();
              }}
            >
              Close
            </button>
          </Ripple>
        </div>
      </div>
    </>
  );
};
