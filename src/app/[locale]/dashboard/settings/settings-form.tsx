"use client";

import { updateProfile } from "@/actions/update-profile";
import {
  regenerateShareToken,
  revokeShareToken,
} from "@/actions/wishlist-visibility";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyLinkButton } from "@/components/copy-link-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { AVAILABLE_CURRENCIES } from "@/lib/currencies";
import {
  APPEARANCE_PRESETS,
  BANNER_DISPLAY_MODE_OPTIONS,
  BANNER_MODE_LABELS,
  COLOR_PRESET_OPTIONS,
  FONT_OPTIONS,
  ITEM_BORDER_OPTIONS,
  getAdvancedColorSeedForPreset,
  getWishlistSettingsState,
  hasSufficientContrast,
  type BannerDisplayMode,
  type ColorPreset,
} from "@/lib/wishlist-appearance";
import type { DashboardSettingsUser } from "@/lib/dashboard-settings-intake";

interface SettingsFormProps {
  user: DashboardSettingsUser;
}

export function SettingsForm({
  user,
  tab = "general",
}: SettingsFormProps & { tab?: "general" | "appearance" }) {
  const t = useTranslations("Settings");
  const [isLoading, setIsLoading] = useState(false);
  const settings = getWishlistSettingsState(user.wishlist?.appearance);
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
  const [isPublic, setIsPublic] = useState(user.wishlist?.isPublic ?? true);
  const [shareToken, setShareToken] = useState<string | null>(
    user.wishlist?.shareToken ?? null,
  );
  const [shareBusy, setShareBusy] = useState(false);
  const shareUrl =
    user.username && shareToken
      ? `/${user.username}?k=${shareToken}`
      : null;

  async function handleRegenerateShareToken() {
    setShareBusy(true);
    const result = await regenerateShareToken();
    setShareBusy(false);

    if (result.success && result.data) {
      setShareToken(result.data.shareToken);
      toast.success(t("shareLinkUpdated"));
    } else {
      toast.error(t("shareLinkError"));
    }
  }

  async function handleRevokeShareToken() {
    setShareBusy(true);
    const result = await revokeShareToken();
    setShareBusy(false);

    if (result.success) {
      setShareToken(null);
      toast.success(t("shareLinkRevoked"));
    } else {
      toast.error(t("shareLinkError"));
    }
  }

  // Re-seeding on preset change (rather than only at mount) is what keeps
  // the advanced color pickers from silently showing a previous preset's
  // colors after switching — see getAdvancedColorSeedForPreset's docstring.
  function handleColorPresetChange(preset: ColorPreset) {
    setColorPreset(preset);
    const seed = getAdvancedColorSeedForPreset(preset);
    setAdvancedPrimaryColor(seed.primaryColor);
    setAdvancedBackgroundColor(seed.backgroundColor);
    setAdvancedTextColor(seed.textColor);
  }

  async function handleSubmit(formData: FormData) {
    // parseWishlistAppearance (the write-side validator) stores advanced
    // colors as submitted; only the *read* side re-checks contrast and
    // silently falls back to the preset if it's insufficient. Without this
    // check the form would report success while the chosen colors quietly
    // never take effect.
    if (
      advancedColorsEnabled &&
      !hasSufficientContrast(advancedTextColor, advancedBackgroundColor)
    ) {
      toast.error(t("advancedColorsContrastError"));
      return;
    }

    setIsLoading(true);

    const result = await updateProfile(formData);

    setIsLoading(false);

    if (!result.success) {
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
        className="sketch space-y-4 bg-(--sk-surface) p-4 sm:p-6"
        style={{ display: tab === "general" ? "block" : "none" }}
      >
        <h3 className="text-lg font-display border-b pb-2">
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

        <div className="space-y-3 rounded-md border border-input p-4">
          <div className="space-y-1">
            <Label>{t("visibilityLabel")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("visibilityHelp")}
            </p>
          </div>
          <input type="hidden" name="isPublic" value={isPublic ? "true" : "false"} />
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={isPublic ? "default" : "outline"}
              onClick={() => setIsPublic(true)}
            >
              {t("visibilityPublic")}
            </Button>
            <Button
              type="button"
              variant={!isPublic ? "default" : "outline"}
              onClick={() => setIsPublic(false)}
            >
              {t("visibilityPrivate")}
            </Button>
          </div>

          {!isPublic ? (
            <div className="space-y-2 border-t pt-3">
              <Label>{t("shareLinkLabel")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("shareLinkHelp")}
              </p>
              {shareUrl ? (
                <div className="flex items-center gap-2">
                  <Input readOnly value={shareUrl} className="text-xs" />
                  <CopyLinkButton url={shareUrl} />
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={shareBusy}
                  onClick={handleRegenerateShareToken}
                >
                  {shareToken ? t("resetShareLink") : t("generateShareLink")}
                </Button>
                {shareToken ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={shareBusy}
                    onClick={handleRevokeShareToken}
                  >
                    {t("revokeShareLink")}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div
        className="sketch space-y-4 bg-(--sk-surface) p-4 sm:p-6"
        style={{ display: tab === "appearance" ? "block" : "none" }}
      >
        <h3 className="text-lg font-display border-b pb-2">
          {t("appearanceTitle")}
        </h3>

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
                  onClick={() => handleColorPresetChange(preset)}
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
            <Checkbox
              id="advancedColorsEnabled"
              checked={advancedColorsEnabled}
              onChange={(event) =>
                setAdvancedColorsEnabled(event.target.checked)
              }
              className="mt-1"
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
            <Select
              id="bannerDisplayMode"
              name="bannerDisplayMode"
              value={bannerDisplayMode}
              onChange={(event) =>
                setBannerDisplayMode(event.target.value as BannerDisplayMode)
              }
            >
              {BANNER_DISPLAY_MODE_OPTIONS.map((mode) => (
                <option key={mode} value={mode}>
                  {t(BANNER_MODE_LABELS[mode])}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="itemBorder">{t("itemBorderLabel")}</Label>
            <Select
              id="itemBorder"
              name="itemBorder"
              defaultValue={settings.itemBorder}
            >
              {ITEM_BORDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="font">{t("fontLabel")}</Label>
          <Select
            id="font"
            name="font"
            defaultValue={settings.font}
          >
            {FONT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div
        className="sketch space-y-4 bg-(--sk-surface) p-4 sm:p-6"
        style={{ display: tab === "general" ? "block" : "none" }}
      >
        <h3 className="text-lg font-display border-b pb-2">
          {t("favoriteCurrenciesTitle")}
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {AVAILABLE_CURRENCIES.map((curr) => (
            <div key={curr} className="flex items-center space-x-2">
              <Checkbox
                id={`curr-${curr}`}
                name="favoriteCurrencies"
                value={curr}
                defaultChecked={settings.favoriteCurrencies.includes(curr)}
              />
              <Label htmlFor={`curr-${curr}`}>{curr}</Label>
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" variant="sketch" disabled={isLoading} className="w-full">
        {isLoading ? t("saving") : t("saveChanges")}
      </Button>
    </form>
  );
}
