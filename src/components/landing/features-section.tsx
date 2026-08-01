import { getTranslations } from "next-intl/server";
import { Palette, Handshake, Package } from "@/components/brand/icons";
import type { ComponentType } from "react";

const FEATURES: { icon: ComponentType<{ className?: string }>; titleKey: string; descKey: string }[] = [
  { icon: Palette, titleKey: "feature1Title", descKey: "feature1Desc" },
  { icon: Handshake, titleKey: "feature2Title", descKey: "feature2Desc" },
  { icon: Package, titleKey: "feature3Title", descKey: "feature3Desc" },
];

export async function FeaturesSection() {
  const t = await getTranslations("HomePage");

  return (
    <section className="px-4 py-20">
      <div className="container mx-auto max-w-5xl">
        <h2 className="text-center font-display text-2xl text-(--sk-text) sm:text-3xl">
          {t("featuresTitle")}
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, titleKey, descKey }) => (
            <div
              key={titleKey}
              className="sketch sketch-interactive flex flex-col items-center gap-3 bg-(--sk-surface) p-6 text-center"
            >
              <Icon className="wobble-icon h-8 w-8 text-(--sk-accent)" />
              <h3 className="font-display text-lg text-(--sk-text)">
                {t(titleKey)}
              </h3>
              <p className="font-hand text-sm text-(--sk-text-muted)">
                {t(descKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
