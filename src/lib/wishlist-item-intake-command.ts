import { prisma } from "./prisma";
import {
  requireOwnedWishlistById,
  requireOwnedWishlistItem,
} from "./wishlist-command-context";
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

export async function updateWishlistItemFromIntake(
  itemId: string,
  input: Omit<WishlistItemIntakeInput, "wishlistId">,
  userId: string,
) {
  const existingItem = await requireOwnedWishlistItem(itemId, userId);

  const intake = normalizeWishlistItemIntake({
    ...input,
    wishlistId: existingItem.wishlistId,
  });

  // On edit the category field is always submitted, so an empty selection
  // means "clear the category" rather than "leave unchanged" (Prisma treats
  // `undefined` as the latter, so an explicit `null` is required here).
  const categoryId = intake.newCategoryName
    ? await createWishlistItemCategory(intake.newCategoryName, userId)
    : (intake.categoryId ?? null);

  return prisma.item.update({
    where: { id: itemId },
    data: {
      name: intake.name,
      // Same rationale as categoryId: an edit form always submits these
      // fields, so a cleared field must overwrite the stored value.
      url: intake.url ?? null,
      imageUrl: intake.imageUrl ?? null,
      price: intake.price ?? null,
      currency: intake.currency,
      priority: intake.priority,
      isPrivate: intake.isPrivate,
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
