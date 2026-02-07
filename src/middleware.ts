import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const { auth } = NextAuth(authConfig);
const intlMiddleware = createMiddleware(routing);

export default auth((req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth?.user?.email;

    const pathnameLocale = nextUrl.pathname.split('/')[1];
    const locale = routing.locales.includes(pathnameLocale as any) ? pathnameLocale : routing.defaultLocale;

    const isProtectedRoute = nextUrl.pathname.includes("/dashboard");
    const isHomePage = nextUrl.pathname === '/' ||
        nextUrl.pathname === '/en' ||
        nextUrl.pathname === '/uk';

    if (isProtectedRoute && !isLoggedIn) {
        return Response.redirect(new URL(`/${locale}`, nextUrl));
    }

    if (isLoggedIn && isHomePage) {
        return Response.redirect(new URL(`/${locale}/dashboard`, nextUrl));
    }

    return intlMiddleware(req);
});

export const config = {
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};