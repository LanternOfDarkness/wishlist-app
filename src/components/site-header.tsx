import { auth } from "@/auth";
import { Link } from "@/i18n/routing";
import { UserNav } from "@/components/user-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SignInButton } from "@/components/sign-in-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { WishlistMark } from "@/components/brand/wishlist-mark";

export async function SiteHeader() {
    const session = await auth();

    const logoHref = session?.user?.username ? `/${session.user.username}` : "/";

    return (
        // This header renders on every page, including a signed-in user's own
        // themed wishlist. It always paints with the brand `--sk-*` tokens,
        // never the wishlist's resolved per-user appearance tokens — the
        // header is app chrome that sits visually above the user's page, and
        // its own `--sk-bg` fill plus this ink border is what draws that
        // boundary. See docs/plan-sketch-redesign.md, Phase 1.
        <header
            className="sticky top-0 z-50 w-full backdrop-blur"
            style={{
                backgroundColor: "color-mix(in oklab, var(--sk-bg) 95%, transparent)",
                borderBottom: "1.6px solid var(--sk-line)",
                color: "var(--sk-text)",
            }}
        >
            <div className="container mx-auto flex h-14 items-center justify-between">
                <Link
                    href={logoHref}
                    className="flex items-center gap-2 font-display text-lg hover:opacity-80"
                >
                    <WishlistMark className="h-6 w-6 shrink-0" />
                    <span className="hidden sm:inline-block">Wishlist App</span>
                </Link>

                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <LanguageSwitcher />
                    {session?.user ? (
                        <UserNav user={session.user} />
                    ) : (
                        <SignInButton className="rounded-[9px_4px_10px_5px] border-[1.6px] border-(--sk-line)" />
                    )}
                </div>
            </div>
        </header>
    );
}
