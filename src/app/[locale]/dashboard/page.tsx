import { auth } from "@/auth";
import { redirect } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

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

    return (
        <div className="container mx-auto py-10">
            <div className="mb-12">
                <h1 className="text-3xl font-bold">{t('title')}</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="border p-8 rounded-xl shadow-sm bg-card flex flex-col items-start gap-4">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">{t('my_wishlist')}</h2>
                        <p className="text-muted-foreground">
                            {t('wishlist_desc')}
                        </p>
                    </div>
                    <Link href={user!.username ? `/${user!.username}` : "#"}>
                        <Button size="lg" className="w-full">{t('go_to_list')}</Button>
                    </Link>
                </div>

                <div className="border p-8 rounded-xl shadow-sm bg-muted/20 flex flex-col justify-center items-center text-center text-muted-foreground">
                    <p>{t('stats_placeholder')}</p>
                </div>
            </div>
        </div>
    );
}