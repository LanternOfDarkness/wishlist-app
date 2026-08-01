import { auth } from "@/auth";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { User as UserIcon, ExternalLink, Sparkles } from "@/components/brand/icons";
import { Lock, Star } from "lucide-react";
import type { CSSProperties } from "react";
import { CopyLinkButton } from "@/components/copy-link-button";
import { AddItemModal } from "@/components/add-item-modal";
import { ItemActionsMenu } from "@/components/item-actions-menu";
import { PledgeProgressBar } from "@/components/pledge-progress-bar";
import { ReserveItemModal } from "@/components/reserve-item-modal";
import { WishlistFilters } from "@/components/wishlist-filters";
import { FollowButton } from "@/components/follow-button";
import { WishlistBanner } from "@/components/wishlist/wishlist-banner";
import { WishlistAvatar } from "@/components/wishlist/wishlist-avatar";
import { WishlistItemImage } from "@/components/wishlist/wishlist-item-image";
import { WishlistItemPrice } from "@/components/wishlist/wishlist-item-price";
import { sketchFrameColor } from "@/components/wishlist/style-utils";
import { getTranslations } from "next-intl/server";
import { isSafeUrl } from "@/lib/utils";
import { getWishlistPresentation } from "@/lib/wishlist-presentation";
import type { WishlistSearchParams } from "@/lib/wishlist-filter-state";

interface WishlistPageProps {
  params: Promise<{
    locale: string;
    username: string;
  }>;
  searchParams: Promise<WishlistSearchParams & { k?: string }>;
}

export default async function WishlistPage({
  params,
  searchParams,
}: WishlistPageProps) {
  const session = await auth();
  const { username } = await params;
  const resolvedSearchParams = await searchParams;
  const t = await getTranslations("Wishlist");
  const tAddItem = await getTranslations("AddItem");

  const presentation = await getWishlistPresentation({
    username,
    viewerUserId: session?.user?.id,
    searchParams: resolvedSearchParams,
    shareKey: resolvedSearchParams.k,
  });

  if (!presentation) {
    return notFound();
  }

  const {
    user,
    wishlist,
    relationship,
    hasActiveFilters,
    maxPriceOverall,
    appearance,
  } = presentation;
  const resolvedAppearance = appearance.resolved;
  const primaryColor = appearance.primaryColor;

  return (
    <div
      style={{
        ...resolvedAppearance.page.style,
        ...resolvedAppearance.cssVariables,
        backgroundColor: resolvedAppearance.tokens.background,
        color: resolvedAppearance.tokens.foreground,
      }}
      className={`flex flex-col ${appearance.fontClass}`}
    >
      <WishlistBanner
        visible={resolvedAppearance.banner.visible}
        style={resolvedAppearance.banner.style}
        heightClassName="h-48 md:h-64"
      />

      <div
        className={`sketch container mx-auto relative z-10 bg-card px-4 py-10 ${
          resolvedAppearance.layout.overlapBanner
            ? "-mt-20 min-h-[calc(100vh-16rem)]"
            : "mt-0 min-h-screen"
        }`}
      >
        <div className="flex flex-col items-center text-center mb-8 space-y-4">
          <WishlistAvatar
            image={user.image}
            alt={user.name || "User"}
            sizePx={128}
            className="w-32 h-32 mb-2"
            fallback={<UserIcon className="w-12 h-12 text-slate-400" />}
          />

          <div className="flex flex-col items-center gap-2">
            <h1 className="font-display text-4xl font-bold">
              {t("wishlist_title", {
                name: user.name || user.username || "User",
              })}
            </h1>
            {!relationship.isOwner && session?.user && (
              <FollowButton
                userId={user.id}
                isFollowing={relationship.isFollowing}
              />
            )}
            <div className="flex gap-4 text-sm text-muted-foreground mt-2">
              <span>{user.followers.length} Followers</span>
              <span>{user.following.length} Following</span>
            </div>
          </div>

          {appearance.welcomeMessage && (
            <p className="text-lg text-muted-foreground italic">
              &quot;{appearance.welcomeMessage}&quot;
            </p>
          )}

          <div className="flex items-center gap-2 justify-center">
            <code className="bg-muted px-3 py-1 rounded text-sm text-muted-foreground">
              /{user.username}
            </code>
            <CopyLinkButton url={`/${user.username}`} />
          </div>

          {relationship.isOwner && (
            <div className="pt-4">
              <AddItemModal
                wishlistId={wishlist.id}
                categories={user.categories}
                favoriteCurrencies={appearance.favoriteCurrencies}
                trigger={
                  // Structure (the double-stroke border) is brand-fixed;
                  // color still comes from this viewer's own resolved
                  // appearance (bg-primary/text-primary-foreground already
                  // resolve through the --primary CSS vars set on the page
                  // root), never a hardcoded --sk-* brand hex.
                  <Button
                    size="lg"
                    className="sketch sketch-interactive"
                    style={
                      {
                        "--sk-line-override": sketchFrameColor({
                          border: resolvedAppearance.tokens.border,
                          foreground: resolvedAppearance.tokens.primaryForeground,
                        }),
                      } as CSSProperties
                    }
                  >
                    <Sparkles className="mr-2 size-5" />
                    {tAddItem("title")}
                  </Button>
                }
              />
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {wishlist.items.length > 0 || hasActiveFilters
            ? (() => {
                return (
                  <WishlistFilters
                    categories={user.categories}
                    maxPriceOverall={maxPriceOverall}
                  />
                );
              })()
            : null}

          {wishlist.items.length === 0 ? (
            <div className="sketch sketch-tight text-center py-20 text-muted-foreground bg-card">
              <div>
                <p className="mb-4">{t("no_items") || "No items found."}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 pb-10">
                {wishlist.items.map((item) => (
                  <div
                    key={item.id}
                    // Radius owner = `.sketch` (asymmetric, brand-fixed);
                    // `itemBorderClass`'s `rounded-*` is intentionally
                    // stripped here so it can't fight — it applies to the
                    // inner image frame instead.
                    className={`sketch sketch-interactive paper-lift group relative bg-card flex flex-col ${appearance.itemBorderClass.replace(/rounded-\S+/g, "").trim()}`}
                    style={
                      {
                        // Structure (the double-stroke box) is brand-fixed;
                        // color always follows this viewer's own resolved
                        // appearance, never a hardcoded `--sk-*` brand hex.
                        "--sk-line-override": sketchFrameColor(
                          resolvedAppearance.tokens,
                        ),
                      } as CSSProperties
                    }
                  >
                    {relationship.isOwner && (
                      <div className="absolute right-2 top-2 z-10">
                        <ItemActionsMenu
                          item={item}
                          wishlistId={wishlist.id}
                          categories={user.categories}
                        />
                      </div>
                    )}

                    <WishlistItemImage
                      imageUrl={item.imageUrl}
                      alt={item.name}
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className={appearance.itemBorderClass}
                      imageClassName="transition-transform group-hover:scale-105"
                      hatchColor={resolvedAppearance.tokens.mutedForeground}
                    />

                    <div className="p-4 flex flex-col flex-grow">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h3 className="line-clamp-2 font-semibold flex items-center gap-2">
                          {item.name}
                          {item.isPrivate && (
                            <span
                              title="Private Item"
                              className="text-xs bg-red-100 text-red-800 px-1 rounded flex items-center"
                            >
                              <Lock className="w-3 h-3 mr-1" /> Private
                            </span>
                          )}
                        </h3>
                        <div
                          className="-rotate-1 shrink-0 rounded-full border-[1.6px] px-2 py-1 font-display text-xs font-bold"
                          style={{
                            backgroundColor: primaryColor,
                            borderColor: resolvedAppearance.tokens.primaryForeground,
                            color: resolvedAppearance.tokens.primaryForeground,
                          }}
                        >
                          <span className="flex items-center gap-1">
                            {item.priority}{" "}
                            <Star className="w-3 h-3 fill-current" />
                          </span>
                        </div>
                      </div>

                      {item.category && (
                        <span className="text-xs text-muted-foreground bg-muted inline-block px-2 py-1 rounded w-max mb-2">
                          {item.category.name}
                        </span>
                      )}

                      <WishlistItemPrice
                        price={item.price}
                        currency={item.currency}
                        primaryColor={primaryColor}
                        className="mt-2 text-lg font-bold"
                      />

                      {/* Reservation state is only ever rendered for non-owner
                          viewers — for the owner, sanitizeReservationFields
                          already omits isReserved/pledgedTotal/progressRatio
                          entirely, so these blocks naturally can't render for
                          them regardless of this explicit check. */}
                      {!relationship.isOwner && item.isReserved && (
                        <div className="mt-2 inline-block rounded-full border-[1.6px] border-dashed border-yellow-800 bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800 dark:border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200">
                          {t("reserved")}
                        </div>
                      )}

                      {!relationship.isOwner &&
                        !item.isReserved &&
                        item.progressRatio != null && (
                          <PledgeProgressBar
                            ratio={item.progressRatio}
                            label={t("progressLabel", {
                              pledged: (item.pledgedTotal ?? 0).toFixed(2),
                              price: (item.price ?? 0).toFixed(2),
                              currency: item.currency,
                            })}
                          />
                        )}

                      <div className="mt-auto pt-4 space-y-2">
                        {item.url && isSafeUrl(item.url) && (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="w-full"
                            style={{
                              borderColor: primaryColor || undefined,
                              color: primaryColor || undefined,
                            }}
                          >
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="mr-2 size-5" />
                              {t("view_link")}
                            </a>
                          </Button>
                        )}

                        {!relationship.isOwner && !item.isReserved && (
                          <ReserveItemModal
                            itemId={item.id}
                            itemName={item.name}
                            price={item.price}
                            currency={item.currency}
                            pledgedTotal={item.pledgedTotal ?? 0}
                            shareKey={resolvedSearchParams.k}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
