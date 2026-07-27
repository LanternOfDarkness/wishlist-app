"use client";

import { useState } from "react";
import { SettingsForm } from "./settings-form";
import { EmbedWidget } from "./embed-widget";
import { useTranslations } from "next-intl";
import type { DashboardSettingsUser } from "@/lib/dashboard-settings-intake";

interface SettingsTabsProps {
    user: DashboardSettingsUser;
}

type SettingsTab = "general" | "appearance" | "widget";

export function SettingsTabs({ user }: SettingsTabsProps) {
    const [activeTab, setActiveTab] = useState<SettingsTab>("general");
    const t = useTranslations("Settings");

    return (
        <div className="w-full">
            <div className="flex border-b mb-6 overflow-x-auto">
                <button
                    className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${activeTab === 'general' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setActiveTab("general")}
                >
                    {t("generalTab")}
                </button>
                <button
                    className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${activeTab === 'appearance' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setActiveTab("appearance")}
                >
                    {t("appearanceTab")}
                </button>
                {user.username && (
                    <button
                        className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${activeTab === 'widget' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setActiveTab("widget")}
                    >
                        {t("widgetTab")}
                    </button>
                )}
            </div>

            <div className="mt-6">
                {/* One persistent instance for general/appearance — SettingsForm
                    already toggles its own sections via the `tab` prop with CSS
                    display, not conditional mounting. Splitting this into two
                    `activeTab === "..." &&` branches (as before) put each form
                    at a different position in the tree, so switching tabs
                    unmounted one and mounted a fresh other, silently resetting
                    every field's state. */}
                {(activeTab === "general" || activeTab === "appearance") && (
                    <SettingsForm user={user} tab={activeTab} />
                )}

                {activeTab === "widget" && user.username && (
                    <div className="space-y-6 max-w-xl pb-10">
                        <EmbedWidget
                            username={user.username}
                            items={user.wishlist?.items || []}
                            appearance={user.wishlist?.appearance}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
