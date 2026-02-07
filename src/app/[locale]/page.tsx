import { SignInButton } from "@/components/sign-in-button";
import { getTranslations } from 'next-intl/server';

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
    <main className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 overflow-hidden">
      <h1 className="text-4xl font-bold">{t('title')}</h1>
      <p className="text-muted-foreground">{t('subtitle')}</p>
      <SignInButton />
    </main>
  );
}