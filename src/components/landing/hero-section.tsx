import { getTranslations } from "next-intl/server";
import { Star } from "@/components/brand/icons";

import { SignInButton } from "@/components/sign-in-button";

type HeroItemKey = "heroItemName1" | "heroItemName2" | "heroItemName3";

type HeroItemData = {
  nameKey: HeroItemKey;
  price: string;
  rating: number;
  reserved?: boolean;
};

/**
 * Illustrative-only fanned stack content (design concept §5.2 / plan Phase
 * 2). Not real wishlist data — a marketing visual, so it's fine to hardcode
 * the shape here rather than pull from `@/components/wishlist/*`, which stay
 * reserved for actually rendering a user's items. Item names are still
 * translated (real copy, not a code comment) so `uk` reads naturally instead
 * of leaking English. One card is marked `reserved` to match the concept's
 * "one card showing a Reserved pill" spec.
 */
const HERO_ITEMS: HeroItemData[] = [
  { nameKey: "heroItemName1", price: "48 USD", rating: 3 },
  { nameKey: "heroItemName2", price: "24 USD", rating: 5, reserved: true },
  { nameKey: "heroItemName3", price: "90 USD", rating: 4 },
];

export async function HeroSection() {
  const t = await getTranslations("HomePage");
  const tWishlist = await getTranslations("Wishlist");
  const reservedLabel = tWishlist("reserved");

  const items = HERO_ITEMS.map((item) => ({ ...item, name: t(item.nameKey) }));
  // The reserved item is the visual focal point (front of the fanned stack,
  // and the only card shown at all below `md`) — it's the card that most
  // directly demonstrates the "Surprise" strip that follows this section.
  const frontItem = items[1];
  const backItem = items[0];
  const middleItem = items[2];

  return (
    <section className="px-4 py-16 sm:py-20">
      <div className="container mx-auto flex flex-col gap-12 md:flex-row md:items-center md:justify-between md:gap-10">
        <div className="max-w-xl text-center md:text-left">
          <h1 className="font-display text-4xl leading-tight text-(--sk-text) sm:text-5xl">
            {t("heroTitleLead")}{" "}
            <span className="relative inline-block">
              {t("heroTitleHighlight")}
              <svg
                aria-hidden="true"
                focusable="false"
                viewBox="0 0 100 14"
                preserveAspectRatio="none"
                className="wobble-icon pointer-events-none absolute -bottom-1 left-0 h-3 w-full text-(--sk-highlight)"
              >
                <path
                  d="M2 8 Q 20 2 38 7 T 74 6 T 98 9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </span>{" "}
            {t("heroTitleTrail")}
          </h1>
          <p className="mt-6 font-hand text-lg text-(--sk-text-muted) sm:text-xl">
            {t("heroSubtitle")}
          </p>
          <div className="mt-8 flex justify-center md:justify-start">
            <SignInButton className="rounded-[9px_4px_10px_5px] border-[1.6px] border-(--sk-line) font-hand text-base" />
          </div>
        </div>

        {/* Below `md`: a single un-rotated card. `md` and up: the fanned
            stack of three, per concept §5.2. */}
        <div className="mx-auto w-full max-w-xs md:hidden">
          <HeroItemCard {...frontItem} reservedLabel={reservedLabel} />
        </div>

        <div className="relative hidden h-96 w-full max-w-md md:block">
          <HeroItemCard
            {...backItem}
            reservedLabel={reservedLabel}
            className="absolute left-0 top-0 rotate-6"
          />
          <HeroItemCard
            {...middleItem}
            reservedLabel={reservedLabel}
            className="absolute left-6 top-8 -rotate-3"
          />
          <HeroItemCard
            {...frontItem}
            reservedLabel={reservedLabel}
            className="absolute left-12 top-16 rotate-2"
          />
        </div>
      </div>
    </section>
  );
}

function HeroItemCard({
  name,
  price,
  rating,
  reserved,
  reservedLabel,
  className = "",
}: HeroItemData & { name: string; reservedLabel: string; className?: string }) {
  return (
    <div className={`sketch w-56 shrink-0 bg-(--sk-surface) p-3 ${className}`}>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border-[1.6px] border-(--sk-line)">
        <div aria-hidden="true" className="sketch-hatch absolute inset-0" />
      </div>
      <p className="mt-3 truncate font-display text-base text-(--sk-text)">{name}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="inline-flex w-fit -rotate-1 items-center rounded-full border-[1.6px] border-(--sk-highlight) px-3 py-0.5 font-display text-sm leading-tight text-(--sk-highlight)">
          {price}
        </p>
        <span
          aria-hidden="true"
          className="inline-flex items-center gap-0.5 text-(--sk-highlight)"
        >
          {Array.from({ length: rating }).map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-current" />
          ))}
        </span>
      </div>
      {reserved && (
        <div className="mt-2 inline-block rounded-full border-[1.6px] border-dashed border-(--sk-accent) px-3 py-0.5 font-hand text-xs text-(--sk-accent)">
          {reservedLabel}
        </div>
      )}
    </div>
  );
}
