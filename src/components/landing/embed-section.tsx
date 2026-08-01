import { getTranslations } from "next-intl/server";

/**
 * Sketched browser-chrome mockup (a `.sketch` box with three CSS traffic-
 * light dots, not real OS chrome) around a miniature illustrative widget —
 * replaces the old text-only description with an actual visual, per concept
 * §5.6 / plan Phase 2.
 */
export async function EmbedSection() {
  const t = await getTranslations("HomePage");

  return (
    <section className="px-4 py-20">
      <div className="container mx-auto grid max-w-5xl gap-10 md:grid-cols-2 md:items-center">
        <div className="text-center md:text-left">
          <h2 className="font-display text-2xl text-(--sk-text) sm:text-3xl">
            {t("embedTitle")}
          </h2>
          <p className="mt-4 font-hand text-base text-(--sk-text-muted) sm:text-lg">
            {t("embedDesc")}
          </p>
        </div>

        <div className="sketch mx-auto w-full max-w-sm bg-(--sk-surface) p-3 sm:p-4">
          <div
            aria-hidden="true"
            className="mb-3 flex items-center gap-1.5 border-b-[1.6px] border-(--sk-line) pb-2"
          >
            <span className="h-2.5 w-2.5 rounded-full border-[1.6px] border-(--sk-line)" />
            <span className="h-2.5 w-2.5 rounded-full border-[1.6px] border-(--sk-line)" />
            <span className="h-2.5 w-2.5 rounded-full border-[1.6px] border-(--sk-line)" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((tile) => (
              <div
                key={tile}
                className="relative aspect-square overflow-hidden rounded-md border-[1.6px] border-(--sk-line)"
              >
                <div aria-hidden="true" className="sketch-hatch absolute inset-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
