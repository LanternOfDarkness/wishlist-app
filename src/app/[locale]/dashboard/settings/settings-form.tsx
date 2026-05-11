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
import {
  APPEARANCE_PRESETS,
  BannerDisplayMode,
  ColorPreset,
} from "@/lib/wishlist-appearance";

type UserWithWishlist = User & { wishlist: Wishlist | null };
type AppearanceValue = string | number | boolean | string[] | undefined;

const LEGACY_BORDER_DEFAULTS: Record<string, string> = {
  "rounded-none": "rounded-none border-solid",
  "rounded-md": "rounded-md border-solid",
  "rounded-lg": "rounded-lg border-solid",
  "rounded-2xl": "rounded-2xl border-solid",
};
const COLOR_PRESET_OPTIONS: ColorPreset[] = [
  "light",
  "rose",
  "green",
  "dark",
  "minimal",
];
const BANNER_DISPLAY_MODE_OPTIONS: BannerDisplayMode[] = [
  "banner-and-page",
  "banner-only",
  "page-only",
];
const BANNER_MODE_LABELS: Record<BannerDisplayMode, string> = {
  "banner-and-page": "bannerDisplayModeBoth",
  "banner-only": "bannerDisplayModeBannerOnly",
  "page-only": "bannerDisplayModePageOnly",
};

function normalizeColorInputValue(value: string, fallback: string) {
  const match = value.trim().match(/^#?([0-9a-fA-F]{6})$/);

  if (!match) {
    return fallback;
  }

  return `#${match[1].toLowerCase()}`;
}

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
    (user.wishlist?.appearance as Record<string, AppearanceValue>) || {};
  const appearance: Record<string, AppearanceValue> = {
    ...rawAppearance,
    favoriteCurrencies: Array.isArray(rawAppearance.favoriteCurrencies)
      ? rawAppearance.favoriteCurrencies
      : ["UAH"],
  };
  const favoriteCurrencies = Array.isArray(appearance.favoriteCurrencies)
    ? appearance.favoriteCurrencies
    : ["UAH"];
  const welcomeMessage =
    typeof appearance.welcomeMessage === "string"
      ? appearance.welcomeMessage
      : "";
  const backgroundImage =
    typeof appearance.bgImage === "string" ? appearance.bgImage : "";
  const bannerImage =
    typeof appearance.bannerImage === "string" ? appearance.bannerImage : "";
  const fontValue =
    typeof appearance.font === "string" ? appearance.font : "font-sans";
  const [themeMode, setThemeMode] = useState(
    typeof appearance.themeMode === "string" ? appearance.themeMode : "system",
  );
  const itemBorderValue =
    typeof appearance.itemBorder === "string"
      ? LEGACY_BORDER_DEFAULTS[appearance.itemBorder] || appearance.itemBorder
      : "rounded-lg border-solid";
  const initialColorPreset =
    typeof appearance.colorPreset === "string" &&
    COLOR_PRESET_OPTIONS.includes(appearance.colorPreset as ColorPreset)
      ? (appearance.colorPreset as ColorPreset)
      : "light";
  const initialAdvancedPrimaryColor =
    normalizeColorInputValue(
      typeof appearance.advancedPrimaryColor === "string"
        ? appearance.advancedPrimaryColor
        : typeof appearance.primaryColor === "string"
          ? appearance.primaryColor
          : APPEARANCE_PRESETS[initialColorPreset].primaryColor,
      APPEARANCE_PRESETS[initialColorPreset].primaryColor,
    );
  const initialAdvancedBackgroundColor =
    normalizeColorInputValue(
      typeof appearance.advancedBackgroundColor === "string"
        ? appearance.advancedBackgroundColor
        : typeof appearance.bgColor === "string"
          ? appearance.bgColor
          : APPEARANCE_PRESETS[initialColorPreset].tokens.background,
      APPEARANCE_PRESETS[initialColorPreset].tokens.background,
    );
  const initialAdvancedTextColor =
    normalizeColorInputValue(
      typeof appearance.advancedTextColor === "string"
        ? appearance.advancedTextColor
        : typeof appearance.textColor === "string"
          ? appearance.textColor
          : APPEARANCE_PRESETS[initialColorPreset].tokens.foreground,
      APPEARANCE_PRESETS[initialColorPreset].tokens.foreground,
    );
  const initialBannerDisplayMode =
    typeof appearance.bannerDisplayMode === "string" &&
    BANNER_DISPLAY_MODE_OPTIONS.includes(
      appearance.bannerDisplayMode as BannerDisplayMode,
    )
      ? (appearance.bannerDisplayMode as BannerDisplayMode)
      : "banner-and-page";
  const [colorPreset, setColorPreset] = useState<ColorPreset>(
    initialColorPreset,
  );
  const [advancedColorsEnabled, setAdvancedColorsEnabled] = useState(
    appearance.advancedColorsEnabled === true ||
      appearance.advancedColorsEnabled === "true",
  );
  const [advancedPrimaryColor, setAdvancedPrimaryColor] = useState(
    initialAdvancedPrimaryColor,
  );
  const [advancedBackgroundColor, setAdvancedBackgroundColor] = useState(
    initialAdvancedBackgroundColor,
  );
  const [advancedTextColor, setAdvancedTextColor] = useState(
    initialAdvancedTextColor,
  );
  const [bannerDisplayMode, setBannerDisplayMode] =
    useState<BannerDisplayMode>(initialBannerDisplayMode);

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
            defaultValue={welcomeMessage}
            placeholder={t("welcomeMessagePlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bgImage">{t("backgroundImageLabel")}</Label>
          <Input
            id="bgImage"
            name="bgImage"
            defaultValue={backgroundImage}
            placeholder="https://example.com/bg.jpg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bannerImage">{t("bannerImageLabel")}</Label>
          <Input
            id="bannerImage"
            name="bannerImage"
            defaultValue={bannerImage}
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
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
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
            defaultValue={fontValue}
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
                defaultChecked={favoriteCurrencies.includes(curr)}
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
