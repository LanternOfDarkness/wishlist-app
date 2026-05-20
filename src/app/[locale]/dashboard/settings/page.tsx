import { redirect } from "next/navigation";
import { SettingsTabs } from "./settings-tabs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getDashboardSettingsIntake } from "@/lib/dashboard-settings-intake";

export default async function SettingsPage() {
    const t = await getTranslations("Settings");
    const user = await getDashboardSettingsIntake();

    if (!user) {
        redirect("/");
    }

    return (
        <div className="container mx-auto py-10 max-w-2xl">
            <div className="mb-6">
                <Link href={`/${user.username}`}>
                    <Button variant="ghost" className="pl-0 hover:pl-2 transition-all gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        {t("backToWishlist")}
                    </Button>
                </Link>
            </div>

            <h1 className="text-3xl font-bold mb-8">{t("pageTitle")}</h1>
            <SettingsTabs user={user} />
        </div>
    );
}
