import { auth } from "@/auth";
import { Link } from "@/i18n/routing";
import { UserNav } from "@/components/user-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SignInButton } from "@/components/sign-in-button";
import { prisma } from "@/lib/prisma";

export async function SiteHeader() {
    const session = await auth();

    // Get user's username if logged in
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
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
                {/* Logo / Site Name */}
                <Link href={logoHref} className="flex items-center space-x-2">
                    <span className="font-bold text-xl">Wishlist App</span>
                </Link>

                {/* Right Side Navigation */}
                <div className="flex items-center gap-4">
                    <LanguageSwitcher />

                    {session?.user ? (
                        <UserNav user={session.user} />
                    ) : (
                        <SignInButton />
                    )}
                </div>
            </div>
        </header>
    );
}
