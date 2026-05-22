import { useTransition } from "react";
import { updateWidgetItems } from "@/actions/update-widget-items";

export function useUpdateWidgetItems() {
  const [isPending, startTransition] = useTransition();

  const execute = (itemId: string, showInWidget: boolean, callbacks?: { onError?: (error: string) => void }) => {
    startTransition(async () => {
      const result = await updateWidgetItems(itemId, showInWidget);
      if (!result.success) {
        callbacks?.onError?.(result.error);
      }
    });
  };

  return { execute, isPending };
}
