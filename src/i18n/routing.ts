import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
    locales: ['en', 'uk'],
    defaultLocale: 'en'
});

export type Locale = (typeof routing.locales)[number];

export function isLocale(locale: unknown): locale is Locale {
    return typeof locale === 'string' && (routing.locales as readonly string[]).includes(locale);
}

export const { Link, redirect, usePathname, useRouter } =
    createNavigation(routing);
