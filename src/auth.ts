import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: PrismaAdapter(prisma),
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