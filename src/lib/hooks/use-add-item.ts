import { useTransition } from "react";
import { addItem } from "@/actions/add-item";
import type { WishlistItemIntakeInput } from "@/lib/wishlist-item-intake";

export function useAddItem() {
  const [isPending, startTransition] = useTransition();

  const execute = (data: WishlistItemIntakeInput, callbacks?: { onSuccess?: () => void; onError?: (error: string) => void }) => {
    startTransition(async () => {
      try {
        const result = await addItem(data);
        if (result.success) {
          callbacks?.onSuccess?.();
        } else {
          callbacks?.onError?.(result.error);
        }
      } catch {
        callbacks?.onError?.("Failed to add item");
      }
    });
  };

  return { execute, isPending };
}
