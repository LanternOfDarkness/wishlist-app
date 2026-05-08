import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { User as UserIcon, Gift } from "lucide-react";
import { getTranslations } from "next-intl/server";

interface EmbedPageProps {
    params: Promise<{
        locale: string;
        username: string;
    }>;
}

export default async function EmbedPage({ params }: EmbedPageProps) {
    const { username } = await params;
    const t = await getTranslations('Wishlist');

    const user = await prisma.user.findUnique({
        where: { username: username },
        include: {
            wishlist: {
                include: {
                    items: {
                        where: { isPrivate: false },
                        orderBy: [
                            { priority: 'desc' },
                            { createdAt: 'desc' },
                        ],
                        take: 5,
                    },
                    _count: {
                        select: { items: { where: { isPrivate: false } } }
                    }
                },
            },
        },
    });

    if (!user || !user.wishlist) {
        return notFound();
    }

    const appearance = (user.wishlist.appearance as Record<string, string>) || {};
    const primaryColor = appearance.primaryColor || '#000000';

    const themeStyle = {
      '--primary': primaryColor,
    } as React.CSSProperties;

    return (
        <div style={themeStyle} className={`flex flex-col h-screen w-full bg-background overflow-hidden border shadow-sm ${appearance.font || 'font-sans'}`}>
            <div className="flex items-center gap-3 p-4 border-b bg-card">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center overflow-hidden border border-border">
                    {user.image ? (
                        <img src={user.image} alt={user.name || "User"} className="w-full h-full object-cover" />
                    ) : (
                        <UserIcon className="w-5 h-5 text-muted-foreground" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-bold truncate">
                        {user.name || user.username}&apos;s Wishlist
                    </h2>
                    <p className="text-xs text-muted-foreground truncate">
                        {user.wishlist._count.items} total items
                    </p>
                </div>
                <a
                    href={`/${user.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold px-3 py-1.5 rounded-full text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: primaryColor }}
                >
                    View All
                </a>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {user.wishlist.items.map((item) => (
                    <a
                        key={item.id}
                        href={item.url || `/${user.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex gap-3 p-2 bg-card border hover:shadow-sm transition-shadow ${appearance.itemBorder || 'rounded-lg'}`}
                    >
                        <div className={`w-16 h-16 bg-muted shrink-0 overflow-hidden ${appearance.itemBorder || 'rounded-lg'}`}>
                            {item.imageUrl ? (
                                <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                    <Gift className="w-6 h-6" />
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col justify-center min-w-0">
                            <h3 className="text-sm font-semibold line-clamp-2 leading-tight mb-1">{item.name}</h3>
                            {item.price && (
                                <p className="text-xs font-bold" style={{ color: primaryColor }}>
                                    {item.price.toFixed(2)} {item.currency}
                                </p>
                            )}
                        </div>
                    </a>
                ))}
            </div>
            <div className="p-2 text-center border-t bg-muted/30 text-[10px] text-muted-foreground">
                Powered by Wishlist App
            </div>
        </div>
    );
}
