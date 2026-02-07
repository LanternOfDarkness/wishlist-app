import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface WishlistPageProps {
    params: {
        slug: string;
    };
}

export default async function WishlistPage({ params }: WishlistPageProps) {
    const session = await auth();

    const { slug } = params;

    const wishlist = await prisma.wishlist.findFirst({
        where: { slug },
        include: {
            items: true,
            user: true,
        },
    });

    if (!wishlist) {
        return notFound();
    }

    const isOwner = session?.user?.id === wishlist.userId;

    return (
        <div className="container mx-auto py-10">
            <div className="mb-6">
                <Link href="/dashboard">
                    <Button variant="ghost" className="pl-0 gap-2">
                        <ArrowLeft className="w-4 h-4" /> Назад
                    </Button>
                </Link>
            </div>

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-bold">{wishlist.title}</h1>
                    <p className="text-muted-foreground mt-2">
                        Власник: {wishlist.user.name}
                    </p>
                    <p className="text-sm text-blue-500 mt-1 cursor-pointer">
                        velab.space/wishlist/{wishlist.slug}
                    </p>
                </div>

                {isOwner && (
                    <Button>+ Додати бажання</Button>
                )}
            </div>

            <div className="text-center py-20 border-2 border-dashed rounded-xl text-muted-foreground">
                {wishlist.items.length === 0 ? (
                    <p>Цей список поки порожній. Час помріяти!</p>
                ) : (
                    <p>Тут будуть картки товарів</p>
                )}
            </div>
        </div>
    );
}