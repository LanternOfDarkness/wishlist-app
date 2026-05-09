import { auth } from "@/auth";
import { redirect } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

export default async function DashboardPage({
    params
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const t = await getTranslations('Dashboard');
    const session = await auth();

    if (!session?.user?.email) {
        redirect({ href: "/", locale });
    }

    const user = await prisma.user.findUnique({
        where: { email: session!.user.email! },
        include: { wishlist: true },
    });

    if (!user) redirect({ href: "/", locale });

    let wishlist = user!.wishlist;

    if (!wishlist) {
        const slug = user!.username || `user-${user!.id.slice(0, 8)}`;
        wishlist = await prisma.wishlist.create({
            data: {
                userId: user!.id,
                title: t('my_wishlist'),
                slug,
            },
        });
    }

    // Redirect straight to user's wishlist page
    if (user?.username) {
        redirect({ href: `/${user.username}`, locale });
    } else {
        redirect({ href: "/", locale });
    }

    return null;
}
