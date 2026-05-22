"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createWishlist } from "@/actions/create-wishlist";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

export function CreateWishlistModal() {
    const t = useTranslations("CreateWishlist");
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);

        const result = await createWishlist(formData);

        setIsLoading(false);

        if (result.error) {
            toast.error(t(result.error as Parameters<typeof t>[0]));
        } else {
            toast.success(t("success"));
            setOpen(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> {t("trigger")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                    <DialogDescription className="sr-only">
                        {t("trigger")}
                    </DialogDescription>
                </DialogHeader>
                <form action={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">{t("label")}</Label>
                        <Input
                            id="title"
                            name="title"
                            placeholder={t("placeholder")}
                            required
                        />
                    </div>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t("submitting")}
                            </>
                        ) : (
                            t("submit")
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}