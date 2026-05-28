"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

export function CopyLinkButton({ url }: { url: string }) {
    const [copied, setCopied] = useState(false);
    const t = useTranslations("Dashboard");

    const handleCopy = () => {
        const fullUrl = `${window.location.origin}${url}`;

        navigator.clipboard.writeText(fullUrl);
        setCopied(true);
        toast.success(t("link_copied"));

        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            title={t("copy_link")}
            aria-label={t("copy_link")}
        >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </Button>
    );
}