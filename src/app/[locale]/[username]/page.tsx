import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { User as UserIcon, ExternalLink, Gift, Lock, Star } from "lucide-react";
import { CopyLinkButton } from "@/components/copy-link-button";
import { AddItemModal } from "@/components/add-item-modal";
import { WishlistFilters } from "@/components/wishlist-filters";
import { FollowButton } from "@/components/follow-button";
import { getTranslations } from "next-intl/server";
import { isSafeUrl } from "@/lib/utils";

interface WishlistPageProps {
    params: Promise<{
        locale: string;
        username: string;
    }>;
    searchParams: Promise<{
        category?: string;
        sort?: string;
        minPrice?: string;
        maxPrice?: string;
    }>;
}

export default async function WishlistPage({ params, searchParams }: WishlistPageProps) {
    const session = await auth();
    const { locale, username } = await params;
    const resolvedSearchParams = await searchParams;
    const t = await getTranslations('Wishlist');

    const user = await prisma.user.findUnique({
        where: { username: username },
        include: {
            categories: true,
            followers: { select: { followerId: true } },
            following: { select: { followingId: true } },
        },
    });

    if (!user) {
        return notFound();
    }

    const isOwner = session?.user?.id === user.id;
    let isFollowing = false;
    let isMutualFollower = false;

    if (session?.user?.id) {
        isFollowing = user.followers.some(f => f.followerId === session.user.id);
        const userFollowsViewer = user.following.some(f => f.followingId === session.user.id);
        isMutualFollower = isFollowing && userFollowsViewer;
    }

    // Build the query
    const itemWhere: Record<string, unknown> = {};
    if (resolvedSearchParams.category) {
        itemWhere.categoryId = resolvedSearchParams.category;
    }

    if (resolvedSearchParams.minPrice || resolvedSearchParams.maxPrice) {
        itemWhere.price = {};
        if (resolvedSearchParams.minPrice) (itemWhere.price as Record<string, number>).gte = parseFloat(resolvedSearchParams.minPrice);
        if (resolvedSearchParams.maxPrice) (itemWhere.price as Record<string, number>).lte = parseFloat(resolvedSearchParams.maxPrice);
    }

    // Filter private items
    if (!isOwner && !isMutualFollower) {
        itemWhere.isPrivate = false;
    }

    let orderBy: Record<string, string>[] = [{ priority: 'desc' }, { createdAt: 'desc' }];
    if (resolvedSearchParams.sort === 'price_asc') {
        orderBy = [{ price: 'asc' }];
    } else if (resolvedSearchParams.sort === 'price_desc') {
        orderBy = [{ price: 'desc' }];
    } else if (resolvedSearchParams.sort === 'newest') {
        orderBy = [{ createdAt: 'desc' }];
    }

    const wishlist = await prisma.wishlist.findUnique({
        where: { userId: user.id },
        include: {
            items: {
                where: itemWhere,
                orderBy: orderBy,
                include: {
                    category: true
                }
            },
        },
    });

    if (!wishlist) {
        return notFound();
    }

    const appearance = (wishlist.appearance as Record<string, string>) || {};

    const bannerStyle = (appearance.bannerImage && isSafeUrl(appearance.bannerImage)) ? { backgroundImage: `url(${appearance.bannerImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundColor: appearance.primaryColor || '#f1f5f9' };
    const bgStyle = (appearance.bgImage && isSafeUrl(appearance.bgImage)) ? { backgroundImage: `url(${appearance.bgImage})`, backgroundSize: 'cover', backgroundAttachment: 'fixed', minHeight: '100vh' } : { minHeight: '100vh' };

    // Apply primary color as CSS variable for children to use
    const themeStyle = {
      '--primary': appearance.primaryColor || '#000000',
    } as React.CSSProperties;

    return (
        <div style={{...bgStyle, ...themeStyle}} className={`flex flex-col ${appearance.font || 'font-sans'}`}>
            {/* Banner Area */}
            <div className="h-48 md:h-64 w-full relative border-b" style={bannerStyle}>
                <div className="absolute inset-0 bg-black/10"></div>
            </div>

            <div className="container mx-auto py-10 px-4 -mt-20 relative z-10 bg-background/80 backdrop-blur-sm rounded-xl min-h-[calc(100vh-16rem)] shadow-lg">

                <div className="flex flex-col items-center text-center mb-8 space-y-4">
                    <div className="w-32 h-32 bg-background rounded-full flex items-center justify-center text-5xl mb-2 overflow-hidden border-4 border-background shadow-md">
                        {(user.image && isSafeUrl(user.image)) ? (
                            <img src={user.image} alt={user.name || "User"} className="w-full h-full object-cover" />
                        ) : (
                            <UserIcon className="w-12 h-12 text-slate-400" />
                        )}
                    </div>

                    <div className="flex flex-col items-center gap-2">
                        <h1 className="text-4xl font-bold">
                            {t('wishlist_title', { name: user.name || user.username || 'User' })}
                        </h1>
                        {!isOwner && session?.user && (
                            <FollowButton userId={user.id} isFollowing={isFollowing} />
                        )}
                        <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                            <span>{user.followers.length} Followers</span>
                            <span>{user.following.length} Following</span>
                        </div>
                    </div>

                    {appearance.welcomeMessage && (
                        <p className="text-lg text-muted-foreground italic">
                            &quot;{appearance.welcomeMessage}&quot;
                        </p>
                    )}

                    <div className="flex items-center gap-2 justify-center">
                        <code className="bg-muted px-3 py-1 rounded text-sm text-muted-foreground">
                            /{user.username}
                        </code>
                        <CopyLinkButton url={`/${user.username}`} />
                    </div>

                    {isOwner && (
                        <div className="pt-4">
                            <AddItemModal wishlistId={wishlist.id} userId={user.id} categories={user.categories} />
                        </div>
                    )}
                </div>

                {wishlist.items.length > 0 || Object.keys(itemWhere).length > (isOwner ? 0 : 1) ? (
                    <WishlistFilters categories={user.categories} username={user.username!} />
                ) : null}

                {wishlist.items.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed rounded-xl text-muted-foreground bg-card/50">
                        <div>
                            <p className="mb-4">{t('no_items') || "No items found."}</p>
                            {isOwner && Object.keys(itemWhere).length === 0 && <AddItemModal wishlistId={wishlist.id} userId={user.id} categories={user.categories} />}
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-10">
                        {wishlist.items.map((item) => (
                            <div
                                key={item.id}
                                className={`group relative overflow-hidden border bg-card transition-shadow hover:shadow-lg flex flex-col ${appearance.itemBorder || 'rounded-lg'}`}
                                style={{ borderColor: appearance.primaryColor ? `${appearance.primaryColor}30` : undefined }}
                            >
                                {/* Image */}
                                <div className="aspect-square overflow-hidden bg-muted">
                                    {(item.imageUrl && isSafeUrl(item.imageUrl)) ? (
                                        <img
                                            src={item.imageUrl}
                                            alt={item.name}
                                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-muted-foreground">
                                            <Gift className="w-12 h-12" />
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 flex flex-col flex-grow">
                                    <div className="flex justify-between items-start gap-2 mb-2">
                                        <h3 className="line-clamp-2 font-semibold flex items-center gap-2">
                                            {item.name}
                                            {item.isPrivate && <span title="Private Item" className="text-xs bg-red-100 text-red-800 px-1 rounded flex items-center"><Lock className="w-3 h-3 mr-1" /> Private</span>}
                                        </h3>
                                        <div
                                            className="px-2 py-1 rounded text-xs font-bold text-white shrink-0"
                                            style={{ backgroundColor: appearance.primaryColor || '#000' }}
                                        >
                                            <span className="flex items-center gap-1">{item.priority} <Star className="w-3 h-3 fill-current" /></span>
                                        </div>
                                    </div>

                                    {item.category && (
                                        <span className="text-xs text-muted-foreground bg-muted inline-block px-2 py-1 rounded w-max mb-2">
                                            {item.category.name}
                                        </span>
                                    )}

                                    {item.price && (
                                        <p className="mt-2 text-lg font-bold" style={{ color: appearance.primaryColor || 'var(--primary)' }}>
                                            {item.price.toFixed(2)} {item.currency}
                                        </p>
                                    )}

                                    {item.isReserved && (
                                        <div className="mt-2 inline-block rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                            {t('reserved')}
                                        </div>
                                    )}

                                    <div className="mt-auto pt-4">
                                        {(item.url && isSafeUrl(item.url)) && (
                                            <Button
                                                asChild
                                                variant="outline"
                                                size="sm"
                                                className="w-full"
                                                style={{ borderColor: appearance.primaryColor || undefined, color: appearance.primaryColor || undefined }}
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
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
