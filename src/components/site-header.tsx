import { auth } from "@/auth";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/user-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getTranslations } from "next-intl/server";

export async function SiteHeader() {
    const session = await auth();
    const t = await getTranslations("Navigation");

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
                {/* Logo / Site Name */}
                <Link href="/" className="flex items-center space-x-2">
                    <span className="font-bold text-xl">Wishlist App</span>
                </Link>

                {/* Right Side Navigation */}
                <div className="flex items-center gap-4">
                    <LanguageSwitcher />

                    {session?.user ? (
                        <UserNav user={session.user} />
                    ) : (
                        <Link href="/api/auth/signin">
                            <Button variant="default" size="sm">
                                {t("login")}
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
