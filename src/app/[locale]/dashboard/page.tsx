import { auth } from "@/auth";
import { redirect } from "@/i18n/routing";
import { getRepository } from "@/lib/repository";
import { ensureUserWishlist } from "@/lib/ensure-user-wishlist";

export default async function DashboardPage({
    params
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const session = await auth();

    if (!session?.user?.id) {
        redirect({ href: "/", locale });
    }

    const user = await getRepository().load({
        type: "dashboard-user",
        userId: session!.user.id,
    });

    if (!user) redirect({ href: "/", locale });

    // Defensive fallback — the auth.ts createUser event normally creates this
    // wishlist at signup, but ensure one exists here too rather than crash.
    if (!user!.wishlist) {
        const slug = user!.username || `user-${user!.id.slice(0, 8)}`;
        await ensureUserWishlist(user!.id, slug);
    }

    // Redirect straight to user's wishlist page
    if (user?.username) {
        redirect({ href: `/${user.username}`, locale });
    } else {
        redirect({ href: "/", locale });
    }

    return null;
}
