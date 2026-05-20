import { isSafeUrl } from "@/lib/utils";
import { getEmbedWishlistPresentation } from "@/lib/wishlist-presentation";
import { notFound } from "next/navigation";
import { Gift } from "lucide-react";
import Image from "next/image";
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

  const itemClassName =
    widget.widgetLayout === "list"
      ? `grid grid-cols-[4.5rem_1fr] items-center gap-3 p-3 border bg-card/90 shadow-sm ${appearance.itemBorderClass}`
      : `flex w-[var(--widget-item-size)] max-w-[var(--widget-item-size)] flex-col gap-2 p-2 border bg-card/90 shadow-sm ${appearance.itemBorderClass}`;

  return (
    <div
      style={themeStyle}
      className={`min-h-screen w-full overflow-auto border shadow-sm ${appearance.fontClass}`}
    >
      <style>{`header { display: none !important; }`}</style>

      {resolvedAppearance.banner.visible ? (
        <div
          className="relative h-28 w-full border-b"
          style={resolvedAppearance.banner.style}
        >
          <div className="absolute inset-0 bg-black/10" />
        </div>
      ) : null}

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
          <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-background bg-background shadow-md">
            {user.image && isSafeUrl(user.image) ? (
              <Image
                src={user.image}
                alt={user.name || user.username || "User"}
                fill
                sizes="96px"
                unoptimized
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Gift className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

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
              style={{ borderColor: `${primaryColor}30` }}
            >
              <div
                className={`relative aspect-square w-full shrink-0 overflow-hidden bg-muted ${appearance.itemBorderClass}`}
              >
                {item.imageUrl && isSafeUrl(item.imageUrl) ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    sizes={
                      widget.widgetLayout === "list"
                        ? "72px"
                        : `${widget.widgetItemSize}px`
                    }
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <Gift className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <h3 className="text-sm font-semibold line-clamp-2 leading-tight mb-1">
                  {item.name}
                </h3>
                {item.price != null && (
                  <p
                    className="text-xs font-bold"
                    style={{ color: primaryColor }}
                  >
                    {item.price.toFixed(2)} {item.currency}
                  </p>
                )}
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
