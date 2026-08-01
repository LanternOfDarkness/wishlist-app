import { getTranslations } from "next-intl/server";
import { WishlistMark } from "@/components/brand/wishlist-mark";

export async function SiteFooter() {
    const t = await getTranslations("Footer");
    const year = new Date().getFullYear();

    return (
        // Same rule as SiteHeader: sitewide app chrome always paints with the
        // brand `--sk-*` tokens, never a signed-in user's resolved wishlist
        // appearance tokens. See docs/plan-sketch-redesign.md, Phase 1.
        <footer
            className="w-full"
            style={{
                backgroundColor: "var(--sk-bg)",
                borderTop: "1.6px solid var(--sk-line)",
                color: "var(--sk-text)",
            }}
        >
            <div className="container mx-auto flex flex-col items-center gap-3 px-4 py-10 text-center">
                <div className="flex items-center gap-2 font-display text-lg">
                    <WishlistMark className="h-6 w-6 shrink-0" />
                    <span className="hidden sm:inline-block">Wishlist App</span>
                </div>
                <p className="font-hand text-sm" style={{ color: "var(--sk-text-muted)" }}>
                    {t("tagline")}
                </p>
                <p className="font-hand text-xs" style={{ color: "var(--sk-text-muted)" }}>
                    {t("copyright", { year })}
                </p>
            </div>
        </footer>
    );
}
