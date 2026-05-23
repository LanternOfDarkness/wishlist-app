import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { getRepository } from "@/lib/repository";
import { generateUsername } from "@/lib/slug";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    ...authConfig,
    callbacks: {
        ...authConfig.callbacks,
        async jwt({ token, user }) {
            if (user) {
                token.userId = user.id;
                token.username = user.username;
            }

            if (token.userId && !token.username) {
                const dbUser = await getRepository().load({ type: "user-by-id", id: token.userId as string });
                if (dbUser) {
                    token.username = dbUser.username;
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                if (token.userId) {
                    session.user.id = token.userId as string;
                }
                if (token.username) {
                    session.user.username = token.username as string;
                }
            }
            return session;
        },
    },
    providers: [
        Nodemailer({
            server: process.env.EMAIL_SERVER || "smtp://user:pass@smtp.example.com:587",
            from: process.env.EMAIL_FROM,
        }),

        Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }),
    ],
    events: {
        async createUser({ user }) {
            if (user.id) {
                const username = generateUsername(user.name, user.email ?? undefined);

                await getRepository().execute({
                    type: "setup-user-account",
                    userId: user.id,
                    username,
                    title: "My Wishlist",
                });
            }
        },
    },
})