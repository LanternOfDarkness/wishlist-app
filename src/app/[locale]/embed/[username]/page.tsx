import { prisma } from "@/lib/prisma";
import { isSafeUrl } from "@/lib/utils";
import { notFound } from "next/navigation";
import { Gift } from "lucide-react";
import Image from "next/image";

interface EmbedPageProps {
  params: Promise<{
    locale: string;
    username: string;
  }>;
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

  const appearance = (user.wishlist.appearance as Record<string, string>) || {};

  let displayItems = user.wishlist.items.filter((i) => i.showInWidget);
  if (displayItems.length === 0) {
    displayItems = user.wishlist.items.slice(0, 5);
  } else {
    displayItems = displayItems.slice(0, 5);
  }

  const primaryColor = appearance.primaryColor || "#000000";

  const themeStyle = {
    "--primary": primaryColor,
  } as React.CSSProperties;

  return (
    <div
      style={themeStyle}
      className={`flex flex-col h-screen w-full bg-background overflow-hidden border shadow-sm ${appearance.font || "font-sans"}`}
    >
      <div className="flex-1 overflow-x-auto p-4 flex gap-4 snap-x">
        {displayItems.map((item) => (
          <a
            key={item.id}
            href={item.url || `/${user.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex flex-col gap-2 p-3 bg-card border hover:shadow-sm transition-shadow shrink-0 w-36 snap-start ${appearance.itemBorder || "rounded-lg"}`}
          >
            <div
              className={`w-full aspect-square bg-muted shrink-0 overflow-hidden ${appearance.itemBorder || "rounded-lg"}`}
            >
              {item.imageUrl && isSafeUrl(item.imageUrl) ? (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  width={144}
                  height={144}
                  unoptimized
                  className="h-full w-full object-cover"
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
