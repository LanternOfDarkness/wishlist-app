"use client";

import { updateProfile } from "@/actions/update-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Wishlist } from "@prisma/client";
import { useState } from "react";

type UserWithWishlist = User & { wishlist: Wishlist | null };

interface SettingsFormProps {
    user: UserWithWishlist;
}

export function SettingsForm({ user }: SettingsFormProps) {
    const [isLoading, setIsLoading] = useState(false);

    // Typecast appearance safely
    const appearance = (user.wishlist?.appearance as Record<string, string>) || {};

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
            <div className="space-y-4">
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

            <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Appearance</h3>

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

            <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Saving..." : "Save Changes"}
            </Button>
        </form>
    );
}
