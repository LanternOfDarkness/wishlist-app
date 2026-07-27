"use server";

import type { Prisma } from "@prisma/client";
import {
    migrateLegacyAppearanceColors,
    parseWishlistAppearance,
} from "@/lib/wishlist-appearance";
import { prisma } from "@/lib/prisma";
import {
    requireAuthenticatedUserId,
    getOwnedWishlistAppearance,
} from "@/lib/wishlist-command-context";
import { isValidUsernameFormat, isReservedUsername } from "@/lib/username";
import { revalidatePath } from "next/cache";

// Every appearance field below must be present on every submit (via
// settings-form.tsx's always-present hidden inputs) or it's normalized back
// to its default here — none of these fall back to the previously stored
// value. Only widgetLayout/widgetItemSize (written by a different action)
// survive untouched, via parseWishlistAppearance's unknown-key preservation.
function extractAppearanceFormFields(formData: FormData) {
    return {
        colorPreset: formData.get("colorPreset"),
        bannerDisplayMode: formData.get("bannerDisplayMode"),
        advancedColorsEnabled: formData.get("advancedColorsEnabled"),
        advancedPrimaryColor: formData.get("advancedPrimaryColor"),
        advancedBackgroundColor: formData.get("advancedBackgroundColor"),
        advancedTextColor: formData.get("advancedTextColor"),
        bgImage: formData.get("bgImage"),
        bannerImage: formData.get("bannerImage"),
        welcomeMessage: formData.get("welcomeMessage"),
        itemBorder: formData.get("itemBorder"),
        font: formData.get("font"),
        favoriteCurrencies: formData.getAll("favoriteCurrencies"),
    };
}

export async function updateProfile(formData: FormData) {
    const userId = await requireAuthenticatedUserId("Не авторизований");

    const name = formData.get("name") as string;
    const username = formData.get("username") as string;
    const isPublicRaw = formData.get("isPublic");
    const isPublic =
        isPublicRaw === null ? undefined : isPublicRaw === "true";
    if (username) {
        if (!isValidUsernameFormat(username)) {
            return {
                error:
                    "Неприпустимий нікнейм. Дозволені літери, цифри та дефіси (3-30 символів).",
            };
        }

        if (isReservedUsername(username)) {
            return { error: "Цей нікнейм зарезервовано системою" };
        }

        const existingUser = await prisma.user.findUnique({
            where: { username },
        });

        if (existingUser && existingUser.id !== userId) {
            return { error: "Цей нікнейм вже зайнятий" };
        }
    }

    const wishlist = await getOwnedWishlistAppearance(userId);
    const currentAppearance =
        wishlist?.appearance &&
        typeof wishlist.appearance === "object" &&
        !Array.isArray(wishlist.appearance)
            ? (wishlist.appearance as Prisma.JsonObject)
            : ({} as Prisma.JsonObject);

    const appearance = parseWishlistAppearance({
      ...migrateLegacyAppearanceColors(currentAppearance),
      ...extractAppearanceFormFields(formData),
    });

    await prisma.user.update({
        where: { id: userId },
        data: {
            name,
            username,
            wishlist: {
                update: {
                    appearance: appearance as Prisma.InputJsonObject,
                    ...(isPublic === undefined ? {} : { isPublic }),
                }
            }
        },
    });

    revalidatePath("/dashboard");
    revalidatePath("/[locale]/[username]", "page");
    revalidatePath("/[locale]/embed/[username]", "page");
    return { success: true };
}
