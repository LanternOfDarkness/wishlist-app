import { SignInButton } from "@/components/sign-in-button";
import { Palette, Handshake, Package } from "lucide-react";
import { getTranslations } from 'next-intl/server';
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'HomePage' });

  return {
    title: t('metaTitle') || "Wishlist - Create, Share, and Discover",
    description: t('metaDescription') || "Create your ultimate wishlist, organize items, and share with friends.",
    openGraph: {
      title: t('metaTitle') || "Wishlist - Create, Share, and Discover",
      description: t('metaDescription') || "Create your ultimate wishlist, organize items, and share with friends.",
      url: `https://wishlist.com/${locale}`,
      siteName: "Wishlist",
      type: "website",
    },
  };
}

export default async function Home({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <HomePageContent locale={locale} />;
}

async function HomePageContent({ locale }: { locale: string }) {
  return <LandingView locale={locale} />;
}

async function LandingView({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'HomePage' });

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 bg-gradient-to-b from-background to-muted/20">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl mb-6">
          {t('heroTitle') || "Your Ultimate Wishlist"}
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mb-8">
          {t('heroSubtitle') || "Create personalized wishlists, customize your page, and share your dreams with friends."}
        </p>
        <div className="flex gap-4">
          <SignInButton />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            {t('featuresTitle') || "Everything you need to manage your wishes"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg border shadow-sm">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                <Palette size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('feature1Title') || "Fully Customizable"}</h3>
              <p className="text-muted-foreground">
                {t('feature1Desc') || "Change your profile picture, background, banner, colors, and fonts to match your personal style."}
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg border shadow-sm">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                <Handshake size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('feature2Title') || "Connect with Friends"}</h3>
              <p className="text-muted-foreground">
                {t('feature2Desc') || "Follow friends, see what they want, and even discover private wishes from people you follow back."}
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg border shadow-sm">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                <Package size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('feature3Title') || "Organize & Filter"}</h3>
              <p className="text-muted-foreground">
                {t('feature3Desc') || "Categorize items, set priorities from 1 to 5, and filter by price to find the perfect gift."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Widget/Embed Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">
            {t('embedTitle') || "Embed anywhere"}
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            {t('embedDesc') || "Want to show off your wishlist on your own website or blog? Use our customizable widget to embed your top wishes directly."}
          </p>
        </div>
      </section>

      {/* Footer/CTA */}
      <footer className="py-12 border-t mt-auto text-center">
        <p className="text-muted-foreground mb-4">
          {t('ctaText') || "Ready to start building your wishlist?"}
        </p>
        <SignInButton />
      </footer>
    </div>
  );
}
