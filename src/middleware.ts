import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const { auth } = NextAuth(authConfig);
const intlMiddleware = createMiddleware(routing);

export default auth((req) => {
    const { nextUrl } = req;
    // Перевіряємо чи користувач залогінений по наявності email (він завжди є)
    const isLoggedIn = !!req.auth?.user?.email;

    // DEBUG: Логування для дебагу
    console.log('🔍 Middleware:', {
        path: nextUrl.pathname,
        isLoggedIn,
        hasAuth: !!req.auth,
        email: req.auth?.user?.email,
        userId: req.auth?.user?.id
    });

    const pathnameLocale = nextUrl.pathname.split('/')[1];
    const locale = routing.locales.includes(pathnameLocale as any) ? pathnameLocale : routing.defaultLocale;

    const isProtectedRoute = nextUrl.pathname.includes("/dashboard");

    // Перевіряємо чи це головна сторінка
    const isHomePage = nextUrl.pathname === '/' ||
        nextUrl.pathname === '/en' ||
        nextUrl.pathname === '/uk';

    // Якщо це захищений маршрут і користувач не залогінений
    if (isProtectedRoute && !isLoggedIn) {
        console.log('❌ Redirecting to home: not logged in on protected route');
        return Response.redirect(new URL(`/${locale}`, nextUrl));
    }

    // Якщо користувач залогінений і на головній сторінці - редірект на dashboard
    if (isLoggedIn && isHomePage) {
        console.log('✅ Redirecting to dashboard: logged in on home page');
        return Response.redirect(new URL(`/${locale}/dashboard`, nextUrl));
    }

    return intlMiddleware(req);
});

export const config = {
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};