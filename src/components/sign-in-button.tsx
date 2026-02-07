"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export function SignInButton() {
    const t = useTranslations("Navigation");

    return (
        <Button
            variant="default"
            size="sm"
            onClick={() => signIn("google", { redirectTo: "/dashboard" })}
        >
            {t("login")}
        </Button>
    );
}