import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Settings, User as UserIcon } from "lucide-react";
import { CopyLinkButton } from "@/components/copy-link-button";

interface WishlistPageProps {
    params: Promise<{
        username: string;
    }>;
}

export default async function WishlistPage({ params }: WishlistPageProps) {
    const session = await auth();
    const { username } = await params;

    const user = await prisma.user.findUnique({
        where: { username: username },
        include: {
            wishlist: {
                include: { items: true },
            },
        },
    });

    if (!user || !user.wishlist) {
        return notFound();
    }

    const isOwner = session?.user?.email === user.email;

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="flex justify-between items-center mb-8">
                <Link href="/" className="font-bold text-xl">
                    Wishlist App
                </Link>

                {isOwner ? (
                    <Link href="/dashboard">
                        <Button variant="outline" size="sm" className="gap-2">
                            <Settings className="w-4 h-4" /> Налаштування / Дашборд
                        </Button>
                    </Link>
                ) : (
                    <Link href="/">
                        <Button variant="ghost" size="sm">Створити свій вішліст</Button>
                    </Link>
                )}
            </div>

            <div className="flex flex-col items-center text-center mb-12 space-y-4">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-4xl mb-2 overflow-hidden border-4 border-white shadow-sm">
                    {user.image ? (
                        <img src={user.image} alt={user.name || "User"} className="w-full h-full object-cover" />
                    ) : (
                        <UserIcon className="w-10 h-10 text-slate-400" />
                    )}
                </div>

                <h1 className="text-3xl font-bold">
                    Вішліст користувача {user.name}
                </h1>

                <div className="flex items-center gap-2 justify-center">
                    <code className="bg-muted px-3 py-1 rounded text-sm text-muted-foreground">
                        wish.velab.space/{user.username}
                    </code>
                    <CopyLinkButton url={`/${user.username}`} />
                </div>
            </div>

            <div className="text-center py-20 border-2 border-dashed rounded-xl text-muted-foreground bg-slate-50/50">
                {user.wishlist.items.length === 0 ? (
                    <div>
                        <p className="mb-4">Цей список поки порожній.</p>
                        {isOwner && <Button>+ Додати перше бажання</Button>}
                    </div>
                ) : (
                    <p>Тут будуть картки товарів</p>
                )}
            </div>
        </div>
    );
}
