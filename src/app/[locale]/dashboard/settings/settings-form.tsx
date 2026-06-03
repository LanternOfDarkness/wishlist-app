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
import { APPEARANCE_PRESETS } from "@/lib/wishlist-appearance";
import {
  BANNER_DISPLAY_MODE_OPTIONS,
  BANNER_MODE_LABELS,
  COLOR_PRESET_OPTIONS,
  FONT_OPTIONS,
  ITEM_BORDER_OPTIONS,
  getWishlistSettingsState,
  shouldUseDarkTheme,
  type BannerDisplayMode,
  type ColorPreset,
} from "@/lib/wishlist-settings-state";

type UserWithWishlist = User & { wishlist: Wishlist | null };

interface SettingsFormProps {
  user: UserWithWishlist;
}

export function SettingsForm({
  user,
  tab = "general",
}: SettingsFormProps & { tab?: "general" | "appearance" }) {
  const t = useTranslations("Settings");
  const [isLoading, setIsLoading] = useState(false);
  const settings = getWishlistSettingsState(user.wishlist?.appearance);
  const [themeMode, setThemeMode] = useState(
    settings.themeMode,
  );
  const [colorPreset, setColorPreset] = useState<ColorPreset>(
    settings.colorPreset,
  );
  const [advancedColorsEnabled, setAdvancedColorsEnabled] = useState(
    settings.advancedColorsEnabled,
  );
  const [advancedPrimaryColor, setAdvancedPrimaryColor] = useState(
    settings.advancedPrimaryColor,
  );
  const [advancedBackgroundColor, setAdvancedBackgroundColor] = useState(
    settings.advancedBackgroundColor,
  );
  const [advancedTextColor, setAdvancedTextColor] = useState(
    settings.advancedTextColor,
  );
  const [bannerDisplayMode, setBannerDisplayMode] =
    useState<BannerDisplayMode>(settings.bannerDisplayMode);

  useEffect(() => {
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    document.documentElement.classList.toggle(
      "dark",
      shouldUseDarkTheme(themeMode, systemPrefersDark),
    );
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
            defaultValue={settings.welcomeMessage}
            placeholder={t("welcomeMessagePlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bgImage">{t("backgroundImageLabel")}</Label>
          <Input
            id="bgImage"
            name="bgImage"
            defaultValue={settings.backgroundImage}
            placeholder="https://example.com/bg.jpg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bannerImage">{t("bannerImageLabel")}</Label>
          <Input
            id="bannerImage"
            name="bannerImage"
            defaultValue={settings.bannerImage}
            placeholder="https://example.com/banner.jpg"
          />
        </div>

        <div className="space-y-3">
          <Label>{t("colorSchemeLabel")}</Label>
          <input type="hidden" name="colorPreset" value={colorPreset} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {COLOR_PRESET_OPTIONS.map((preset) => {
              const presetTheme = APPEARANCE_PRESETS[preset];
              const isSelected = colorPreset === preset;

              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setColorPreset(preset)}
                  className={`rounded-md border p-3 text-left transition-colors ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-input hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">
                      {t(presetTheme.labelKey)}
                    </span>
                    <div className="flex items-center gap-1">
                      <span
                        className="h-5 w-5 rounded-full border"
                        style={{ backgroundColor: presetTheme.tokens.primary }}
                      />
                      <span
                        className="h-5 w-5 rounded-full border"
                        style={{ backgroundColor: presetTheme.tokens.background }}
                      />
                      <span
                        className="h-5 w-5 rounded-full border"
                        style={{ backgroundColor: presetTheme.tokens.foreground }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 rounded-md border border-input p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="advancedColorsEnabled">
                {t("advancedColorsLabel")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("advancedColorsHelp")}
              </p>
            </div>
            <input
              id="advancedColorsEnabled"
              type="checkbox"
              checked={advancedColorsEnabled}
              onChange={(event) =>
                setAdvancedColorsEnabled(event.target.checked)
              }
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
          </div>
          <input
            type="hidden"
            name="advancedColorsEnabled"
            value={advancedColorsEnabled ? "true" : "false"}
          />
          <input
            type="hidden"
            name="advancedPrimaryColor"
            value={advancedPrimaryColor}
          />
          <input
            type="hidden"
            name="advancedBackgroundColor"
            value={advancedBackgroundColor}
          />
          <input
            type="hidden"
            name="advancedTextColor"
            value={advancedTextColor}
          />
          {advancedColorsEnabled ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="advancedPrimaryColor">
                  {t("advancedPrimaryColorLabel")}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="advancedPrimaryColor"
                    type="color"
                    value={advancedPrimaryColor}
                    onChange={(event) =>
                      setAdvancedPrimaryColor(event.target.value)
                    }
                    className="w-12 p-1"
                  />
                  <Input
                    type="text"
                    value={advancedPrimaryColor}
                    readOnly
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="advancedBackgroundColor">
                  {t("advancedBackgroundColorLabel")}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="advancedBackgroundColor"
                    type="color"
                    value={advancedBackgroundColor}
                    onChange={(event) =>
                      setAdvancedBackgroundColor(event.target.value)
                    }
                    className="w-12 p-1"
                  />
                  <Input
                    type="text"
                    value={advancedBackgroundColor}
                    readOnly
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="advancedTextColor">
                  {t("advancedTextColorLabel")}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="advancedTextColor"
                    type="color"
                    value={advancedTextColor}
                    onChange={(event) => setAdvancedTextColor(event.target.value)}
                    className="w-12 p-1"
                  />
                  <Input
                    type="text"
                    value={advancedTextColor}
                    readOnly
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bannerDisplayMode">
              {t("bannerDisplayModeLabel")}
            </Label>
            <select
              id="bannerDisplayMode"
              name="bannerDisplayMode"
              value={bannerDisplayMode}
              onChange={(event) =>
                setBannerDisplayMode(event.target.value as BannerDisplayMode)
              }
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {BANNER_DISPLAY_MODE_OPTIONS.map((mode) => (
                <option key={mode} value={mode}>
                  {t(BANNER_MODE_LABELS[mode])}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="itemBorder">{t("itemBorderLabel")}</Label>
            <select
              id="itemBorder"
              name="itemBorder"
              defaultValue={settings.itemBorder}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ITEM_BORDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="font">{t("fontLabel")}</Label>
          <select
            id="font"
            name="font"
            defaultValue={settings.font}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {FONT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
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
                defaultChecked={settings.favoriteCurrencies.includes(curr)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
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
