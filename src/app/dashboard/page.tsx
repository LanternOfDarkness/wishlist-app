import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/");

    let wishlist = await prisma.wishlist.findFirst({
        where: { userId: session.user.id },
    });

    if (!wishlist) {
        const slug = `user-${session.user.id.slice(0, 8)}`;
        wishlist = await prisma.wishlist.create({
            data: {
                userId: session.user.id,
                title: "Мої бажання",
                slug,
            },
        });
    }

    return (
        <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-12">
                <h1 className="text-3xl font-bold">Особистий кабінет</h1>
                <div className="flex gap-2">
                    <Link href="/dashboard/settings">
                        <Button variant="outline">Налаштування профілю</Button>
                    </Link>
                    <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
                        <Button variant="ghost">Вийти</Button>
                    </form>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="border p-8 rounded-xl shadow-sm bg-card flex flex-col items-start gap-4">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">Мій Вішліст</h2>
                        <p className="text-muted-foreground">
                            Додавай бажання, ділися посиланням з друзями.
                        </p>
                    </div>
                    <Link href={`/dashboard/wishlist/${wishlist.slug}`}>
                        <Button size="lg" className="w-full">Перейти до списку</Button>
                    </Link>
                </div>

                <div className="border p-8 rounded-xl shadow-sm bg-muted/20 flex flex-col justify-center items-center text-center text-muted-foreground">
                    <p>Тут буде статистика твоїх бажань</p>
                </div>
            </div>
        </div>
    );
}