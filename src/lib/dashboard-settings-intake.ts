import { getRepository } from "./repository";
import { getAuthenticatedUserId } from "./wishlist-command";
import type { ItemData } from "./repository/types";

// The Settings page is rendered for the wishlist's own owner, so items are
// fetched without `isReserved` (and without any pledge data) — same
// surprise-preservation rule as the public presentation. This payload flows
// into client components (SettingsTabs -> EmbedWidget), so anything included
// here is serialized to the browser regardless of what the UI renders.
export type DashboardSettingsItem = Omit<ItemData, "isReserved">;

export interface DashboardSettingsUser {
  id: string;
  name: string | null;
  username: string | null;
  wishlist: {
    id: string;
    isPublic: boolean;
    shareToken: string | null;
    appearance: Record<string, unknown>;
    items: DashboardSettingsItem[];
  } | null;
}

function omitIsReserved(item: ItemData): DashboardSettingsItem {
  const rest: Record<string, unknown> = { ...item };
  delete rest.isReserved;
  return rest as DashboardSettingsItem;
}

export async function getDashboardSettingsIntake(): Promise<DashboardSettingsUser | null> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return null;
  }

  // The "dashboard-user" load spec already excludes archived items (the
  // dashboard is always the owner's own view, so it always sees its own
  // private items — but never archived ones; they belong to the archive
  // view, not the widget picker at embed-widget.tsx:215).
  const user = await getRepository().load({ type: "dashboard-user", userId });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    wishlist: user.wishlist
      ? {
          id: user.wishlist.id,
          isPublic: user.wishlist.isPublic,
          shareToken: user.wishlist.shareToken,
          appearance: user.wishlist.appearance,
          items: user.wishlist.items.map(omitIsReserved),
        }
      : null,
  };
}
