import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { User as UserIcon, ExternalLink } from "lucide-react";
import { CopyLinkButton } from "@/components/copy-link-button";
import { AddItemModal } from "@/components/add-item-modal";
import { getTranslations } from "next-intl/server";

interface WishlistPageProps {
    params: Promise<{
        locale: string;
        username: string;
    }>;
}

export default async function WishlistPage({ params }: WishlistPageProps) {
    const session = await auth();
    const { locale, username } = await params;
    const t = await getTranslations('Wishlist');

    const user = await prisma.user.findUnique({
        where: { username: username },
        include: {
            wishlist: {
                include: {
                    items: {
                        orderBy: [
                            { priority: 'desc' },
                            { createdAt: 'desc' },
                        ],
                    },
                },
            },
        },
    });

    if (!user || !user.wishlist) {
        return notFound();
    }

    const isOwner = session?.user?.email === user.email;

    return (
        <div className="container mx-auto py-10 px-4">

            <div className="flex flex-col items-center text-center mb-8 space-y-4">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-4xl mb-2 overflow-hidden border-4 border-white shadow-sm">
                    {user.image ? (
                        <img src={user.image} alt={user.name || "User"} className="w-full h-full object-cover" />
                    ) : (
                        <UserIcon className="w-10 h-10 text-slate-400" />
                    )}
                </div>

                <h1 className="text-3xl font-bold">
                    {t('wishlist_title', { name: user.name || user.username || 'User' })}
                </h1>

                <div className="flex items-center gap-2 justify-center">
                    <code className="bg-muted px-3 py-1 rounded text-sm text-muted-foreground">
                        /{user.username}
                    </code>
                    <CopyLinkButton url={`/${user.username}`} />
                </div>

                {isOwner && user.wishlist.items.length > 0 && (
                    <AddItemModal wishlistId={user.wishlist.id} />
                )}
            </div>

            {user.wishlist.items.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-xl text-muted-foreground bg-slate-50/50">
                    <div>
                        <p className="mb-4">{t('no_items')}</p>
                        {isOwner && <AddItemModal wishlistId={user.wishlist.id} />}
                    </div>
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {user.wishlist.items.map((item) => (
                        <div
                            key={item.id}
                            className="group relative overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-lg"
                        >
                            {/* Image */}
                            <div className="aspect-square overflow-hidden bg-muted">
                                {item.imageUrl ? (
                                    <img
                                        src={item.imageUrl}
                                        alt={item.name}
                                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-muted-foreground">
                                        <span className="text-4xl">🎁</span>
                                    </div>
                                )}
                            </div>

                            <div className="p-4">
                                <h3 className="line-clamp-2 font-semibold">{item.name}</h3>

                                {item.price && (
                                    <p className="mt-2 text-lg font-bold text-primary">
                                        {item.price.toFixed(2)} {item.currency}
                                    </p>
                                )}

                                {(item as any).isReserved && (
                                    <div className="mt-2 inline-block rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                        {t('reserved')}
                                    </div>
                                )}

                                {item.url && (
                                    <div className="mt-4">
                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                        >
                                            <a
                                                href={item.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                {t('view_link')}
                                            </a>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
