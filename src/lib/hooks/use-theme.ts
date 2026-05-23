import { useCallback, useEffect } from "react";

export function applyTheme(mode: string) {
  const prefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;
  const isDark = mode === "dark" || (mode === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", isDark);
}

export function useTheme() {
  useEffect(() => {
    const saved = localStorage.getItem("themeMode") || "system";
    applyTheme(saved);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const current = localStorage.getItem("themeMode") || "system";
      if (current === "system") {
        applyTheme("system");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const setThemeMode = useCallback((mode: string) => {
    localStorage.setItem("themeMode", mode);
    applyTheme(mode);
  }, []);

  return { setThemeMode };
}
