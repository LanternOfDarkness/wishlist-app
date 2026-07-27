import { useTransition } from "react";
import { updateWidgetSettings } from "@/actions/update-widget-settings";
import type { WidgetLayout } from "@/lib/wishlist-appearance";

export function useUpdateWidgetSettings() {
  const [isPending, startTransition] = useTransition();

  const execute = (settings: { layout?: WidgetLayout; itemSize?: number }, callbacks?: { onSuccess?: () => void }) => {
    startTransition(async () => {
      await updateWidgetSettings(settings);
      callbacks?.onSuccess?.();
    });
  };

  return { execute, isPending };
}
