export const ROUTES = {
  DASHBOARD: "/dashboard",
  DASHBOARD_SETTINGS: "/dashboard/settings",
  WISHLIST_PAGE: "/[locale]/[username]" as const,
  EMBED_PAGE: "/[locale]/embed/[username]" as const,
} as const;

export const REVALIDATION_PATHS = {
  dashboard: { path: ROUTES.DASHBOARD, type: "page" as const },
  dashboardSettings: { path: ROUTES.DASHBOARD_SETTINGS, type: "page" as const },
  wishlistPage: { path: ROUTES.WISHLIST_PAGE, type: "page" as const },
  embedPage: { path: ROUTES.EMBED_PAGE, type: "page" as const },
} as const;
