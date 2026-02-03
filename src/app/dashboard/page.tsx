import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
    const session = await auth();

    if (!session) {
        redirect("/");
    }

    return (
        <div className="flex min-h-screen flex-col items-center p-24 gap-8">
            <div className="flex flex-col items-center gap-4 border p-8 rounded-xl shadow-sm">
                {session.user?.image && (
                    <Image
                        src={session.user.image}
                        alt="Avatar"
                        width={100}
                        height={100}
                        className="rounded-full border-4 border-slate-100"
                    />
                )}
                <h1 className="text-2xl font-bold">
                    Привіт, {session.user?.name}!
                </h1>
                <p className="text-muted-foreground">{session.user?.email}</p>

                {/* Кнопка виходу */}
                <form
                    action={async () => {
                        "use server";
                        await signOut({ redirectTo: "/" });
                    }}
                >
                    <Button variant="destructive">Вийти</Button>
                </form>
            </div>
        </div>
    );
}