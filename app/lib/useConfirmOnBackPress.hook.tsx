import { useEffect } from "react";
import type { AppContext, DialogPropsOnBackPress } from "~/root";

export default function useConfirmOnBackPress(
  context: AppContext,
  dialogProps: DialogPropsOnBackPress
) {
  useEffect(() => {
    history.pushState(null, document.title, location.href);
    window.onpopstate = async () => {
      await new Promise((resolve) => {
        context.setDialogProps({
          ...dialogProps,
          showDialog: true,
          onPositiveClick: () => {
            window.onpopstate = () => {};
            history.back();
            resolve("done");
          },
          onNegativeClick: () => {
            history.pushState(null, document.title, location.href);
            resolve("done");
          },
        });
      });
    };
  }, []);
}
