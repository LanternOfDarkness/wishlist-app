import { getAuthenticatedUserId } from "./wishlist-command-context";
import { getRepository } from "./repository";

export type DashboardSettingsUser = {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  username: string | null;
  createdAt: Date;
  wishlist: {
    id: string;
    title: string;
    slug: string;
    isPublic: boolean;
    appearance: unknown;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{
      id: string;
      name: string;
      url: string | null;
      imageUrl: string | null;
      price: number | null;
      currency: string;
      priority: number;
      isReserved: boolean;
      isPrivate: boolean;
      showInWidget: boolean;
      wishlistId: string;
      categoryId: string | null;
      createdAt: Date;
    }>;
  } | null;
};

export async function getDashboardSettingsIntake() {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return null;
  }

  return getRepository().load({ type: "dashboard-user", userId });
}
