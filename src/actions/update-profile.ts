"use server";

import {
    migrateLegacyAppearanceColors,
    parseWishlistAppearance,
} from "@/lib/wishlist-appearance";
import { getRepository } from "@/lib/repository";
import { isValidUsernameFormat, isReservedUsername } from "@/lib/username";
import {
    requireAuthenticatedUserId,
    wishlistCommand,
    ValidationError,
} from "@/lib/wishlist-command";

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

export const updateProfile = wishlistCommand(
    async (formData: FormData) => {
        const userId = await requireAuthenticatedUserId("Не авторизований");

        const name = formData.get("name") as string;
        const username = formData.get("username") as string;
        const isPublicRaw = formData.get("isPublic");
        const isPublic = isPublicRaw === null ? undefined : isPublicRaw === "true";

        if (username) {
            if (!isValidUsernameFormat(username)) {
                throw new ValidationError(
                    "Неприпустимий нікнейм. Дозволені літери, цифри та дефіси (3-30 символів).",
                );
            }

            if (isReservedUsername(username)) {
                throw new ValidationError("Цей нікнейм зарезервовано системою");
            }

            const existingUser = await getRepository().load({
                type: "user-by-username",
                username,
            });

            if (existingUser && existingUser.id !== userId) {
                throw new ValidationError("Цей нікнейм вже зайнятий");
            }
        }

        const wishlist = await getRepository().require({
            type: "wishlist-appearance",
            userId,
            message: "Wishlist not found",
        });

        const appearance = parseWishlistAppearance({
            ...migrateLegacyAppearanceColors(wishlist.appearance),
            ...extractAppearanceFormFields(formData),
        });

        await getRepository().execute({
            type: "update-user-profile",
            userId,
            name,
            username,
            appearance,
            isPublic,
        });
    },
    {
        revalidate: ["dashboard", "wishlistPage", "embedPage"],
        genericErrorMessage: "Failed to update profile",
    },
);
