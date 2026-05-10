"use client";

import { updateProfile } from "@/actions/update-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Wishlist } from "@prisma/client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AVAILABLE_CURRENCIES } from "@/lib/currencies";

type UserWithWishlist = User & { wishlist: Wishlist | null };
const LEGACY_BORDER_DEFAULTS: Record<string, string> = {
  "rounded-none": "rounded-none border-solid",
  "rounded-md": "rounded-md border-solid",
  "rounded-lg": "rounded-lg border-solid",
  "rounded-2xl": "rounded-2xl border-solid",
};

interface SettingsFormProps {
  user: UserWithWishlist;
}

export function SettingsForm({
  user,
  tab = "general",
}: SettingsFormProps & { tab?: "general" | "appearance" }) {
  const t = useTranslations("Settings");
  const [isLoading, setIsLoading] = useState(false);

  // Typecast appearance safely

  const rawAppearance =
    (user.wishlist?.appearance as Record<string, string | string[]>) || {};
  const appearance: Record<string, string | string[]> = {
    ...rawAppearance,
    favoriteCurrencies: Array.isArray(rawAppearance.favoriteCurrencies)
      ? rawAppearance.favoriteCurrencies
      : ["UAH"],
  };
  const [themeMode, setThemeMode] = useState(
    typeof appearance.themeMode === "string" ? appearance.themeMode : "system",
  );
  const itemBorderValue =
    typeof appearance.itemBorder === "string"
      ? LEGACY_BORDER_DEFAULTS[appearance.itemBorder] || appearance.itemBorder
      : "rounded-lg border-solid";

  useEffect(() => {
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const shouldUseDark =
      themeMode === "dark" || (themeMode === "system" && systemPrefersDark);

    document.documentElement.classList.toggle("dark", shouldUseDark);
    localStorage.setItem("themeMode", themeMode);
  }, [themeMode]);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);

    const result = await updateProfile(formData);

    setIsLoading(false);

    if (result?.error) {
      toast.error("Error", {
        description: result.error,
      });
    } else {
      toast.success(t("saveSuccessTitle"), {
        description: t("saveSuccessDesc"),
      });
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6 max-w-xl w-full pb-10">
      <div
        className="space-y-4"
        style={{ display: tab === "general" ? "block" : "none" }}
      >
        <h3 className="text-lg font-medium border-b pb-2">
          {t("generalSettingsTitle")}
        </h3>

        <div className="space-y-2">
          <Label htmlFor="name">{t("nameLabel")}</Label>
          <Input
            id="name"
            name="name"
            defaultValue={user.name || ""}
            placeholder={t("namePlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">{t("usernameLabel")}</Label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">wishlist.com/</span>
            <Input
              id="username"
              name="username"
              defaultValue={user.username || ""}
              placeholder="super-nick"
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t("usernameHelp")}
          </p>
        </div>
      </div>

      <div
        className="space-y-4"
        style={{ display: tab === "appearance" ? "block" : "none" }}
      >
        <h3 className="text-lg font-medium border-b pb-2">
          {t("appearanceTitle")}
        </h3>

        <div className="space-y-2">
          <Label>{t("themeLabel")}</Label>
          <input type="hidden" name="themeMode" value={themeMode} />
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant={themeMode === "system" ? "default" : "outline"}
              onClick={() => setThemeMode("system")}
            >
              {t("themeSystem")}
            </Button>
            <Button
              type="button"
              variant={themeMode === "light" ? "default" : "outline"}
              onClick={() => setThemeMode("light")}
            >
              {t("themeLight")}
            </Button>
            <Button
              type="button"
              variant={themeMode === "dark" ? "default" : "outline"}
              onClick={() => setThemeMode("dark")}
            >
              {t("themeDark")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("themeHelp")}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="welcomeMessage">{t("welcomeMessageLabel")}</Label>
          <Input
            id="welcomeMessage"
            name="welcomeMessage"
            defaultValue={appearance?.welcomeMessage || ""}
            placeholder={t("welcomeMessagePlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bgImage">{t("backgroundImageLabel")}</Label>
          <Input
            id="bgImage"
            name="bgImage"
            defaultValue={appearance?.bgImage || ""}
            placeholder="https://example.com/bg.jpg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bannerImage">{t("bannerImageLabel")}</Label>
          <Input
            id="bannerImage"
            name="bannerImage"
            defaultValue={appearance?.bannerImage || ""}
            placeholder="https://example.com/banner.jpg"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primaryColor">{t("primaryColorLabel")}</Label>
            <div className="flex gap-2">
              <Input
                id="primaryColor"
                name="primaryColor"
                type="color"
                defaultValue={appearance?.primaryColor || "#000000"}
                className="w-12 p-1"
              />
              <Input
                type="text"
                value={appearance?.primaryColor || "#000000"}
                disabled
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="textColor">{t("textColorLabel")}</Label>
            <div className="flex gap-2">
              <Input
                id="textColor"
                name="textColor"
                type="color"
                defaultValue={appearance?.textColor || "#000000"}
                className="w-12 p-1"
              />
              <Input
                type="text"
                value={appearance?.textColor || "#000000"}
                disabled
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bgColor">{t("backgroundColorLabel")}</Label>
            <div className="flex gap-2">
              <Input
                id="bgColor"
                name="bgColor"
                type="color"
                defaultValue={appearance?.bgColor || "#ffffff"}
                className="w-12 p-1"
              />
              <Input
                type="text"
                value={appearance?.bgColor || "#ffffff"}
                disabled
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="itemBorder">{t("itemBorderLabel")}</Label>
            <select
              id="itemBorder"
              name="itemBorder"
              defaultValue={itemBorderValue}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="rounded-none border-solid">
                {t("borderSquareSolid")}
              </option>
              <option value="rounded-md border-solid">
                {t("borderSlightSolid")}
              </option>
              <option value="rounded-lg border-solid">
                {t("borderRoundedSolid")}
              </option>
              <option value="rounded-2xl border-solid">
                {t("borderLargeSolid")}
              </option>
              <option value="rounded-lg border-dashed">
                {t("borderDashed")}
              </option>
              <option value="rounded-lg border-dotted">
                {t("borderDotted")}
              </option>
              <option value="rounded-lg border-double">
                {t("borderDouble")}
              </option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="font">{t("fontLabel")}</Label>
          <select
            id="font"
            name="font"
            defaultValue={appearance?.font || "font-sans"}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="font-sans">{t("fontSans")}</option>
            <option value="font-serif">{t("fontSerif")}</option>
            <option value="font-mono">{t("fontMono")}</option>
            <option value="font-comic">{t("fontComic")}</option>
            <option value="font-georgia">{t("fontGeorgia")}</option>
            <option value="font-trebuchet">{t("fontTrebuchet")}</option>
            <option value="font-verdana">{t("fontVerdana")}</option>
          </select>
        </div>
      </div>

      <div
        className="space-y-4"
        style={{ display: tab === "general" ? "block" : "none" }}
      >
        <h3 className="text-lg font-medium border-b pb-2">
          {t("favoriteCurrenciesTitle")}
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {AVAILABLE_CURRENCIES.map((curr) => (
            <div key={curr} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`curr-${curr}`}
                name="favoriteCurrencies"
                value={curr}
                defaultChecked={appearance.favoriteCurrencies.includes(curr)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor={`curr-${curr}`}>{curr}</Label>
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? t("saving") : t("saveChanges")}
      </Button>
    </form>
  );
}
