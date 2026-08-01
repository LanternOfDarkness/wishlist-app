"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Moon, Sun } from "@/components/brand/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const t = useTranslations("Theme");
  const { theme, setTheme } = useTheme();
  // Avoid rendering theme-dependent UI before hydration (the server can't
  // know the stored preference, and next-themes recommends this pattern to
  // prevent a hydration mismatch).
  const [mounted, setMounted] = useState(false);

  // Standard next-themes hydration guard: the server can't know the stored
  // theme, so this mount flag defers theme-dependent rendering until after
  // hydration (one-time signal, not state synced from props/external data).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const options = [
    { value: "system", label: t("system") },
    { value: "light", label: t("light") },
    { value: "dark", label: t("dark") },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label={t("toggle")}>
          {mounted && theme === "dark" ? (
            <Moon className="size-5" />
          ) : (
            <Sun className="size-5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={mounted && theme === option.value ? "bg-accent" : ""}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
