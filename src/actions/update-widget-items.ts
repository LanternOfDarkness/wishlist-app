"use server";

import { getRepository } from "@/lib/repository";
import {
  requireAuthenticatedUserId,
  requireOwned,
  wishlistCommand,
  ValidationError,
} from "@/lib/wishlist-command";

export const updateWidgetItems = wishlistCommand(
  async (itemId: string, showInWidget: boolean) => {
    const userId = await requireAuthenticatedUserId();
    await requireOwned(
      getRepository().require({ type: "owned-item", itemId, userId, message: "Item not found" }),
    );

    const result = await getRepository().execute({
      type: "update-widget-item-visibility",
      itemId,
      userId,
      showInWidget,
    });

    if (!result.success) {
      throw new ValidationError(
        result.error === "limit-exceeded"
          ? "Maximum 5 items can be shown in widget"
          : "Please try again",
      );
    }
  },
  { revalidate: ["dashboardSettings", "embedPage"] },
);
