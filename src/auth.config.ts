import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: "/",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            // Дозволяємо всі запити, оскільки логіку авторизації обробляємо в middleware
            return true;
        },
    },
    providers: [],
} satisfies NextAuthConfig;