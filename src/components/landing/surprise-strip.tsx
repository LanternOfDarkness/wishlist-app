import { getTranslations } from "next-intl/server";

/**
 * Full-width callout built around a real product fact, not invented copy —
 * reservation state is only ever rendered to non-owner viewers (see the
 * `relationship.isOwner` gating in `src/app/[locale]/[username]/page.tsx`
 * and `src/lib/reservation.ts`). If that gating ever changes, this copy
 * must change with it.
 */
export async function SurpriseStrip() {
  const t = await getTranslations("HomePage");

  return (
    <section
      className="w-full border-y-[1.6px] border-(--sk-line) bg-(--sk-surface) px-4 py-14"
    >
      <div className="container mx-auto max-w-3xl text-center">
        <h2 className="font-display text-2xl text-(--sk-text) sm:text-3xl">
          {t("surpriseTitle")}
        </h2>
        <p className="mt-4 font-hand text-base text-(--sk-text-muted) sm:text-lg">
          {t("surpriseDesc")}
        </p>
      </div>
    </section>
  );
}
