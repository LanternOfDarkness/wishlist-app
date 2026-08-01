import { isSafeUrl } from "@/lib/utils";
import { getEmbedWishlistPresentation } from "@/lib/wishlist-presentation";
import { notFound } from "next/navigation";
import { Gift } from "@/components/brand/icons";
import { WishlistBanner } from "@/components/wishlist/wishlist-banner";
import { WishlistAvatar } from "@/components/wishlist/wishlist-avatar";
import { WishlistItemImage } from "@/components/wishlist/wishlist-item-image";
import { WishlistItemPrice } from "@/components/wishlist/wishlist-item-price";
import { sketchFrameColor } from "@/components/wishlist/style-utils";
import type { CSSProperties } from "react";

interface EmbedPageProps {
  params: Promise<{
    locale: string;
    username: string;
  }>;
}

export default async function EmbedPage({ params }: EmbedPageProps) {
  const { locale, username } = await params;
  const presentation = await getEmbedWishlistPresentation({
    locale,
    username,
  });

  if (!presentation) {
    return notFound();
  }

  const { user, displayItems, profileUrl, appearance, widget } = presentation;
  const resolvedAppearance = appearance.resolved;
  const primaryColor = appearance.primaryColor;

  const themeStyle = {
    ...resolvedAppearance.cssVariables,
    "--widget-item-size": `${widget.widgetItemSize}px`,
    ...resolvedAppearance.page.style,
    backgroundColor: resolvedAppearance.tokens.background,
    color: resolvedAppearance.tokens.foreground,
  } as CSSProperties;

  const itemsClassName =
    widget.widgetLayout === "list"
      ? "flex flex-col gap-3"
      : "grid justify-center gap-3";

  // `.sketch-tight` (inset -3px) instead of the default `.sketch` (-5px):
  // tiles run as small as 70px, and the wider default offset would clip
  // against neighboring tiles at that size. Combine with `.sketch` — that's
  // the class that actually generates the `::after` echo-stroke;
  // `.sketch-tight` alone only adjusts its inset.
  //
  // No `.paper-lift` here: its `::before` echo also extends beyond the tile
  // and these tiles are tightly packed (gap-3, down to 70px), so it would
  // clip against neighbors — the double-stroke ink border already gives
  // depth via overlap/rotation.
  //
  // Radius owner = `.sketch` (asymmetric, brand-fixed); `itemBorderClass`'s
  // `rounded-*` is intentionally stripped from the outer tile so it can't
  // fight — it applies to the inner image frame instead (see the
  // `WishlistItemImage` className below).
  const itemClassName =
    widget.widgetLayout === "list"
      ? `sketch sketch-tight sketch-interactive grid grid-cols-[4.5rem_1fr] items-center gap-3 p-3 bg-card ${appearance.itemBorderClass.replace(/rounded-\S+/g, "").trim()}`
      : `sketch sketch-tight sketch-interactive flex w-[var(--widget-item-size)] max-w-[var(--widget-item-size)] flex-col gap-2 p-2 bg-card ${appearance.itemBorderClass.replace(/rounded-\S+/g, "").trim()}`;

  return (
    <div
      style={themeStyle}
      // Single ink `border` (resolves per-user via `--border`) instead of a
      // `.sketch` double-stroke: the echo's `::after` inset (-3px/-5px)
      // would clip at the iframe viewport edge, and the embed must stay
      // unchanged in size/layout — a plain border is the safe ink edge.
      className={`min-h-screen w-full overflow-auto border ${appearance.fontClass}`}
    >
      <style>{`header, footer { display: none !important; }`}</style>

      <WishlistBanner
        visible={resolvedAppearance.banner.visible}
        style={resolvedAppearance.banner.style}
        heightClassName="h-28"
      />

      <div
        className={`px-4 pb-4 ${
          resolvedAppearance.layout.overlapBanner ? "" : "pt-4"
        }`}
      >
        <div
          className={`relative flex flex-col items-center text-center ${
            resolvedAppearance.layout.overlapBanner ? "-mt-12" : ""
          }`}
        >
          <WishlistAvatar
            image={user.image}
            alt={user.name || user.username || "User"}
            sizePx={96}
            className="h-24 w-24"
            fallback={<Gift className="h-8 w-8 text-muted-foreground" />}
          />

          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 text-sm font-medium underline-offset-4 hover:underline"
            style={{ color: primaryColor }}
          >
            /{user.username}
          </a>

          {appearance.welcomeMessage && (
            <p className="mt-3 max-w-xl text-sm leading-relaxed opacity-80">
              {appearance.welcomeMessage}
            </p>
          )}
        </div>
      </div>

      <div
        className={`px-4 pb-5 ${itemsClassName}`}
        style={
          widget.widgetLayout === "grid"
            ? {
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(var(--widget-item-size), var(--widget-item-size)))",
              }
            : undefined
        }
      >
        {displayItems.map((item) => {
          const itemHref =
            item.url && isSafeUrl(item.url) ? item.url : profileUrl;

          return (
            <a
              key={item.id}
              href={itemHref}
              target="_blank"
              rel="noopener noreferrer"
              className={itemClassName}
              style={
                {
                  // Structure is brand-fixed; color always follows this
                  // viewer's own resolved appearance, never a hardcoded
                  // `--sk-*` brand hex.
                  "--sk-line-override": sketchFrameColor(
                    resolvedAppearance.tokens,
                  ),
                } as CSSProperties
              }
            >
              <WishlistItemImage
                imageUrl={item.imageUrl}
                alt={item.name}
                sizes={
                  widget.widgetLayout === "list"
                    ? "72px"
                    : `${widget.widgetItemSize}px`
                }
                className={`w-full shrink-0 ${appearance.itemBorderClass}`}
                fallbackIconClassName="w-6 h-6"
                hatchColor={resolvedAppearance.tokens.mutedForeground}
              />
              <div className="flex flex-col justify-center min-w-0">
                <h3 className="text-sm font-semibold line-clamp-2 leading-tight mb-1">
                  {item.name}
                </h3>
                <WishlistItemPrice
                  price={item.price}
                  currency={item.currency}
                  primaryColor={primaryColor}
                  className="text-xs font-bold"
                />
              </div>
            </a>
          );
        })}
      </div>
      <div className="p-2 text-center border-t bg-muted/30 text-[10px] text-muted-foreground">
        Powered by Wishlist App
      </div>
    </div>
  );
}
