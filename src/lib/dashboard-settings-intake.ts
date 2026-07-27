import type { Prisma } from "@prisma/client";

import { getAuthenticatedUserId } from "./wishlist-command-context";
import { prisma } from "./prisma";
import { buildWishlistItemWhere } from "./wishlist-filter-state";
import { itemVisibilityFor } from "./wishlist-visibility";

// The Settings page is rendered for the wishlist's own owner, so items are
// fetched without `isReserved` (and without any pledge data) — same
// surprise-preservation rule as the public presentation. This payload flows
// into client components (SettingsTabs -> EmbedWidget), so anything included
// here is serialized to the browser regardless of what the UI renders.
const DASHBOARD_SETTINGS_ITEM_SELECT = {
  id: true,
  name: true,
  url: true,
  imageUrl: true,
  price: true,
  currency: true,
  priority: true,
  isPrivate: true,
  isArchived: true,
  showInWidget: true,
  wishlistId: true,
  categoryId: true,
  createdAt: true,
} as const;

export type DashboardSettingsUser = Prisma.UserGetPayload<{
  include: {
    wishlist: {
      include: {
        items: {
          select: typeof DASHBOARD_SETTINGS_ITEM_SELECT;
          where: Prisma.ItemWhereInput;
          orderBy: {
            createdAt: "desc";
          };
        };
      };
    };
  };
}>;

export async function getDashboardSettingsIntake() {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return null;
  }

  // The dashboard is always the owner's own view, so it always sees its own
  // private items — but never archived ones (they belong to the archive
  // view, not the widget picker at embed-widget.tsx:215).
  const itemWhere = buildWishlistItemWhere(
    {},
    itemVisibilityFor("dashboard", { canViewWishlist: true, canViewPrivateItems: true }),
  );

  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      wishlist: {
        include: {
          items: {
            select: DASHBOARD_SETTINGS_ITEM_SELECT,
            where: itemWhere,
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });
}
