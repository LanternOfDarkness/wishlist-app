"use client";

import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export function SignInButton() {
    const t = useTranslations("Navigation");

    return (
        <Button
            variant="default"
            size="sm"
            asChild
        >
            <Link href="/login">{t("login")}</Link>
        </Button>
    );
}
