import { useTransition } from "react";
import { updateWidgetSettings } from "@/actions/update-widget-settings";
import type { WidgetLayout } from "@/lib/wishlist-appearance";

export function useUpdateWidgetSettings() {
  const [isPending, startTransition] = useTransition();

  const execute = (
    settings: { layout?: WidgetLayout; itemSize?: number },
    callbacks?: { onSuccess?: () => void; onError?: (error: string) => void },
  ) => {
    startTransition(async () => {
      const result = await updateWidgetSettings(settings);
      if (result.success) {
        callbacks?.onSuccess?.();
      } else {
        callbacks?.onError?.(result.error);
      }
    });
  };

  return { execute, isPending };
}
