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

    if (username) {
        const existingUser = await prisma.user.findUnique({
            where: { username },
        });

        if (existingUser && existingUser.id !== session.user.id) {
            return { error: "Цей нікнейм вже зайнятий" };
        }
    }

    await prisma.user.update({
        where: { id: session.user.id },
        data: {
            name,
            username,
        },
    });

    revalidatePath("/dashboard");
    return { success: true };
}