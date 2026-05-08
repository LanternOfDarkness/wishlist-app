"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Не авторизований");
    }

    const name = formData.get("name") as string;
    const username = formData.get("username") as string;
    const bgImage = formData.get("bgImage") as string;
    const bannerImage = formData.get("bannerImage") as string;
    const welcomeMessage = formData.get("welcomeMessage") as string;
    const itemBorder = formData.get("itemBorder") as string;
    const primaryColor = formData.get("primaryColor") as string;
    const textColor = formData.get("textColor") as string;
    const bgColor = formData.get("bgColor") as string;
    const font = formData.get("font") as string;
    const favoriteCurrencies = formData.getAll("favoriteCurrencies") as string[];

    if (username) {
        const existingUser = await prisma.user.findUnique({
            where: { username },
        });

        if (existingUser && existingUser.id !== session.user.id) {
            return { error: "Цей нікнейм вже зайнятий" };
        }
    }

    const appearance = {
      bgImage,
      bannerImage,
      welcomeMessage,
      itemBorder,
      primaryColor,
      font,
      favoriteCurrencies,
      textColor,
      bgColor
    };

    await prisma.user.update({
        where: { id: session.user.id },
        data: {
            name,
            username,
            wishlist: {
                update: {
                    appearance
                }
            }
        },
    });

    revalidatePath("/dashboard");
    return { success: true };
}
