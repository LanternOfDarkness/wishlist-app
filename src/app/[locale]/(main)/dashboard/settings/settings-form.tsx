"use client";

import { updateProfile } from "@/actions/update-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Wishlist } from "@prisma/client";
import { useState } from "react";
import { AVAILABLE_CURRENCIES } from "@/lib/currencies";

type UserWithWishlist = User & { wishlist: Wishlist | null };

interface SettingsFormProps {
  user: UserWithWishlist;
}

export function SettingsForm({
  user,
  tab = "general",
}: SettingsFormProps & { tab?: "general" | "appearance" }) {
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

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);

    const result = await updateProfile(formData);

    setIsLoading(false);

    if (result?.error) {
      toast.error("Error", {
        description: result.error,
      });
    } else {
      toast.success("Success!", {
        description: "Your profile has been updated.",
      });
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6 max-w-xl w-full pb-10">
      <div
        className="space-y-4"
        style={{ display: tab === "general" ? "block" : "none" }}
      >
        <h3 className="text-lg font-medium border-b pb-2">General Settings</h3>

        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            defaultValue={user.name || ""}
            placeholder="Your name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Username (Slug)</Label>
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
            This is your wishlist URL. Letters, numbers and dashes only.
          </p>
        </div>
      </div>

      <div
        className="space-y-4"
        style={{ display: tab === "appearance" ? "block" : "none" }}
      >
        <h3 className="text-lg font-medium border-b pb-2">Appearance</h3>

        <div className="space-y-2">
          <Label>Theme</Label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => document.documentElement.classList.remove("dark")}
              className="px-4 py-2 border rounded hover:bg-muted"
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => document.documentElement.classList.add("dark")}
              className="px-4 py-2 border rounded hover:bg-muted bg-slate-900 text-white"
            >
              Dark
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Changes apply immediately to your dashboard.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="welcomeMessage">Welcome Message</Label>
          <Input
            id="welcomeMessage"
            name="welcomeMessage"
            defaultValue={appearance?.welcomeMessage || ""}
            placeholder="Welcome to my wishlist!"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bgImage">Background Image URL</Label>
          <Input
            id="bgImage"
            name="bgImage"
            defaultValue={appearance?.bgImage || ""}
            placeholder="https://example.com/bg.jpg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bannerImage">Top Banner URL</Label>
          <Input
            id="bannerImage"
            name="bannerImage"
            defaultValue={appearance?.bannerImage || ""}
            placeholder="https://example.com/banner.jpg"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary Color</Label>
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
            <Label htmlFor="textColor">Text Color</Label>
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
            <Label htmlFor="bgColor">Background Color</Label>
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
            <Label htmlFor="itemBorder">Item Border Radius</Label>
            <select
              id="itemBorder"
              name="itemBorder"
              defaultValue={appearance?.itemBorder || "rounded-lg"}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="rounded-none">Square (0px)</option>
              <option value="rounded-md">Slightly Rounded</option>
              <option value="rounded-lg">Rounded</option>
              <option value="rounded-2xl">Very Rounded</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="font">Font Family</Label>
          <select
            id="font"
            name="font"
            defaultValue={appearance?.font || "font-sans"}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="font-sans">Sans Serif (Modern)</option>
            <option value="font-serif">Serif (Classic)</option>
            <option value="font-mono">Monospace (Code)</option>
          </select>
        </div>
      </div>

      <div
        className="space-y-4"
        style={{ display: tab === "general" ? "block" : "none" }}
      >
        <h3 className="text-lg font-medium border-b pb-2">
          Favorite Currencies
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
        {isLoading ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
