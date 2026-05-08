import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    ...authConfig,
    callbacks: {
        // Спочатку розпаковуємо callbacks з authConfig
        ...authConfig.callbacks,
        // Потім перезаписуємо jwt та session
        async jwt({ token, user }) {
            // При першому вході (коли user існує), зберігаємо id
            if (user) {
                token.userId = user.id;
                token.username = user.username;
            }

            // Якщо username немає в токені, спробуємо отримати його з бази
            if (token.userId && !token.username) {
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.userId as string },
                    select: { username: true }
                });
                if (dbUser) {
                    token.username = dbUser.username;
                }
            }

            return token;
        },
        async session({ session, token }) {
            // Додаємо userId та username з токена до session.user
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

                await prisma.user.update({
                    where: { id: user.id },
                    data: { username: username }
                });

                await prisma.wishlist.create({
                    data: {
                        userId: user.id,
                        title: "Мої бажання",
                        slug: username,
                    },
                });
            }
        },
    },
})