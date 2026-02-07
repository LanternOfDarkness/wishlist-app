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
                const slug = user.name
                    ? `${user.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString().slice(-4)}`
                    : `user-${user.id}`;

                await prisma.wishlist.create({
                    data: {
                        userId: user.id,
                        title: "Мої бажання",
                        slug: slug,
                    },
                });
                console.log(`Вішліст для ${user.email} створено автоматично!`);
            }
        },
    },
})