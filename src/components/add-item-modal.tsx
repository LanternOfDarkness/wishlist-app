"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { fetchMetadata } from "@/actions/fetch-metadata";
import { addItem } from "@/actions/add-item";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface AddItemModalProps {
    wishlistId: string;
}

export function AddItemModal({ wishlistId }: AddItemModalProps) {
    const t = useTranslations('AddItem');
    const [open, setOpen] = useState(false);
    const [url, setUrl] = useState("");
    const [name, setName] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [price, setPrice] = useState("");
    const [currency, setCurrency] = useState("UAH");
    const [isFetching, setIsFetching] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFetchMetadata = async () => {
        if (!url.trim()) {
            toast.error(t('error_fetch'));
            return;
        }

        setIsFetching(true);
        try {
            const metadata = await fetchMetadata(url);

            if (metadata) {
                setName(metadata.title);
                setImageUrl(metadata.image || "");
                if (metadata.price) {
                    setPrice(metadata.price.toString());
                }
                if (metadata.currency) {
                    setCurrency(metadata.currency);
                }
                toast.success("Дані успішно завантажено!");
            } else {
                toast.error(t('error_fetch'));
            }
        } catch (error) {
            console.error(error);
            toast.error(t('error_fetch'));
        } finally {
            setIsFetching(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error("Назва обов'язкова");
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await addItem({
                name: name.trim(),
                url: url.trim() || undefined,
                imageUrl: imageUrl.trim() || undefined,
                price: price ? parseFloat(price) : undefined,
                currency,
                wishlistId,
            });

            if (result.success) {
                toast.success("Бажання додано!");
                setOpen(false);
                // Reset form
                setUrl("");
                setName("");
                setImageUrl("");
                setPrice("");
                setCurrency("UAH");
            } else {
                toast.error(result.error || "Помилка додавання");
            }
        } catch (error) {
            console.error(error);
            toast.error("Помилка додавання");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="lg">
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t('title')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>{t('title')}</DialogTitle>
                    <DialogDescription>
                        {t('url_placeholder')}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        {/* URL Field */}
                        <div className="grid gap-2">
                            <Label htmlFor="url">{t('url_label')}</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="url"
                                    type="url"
                                    placeholder={t('url_placeholder')}
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={handleFetchMetadata}
                                    disabled={isFetching || !url.trim()}
                                >
                                    {isFetching ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {t('fetching')}
                                        </>
                                    ) : (
                                        t('fetch_button')
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Name Field */}
                        <div className="grid gap-2">
                            <Label htmlFor="name">{t('name_label')} *</Label>
                            <Input
                                id="name"
                                placeholder={t('name_placeholder')}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        {/* Image URL Field */}
                        <div className="grid gap-2">
                            <Label htmlFor="imageUrl">{t('image_label')}</Label>
                            <Input
                                id="imageUrl"
                                type="url"
                                placeholder="https://..."
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                            />
                            {imageUrl && (
                                <div className="mt-2 rounded border p-2">
                                    <img
                                        src={imageUrl}
                                        alt="Preview"
                                        className="h-32 w-full object-contain"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Price and Currency */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="price">{t('price_label')}</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    placeholder={t('price_placeholder')}
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="currency">{t('currency_label')}</Label>
                                <Input
                                    id="currency"
                                    placeholder="UAH"
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            {t('cancel')}
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('submit')}
                                </>
                            ) : (
                                t('submit')
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
