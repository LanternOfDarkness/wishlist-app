import { auth } from "@/auth";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { User as UserIcon, ExternalLink, Gift, Lock, Star } from "lucide-react";
import { CopyLinkButton } from "@/components/copy-link-button";
import { AddItemModal } from "@/components/add-item-modal";
import { WishlistFilters } from "@/components/wishlist-filters";
import { FollowButton } from "@/components/follow-button";
import { getTranslations } from "next-intl/server";
import { isSafeUrl } from "@/lib/utils";
import {
  getWishlistPresentation,
  type WishlistSearchParams,
} from "@/lib/wishlist-presentation";
import Image from "next/image";

interface WishlistPageProps {
  params: Promise<{
    locale: string;
    username: string;
  }>;
  searchParams: Promise<WishlistSearchParams>;
}

export default async function WishlistPage({
  params,
  searchParams,
}: WishlistPageProps) {
  const session = await auth();
  const { username } = await params;
  const resolvedSearchParams = await searchParams;
  const t = await getTranslations("Wishlist");

  const presentation = await getWishlistPresentation({
    username,
    viewerUserId: session?.user?.id,
    searchParams: resolvedSearchParams,
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
      {/* Banner Area */}
      {resolvedAppearance.banner.visible ? (
        <div
          className="h-48 md:h-64 w-full relative border-b"
          style={resolvedAppearance.banner.style}
        >
          <div className="absolute inset-0 bg-black/10"></div>
        </div>
      ) : null}

      <div
        className={`container mx-auto relative z-10 bg-background/80 backdrop-blur-sm rounded-xl shadow-lg px-4 py-10 ${
          resolvedAppearance.layout.overlapBanner
            ? "-mt-20 min-h-[calc(100vh-16rem)]"
            : "mt-0 min-h-screen"
        }`}
      >
        <div className="flex flex-col items-center text-center mb-8 space-y-4">
          <div className="relative w-32 h-32 bg-background rounded-full flex items-center justify-center text-5xl mb-2 overflow-hidden border-4 border-background shadow-md">
            {user.image && isSafeUrl(user.image) ? (
              <Image
                src={user.image}
                alt={user.name || "User"}
                fill
                sizes="128px"
                unoptimized
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon className="w-12 h-12 text-slate-400" />
            )}
          </div>

          <div className="flex flex-col items-center gap-2">
            <h1 className="text-4xl font-bold">
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
            <div className="text-center py-20 border-2 border-dashed rounded-xl text-muted-foreground bg-card/50">
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
                    className={`group relative overflow-hidden border bg-card transition-shadow hover:shadow-lg flex flex-col ${appearance.itemBorderClass}`}
                    style={{
                      borderColor: primaryColor
                        ? `${primaryColor}30`
                        : undefined,
                    }}
                  >
                    {/* Image */}
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      {item.imageUrl && isSafeUrl(item.imageUrl) ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          unoptimized
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <Gift className="w-12 h-12" />
                        </div>
                      )}
                    </div>

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
                          className="px-2 py-1 rounded text-xs font-bold shrink-0"
                          style={{
                            backgroundColor: primaryColor,
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

                      {item.price && (
                        <p
                          className="mt-2 text-lg font-bold"
                          style={{
                            color: primaryColor || "var(--primary)",
                          }}
                        >
                          {item.price.toFixed(2)} {item.currency}
                        </p>
                      )}

                      {item.isReserved && (
                        <div className="mt-2 inline-block rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          {t("reserved")}
                        </div>
                      )}

                      <div className="mt-auto pt-4">
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
                              <ExternalLink className="mr-2 h-4 w-4" />
                              {t("view_link")}
                            </a>
                          </Button>
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
