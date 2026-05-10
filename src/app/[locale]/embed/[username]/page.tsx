import { prisma } from "@/lib/prisma";
import { isSafeUrl } from "@/lib/utils";
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

type WidgetAppearance = Record<string, string | string[] | undefined>;

function getAppearanceString(
  appearance: WidgetAppearance,
  key: string,
  fallback = "",
) {
  const value = appearance[key];
  return typeof value === "string" ? value : fallback;
}

export default async function EmbedPage({ params }: EmbedPageProps) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username: username },
    include: {
      wishlist: {
        include: {
          items: {
            where: { isPrivate: false },
            orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
          },
          _count: {
            select: { items: { where: { isPrivate: false } } },
          },
        },
      },
    },
  });

  if (!user || !user.wishlist) {
    return notFound();
  }

  const appearance = (user.wishlist.appearance as WidgetAppearance) || {};

  let displayItems = user.wishlist.items.filter((i) => i.showInWidget);
  if (displayItems.length === 0) {
    displayItems = user.wishlist.items.slice(0, 5);
  } else {
    displayItems = displayItems.slice(0, 5);
  }

  const primaryColor = getAppearanceString(appearance, "primaryColor", "#000000");
  const bgColor = getAppearanceString(appearance, "bgColor", "#ffffff");
  const textColor = getAppearanceString(appearance, "textColor", "#111827");
  const fontClass = getAppearanceString(appearance, "font", "font-sans");
  const itemBorderClass = getAppearanceString(appearance, "itemBorder", "rounded-lg");
  const welcomeMessage = getAppearanceString(appearance, "welcomeMessage");
  const widgetLayout = getAppearanceString(appearance, "widgetLayout", "grid");
  const bannerImage = getAppearanceString(appearance, "bannerImage");

  const themeStyle = {
    "--primary": primaryColor,
    "--background": bgColor,
    "--foreground": textColor,
    "--card": bgColor,
    "--card-foreground": textColor,
    "--muted-foreground": textColor,
    "--border": `${primaryColor}30`,
    backgroundColor: bgColor,
    color: textColor,
  } as CSSProperties;

  const bannerStyle: CSSProperties =
    bannerImage && isSafeUrl(bannerImage)
      ? {
          backgroundImage: `url(${bannerImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : { backgroundColor: primaryColor };

  const itemsClassName =
    widgetLayout === "list"
      ? "flex flex-col gap-3"
      : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3";

  const itemClassName =
    widgetLayout === "list"
      ? `grid grid-cols-[4.5rem_1fr] items-center gap-3 p-3 border bg-card/90 shadow-sm ${itemBorderClass}`
      : `flex flex-col gap-2 p-3 border bg-card/90 shadow-sm ${itemBorderClass}`;

  return (
    <div
      style={themeStyle}
      className={`min-h-screen w-full overflow-auto border shadow-sm ${fontClass}`}
    >
      <style>{`header { display: none !important; }`}</style>

      <div className="relative h-28 w-full border-b" style={bannerStyle}>
        <div className="absolute inset-0 bg-black/10" />
      </div>

      <div className="px-4 pb-4">
        <div className="relative -mt-12 flex flex-col items-center text-center">
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

          {welcomeMessage && (
            <p className="mt-3 max-w-xl text-sm leading-relaxed opacity-80">
              {welcomeMessage}
            </p>
          )}
        </div>
      </div>

      <div className={`px-4 pb-5 ${itemsClassName}`}>
        {displayItems.map((item) => (
          <a
            key={item.id}
            href={item.url || `/${user.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className={itemClassName}
            style={{ borderColor: `${primaryColor}30` }}
          >
            <div
              className={`relative aspect-square w-full shrink-0 overflow-hidden bg-muted ${itemBorderClass}`}
            >
              {item.imageUrl && isSafeUrl(item.imageUrl) ? (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  sizes={widgetLayout === "list" ? "72px" : "160px"}
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
              {item.price && (
                <p
                  className="text-xs font-bold"
                  style={{ color: primaryColor }}
                >
                  {item.price.toFixed(2)} {item.currency}
                </p>
              )}
            </div>
          </a>
        ))}
      </div>
      <div className="p-2 text-center border-t bg-muted/30 text-[10px] text-muted-foreground">
        Powered by Wishlist App
      </div>
    </div>
  );
}
