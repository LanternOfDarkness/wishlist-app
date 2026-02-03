import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function SettingsPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/");
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
    });

    if (!user) {
        redirect("/");
    }

    return (
        <div className="container mx-auto py-10 max-w-2xl">
            <div className="mb-6">
                <Link href="/dashboard">
                    <Button variant="ghost" className="pl-0 hover:pl-2 transition-all gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Назад до кабінету
                    </Button>
                </Link>
            </div>

            <h1 className="text-3xl font-bold mb-8">Налаштування профілю</h1>
            <SettingsForm user={user} />
        </div>
    );
}