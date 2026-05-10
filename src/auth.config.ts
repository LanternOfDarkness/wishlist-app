import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: "/login",
    },
    trustHost: true,
    callbacks: {
        authorized() {
            return true;
        },
    },
    providers: [],
} satisfies NextAuthConfig;
