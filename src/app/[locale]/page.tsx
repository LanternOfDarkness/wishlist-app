import { getTranslations } from 'next-intl/server';
import { Metadata } from "next";

import { HeroSection } from "@/components/landing/hero-section";
import { SurpriseStrip } from "@/components/landing/surprise-strip";
import { FeaturesSection } from "@/components/landing/features-section";
import { PresetsShowcase } from "@/components/landing/presets-showcase";
import { EmbedSection } from "@/components/landing/embed-section";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'HomePage' });

  const title = t('metaTitle');
  const description = t('metaDescription');

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://wishlist.com/${locale}`,
      siteName: "Wishlist",
      type: "website",
    },
  };
}

// Seven sections per docs/design-landing-sketch-concept.md §5 and
// docs/plan-sketch-redesign.md Phase 2. Header and footer are already global
// (SiteHeader/SiteFooter, rendered by layout.tsx) — this page owns sections
// 2-6. `.paper-rules` is the ruled-paper texture wrapper: this landing page
// is the one place in the app where that brand texture is intentional (see
// plan §0's structure-vs-color axis table) — a user's own wishlist page
// keeps its own resolved appearance instead.
export default async function Home() {
  return (
    <div className="paper-rules flex min-h-[calc(100vh-4rem)] flex-col bg-(--sk-bg) text-(--sk-text)">
      <HeroSection />
      <SurpriseStrip />
      <FeaturesSection />
      <PresetsShowcase />
      <EmbedSection />
    </div>
  );
}
