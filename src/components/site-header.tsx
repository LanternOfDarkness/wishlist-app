import { auth } from "@/auth";
import { Link } from "@/i18n/routing";
import { UserNav } from "@/components/user-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SignInButton } from "@/components/sign-in-button";
import { prisma } from "@/lib/prisma";

export async function SiteHeader() {
    const session = await auth();

    let logoHref = "/";
    if (session?.user?.email) {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { username: true, id: true }
        });
        if (user?.username) {
            logoHref = `/${user.username}`;
        }
    }

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
            <div className="container mx-auto flex h-14 items-center justify-between">
                <Link href={logoHref} className="font-bold hover:text-foreground/80">
                    <span className="hidden sm:inline-block">Wishlist App</span>
                </Link>

                <div className="flex items-center gap-4">
                    <LanguageSwitcher />
                    {session?.user ? <UserNav user={session.user} /> : <SignInButton />}
                </div>
            </div>
        </header>
    );
}
