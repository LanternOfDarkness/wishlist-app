import type { Metadata } from "next";
import "../globals.css";
import { Toaster } from "@/components/ui/sonner";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Wishlist App",
  description: "Create and share your wishlist",
};

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="font-sans" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <SiteHeader />
          {children}
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
