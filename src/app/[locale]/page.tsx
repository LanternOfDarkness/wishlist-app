import { SignInButton } from "@/components/sign-in-button";
import { getTranslations } from 'next-intl/server';
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function Home({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <HomePageContent />;
}

async function HomePageContent() {
  return <LandingView />;
}

async function LandingView() {
  const t = await getTranslations('HomePage');

  return (
    <div className="relative min-h-screen">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-4xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
        <SignInButton />
      </main>
    </div>
  );
}