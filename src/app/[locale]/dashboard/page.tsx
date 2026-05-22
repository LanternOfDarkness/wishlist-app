import { auth } from "@/auth";
import { redirect } from "@/i18n/routing";
import { getRepository } from "@/lib/repository";
import type { UserProfile } from "@/lib/repository";
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
        return;
    }

    const user = await getRepository().load({ type: "user-by-email", email: session.user.email }) as UserProfile | null;
    if (!user) { redirect({ href: "/", locale }); return; }

    const existingWishlist = await getRepository().load({ type: "dashboard-user", userId: user.id });
    let wishlist = existingWishlist?.wishlist ?? null;

    if (!wishlist) {
        const slug = user.username || `user-${user.id.slice(0, 8)}`;
        wishlist = await getRepository().execute({
            type: "create-wishlist",
            userId: user.id,
            title: t('my_wishlist'),
            slug,
        });
    }

    if (user.username) {
        redirect({ href: `/${user.username}`, locale });
    } else {
        redirect({ href: "/", locale });
    }

    return null;
}
