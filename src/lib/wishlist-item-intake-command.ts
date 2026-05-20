import { prisma } from "./prisma";
import { requireOwnedWishlistById } from "./wishlist-command-context";
import {
  normalizeWishlistItemIntake,
  type WishlistItemIntakeInput,
} from "./wishlist-item-intake";

export async function createWishlistItemFromIntake(
  input: WishlistItemIntakeInput,
  userId: string,
) {
  const intake = normalizeWishlistItemIntake(input);

  await requireOwnedWishlistById(intake.wishlistId, userId);

  const categoryId = intake.newCategoryName
    ? await createWishlistItemCategory(intake.newCategoryName, userId)
    : intake.categoryId;

  return prisma.item.create({
    data: {
      name: intake.name,
      url: intake.url,
      imageUrl: intake.imageUrl,
      price: intake.price,
      currency: intake.currency,
      priority: intake.priority,
      isPrivate: intake.isPrivate,
      wishlistId: intake.wishlistId,
      categoryId,
    },
  });
}

async function createWishlistItemCategory(name: string, userId: string) {
  const category = await prisma.category.create({
    data: {
      name,
      userId,
    },
  });

  return category.id;
}
