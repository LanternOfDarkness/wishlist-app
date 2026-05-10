"use client";

import { useEffect } from "react";

function applyTheme(themeMode: string) {
  const systemPrefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;
  const shouldUseDark =
    themeMode === "dark" || (themeMode === "system" && systemPrefersDark);

  document.documentElement.classList.toggle("dark", shouldUseDark);
}

export function ThemeInitializer() {
  useEffect(() => {
    const themeMode = localStorage.getItem("themeMode") || "system";
    applyTheme(themeMode);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      if ((localStorage.getItem("themeMode") || "system") === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  return null;
}
