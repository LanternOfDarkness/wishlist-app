import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { getRepository } from "@/lib/repository";
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
                const emailPrefix = user.email?.split('@')[0] || `user`;
                let baseUsername = user.name
                    ? user.name.toLowerCase().replace(/\s+/g, '').replace(/[^\w-]/g, '')
                    : emailPrefix;
                if (baseUsername.length < 2) baseUsername = emailPrefix;
                const username = `${baseUsername}-${Date.now().toString().slice(-4)}`;

                await getRepository().execute({
                    type: "setup-user-account",
                    userId: user.id,
                    username,
                });
            }
        },
    },
})