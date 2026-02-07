import { SignInButton } from "@/components/sign-in-button";

export default async function Home({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Middleware обробляє редірект залогінених користувачів
  return <HomePageContent />;
}

async function HomePageContent() {
  return <LandingView />;
}

import { getTranslations } from 'next-intl/server';

async function LandingView() {
  const t = await getTranslations('HomePage');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">{t('title')}</h1>
      <p className="text-muted-foreground">{t('subtitle')}</p>
      <SignInButton />
    </main>
  );
}