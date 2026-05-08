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
import { Category } from "@prisma/client";

interface AddItemModalProps {
    wishlistId: string;
    userId: string;
    categories?: Category[];
}

export function AddItemModal({ wishlistId, userId, categories = [] }: AddItemModalProps) {
    const t = useTranslations('AddItem');
    const [open, setOpen] = useState(false);
    const [url, setUrl] = useState("");
    const [name, setName] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [price, setPrice] = useState("");
    const [currency, setCurrency] = useState("UAH");
    const [priority, setPriority] = useState("3");
    const [isPrivate, setIsPrivate] = useState(false);
    const [categoryId, setCategoryId] = useState("");
    const [newCategoryName, setNewCategoryName] = useState("");
    const [isFetching, setIsFetching] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFetchMetadata = async () => {
        if (!url.trim()) {
            toast.error(t('error_fetch') || "Please enter URL");
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
                toast.error(t('error_fetch') || "Error fetching");
            }
        } catch (error) {
            console.error(error);
            toast.error(t('error_fetch') || "Error fetching");
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
                priority: parseInt(priority, 10),
                wishlistId,
                userId,
                categoryId: categoryId === "new" ? undefined : categoryId,
                newCategoryName: categoryId === "new" ? newCategoryName : undefined,
                isPrivate
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
                setPriority("3");
                setIsPrivate(false);
                setCategoryId("");
                setNewCategoryName("");
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
                    {t('title') || "Add Item"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('title') || "Add Item"}</DialogTitle>
                    <DialogDescription>
                        {t('url_placeholder') || "Paste link to auto-fill details"}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        {/* URL Field */}
                        <div className="flex items-center space-x-2 my-2">
                            <input
                                type="checkbox"
                                id="isPrivate"
                                checked={isPrivate}
                                onChange={(e) => setIsPrivate(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="isPrivate">Make this item private (only visible to mutual followers)</Label>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="url">{t('url_label') || "URL"}</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="url"
                                    type="url"
                                    placeholder={t('url_placeholder') || "https://"}
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
                                            {t('fetching') || "Fetching..."}
                                        </>
                                    ) : (
                                        t('fetch_button') || "Fetch"
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Name Field */}
                        <div className="flex items-center space-x-2 my-2">
                            <input
                                type="checkbox"
                                id="isPrivate"
                                checked={isPrivate}
                                onChange={(e) => setIsPrivate(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="isPrivate">Make this item private (only visible to mutual followers)</Label>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="name">{t('name_label') || "Name"} *</Label>
                            <Input
                                id="name"
                                placeholder={t('name_placeholder') || "Item Name"}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        {/* Image URL Field */}
                        <div className="flex items-center space-x-2 my-2">
                            <input
                                type="checkbox"
                                id="isPrivate"
                                checked={isPrivate}
                                onChange={(e) => setIsPrivate(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="isPrivate">Make this item private (only visible to mutual followers)</Label>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="imageUrl">{t('image_label') || "Image URL"}</Label>
                            <Input
                                id="imageUrl"
                                type="url"
                                placeholder="https://..."
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                            />
                            {imageUrl && (
                                <div className="mt-2 rounded border p-2 bg-muted/50">
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
                        <div className="flex items-center space-x-2 my-2">
                            <input
                                type="checkbox"
                                id="isPrivate"
                                checked={isPrivate}
                                onChange={(e) => setIsPrivate(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="isPrivate">Make this item private (only visible to mutual followers)</Label>
                        </div>
                            <div className="grid gap-2">
                                <Label htmlFor="price">{t('price_label') || "Price"}</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    placeholder={t('price_placeholder') || "100.00"}
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                />
                            </div>
                        <div className="flex items-center space-x-2 my-2">
                            <input
                                type="checkbox"
                                id="isPrivate"
                                checked={isPrivate}
                                onChange={(e) => setIsPrivate(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="isPrivate">Make this item private (only visible to mutual followers)</Label>
                        </div>
                            <div className="grid gap-2">
                                <Label htmlFor="currency">{t('currency_label') || "Currency"}</Label>
                                <Input
                                    id="currency"
                                    placeholder="UAH"
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                                />
                            </div>
                        </div>

                        {/* Priority and Category */}
                        <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2 my-2">
                            <input
                                type="checkbox"
                                id="isPrivate"
                                checked={isPrivate}
                                onChange={(e) => setIsPrivate(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="isPrivate">Make this item private (only visible to mutual followers)</Label>
                        </div>
                            <div className="grid gap-2">
                                <Label htmlFor="priority">Priority (1-5)</Label>
                                <select
                                    id="priority"
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                >
                                    <option value="1">1 - Lowest</option>
                                    <option value="2">2 - Low</option>
                                    <option value="3">3 - Medium</option>
                                    <option value="4">4 - High</option>
                                    <option value="5">5 - Highest</option>
                                </select>
                            </div>

                        <div className="flex items-center space-x-2 my-2">
                            <input
                                type="checkbox"
                                id="isPrivate"
                                checked={isPrivate}
                                onChange={(e) => setIsPrivate(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="isPrivate">Make this item private (only visible to mutual followers)</Label>
                        </div>
                            <div className="grid gap-2">
                                <Label htmlFor="categoryId">Category</Label>
                                <select
                                    id="categoryId"
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                >
                                    <option value="">No Category</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                    <option value="new">+ Create New Category</option>
                                </select>
                            </div>
                        </div>

                        {categoryId === "new" && (
                            <div className="grid gap-2">
                                <Label htmlFor="newCategory">New Category Name</Label>
                                <Input
                                    id="newCategory"
                                    placeholder="Electronics, Books, etc."
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    required={categoryId === "new"}
                                />
                            </div>
                        )}
                        <div className="flex items-center space-x-2 mt-4">
                            <input
                                type="checkbox"
                                id="isPrivate"
                                checked={isPrivate}
                                onChange={(e) => setIsPrivate(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="isPrivate">Make this item private (only visible to mutual followers)</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            {t('cancel') || "Cancel"}
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('submit') || "Add"}
                                </>
                            ) : (
                                t('submit') || "Add"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
// To insert the privacy toggle into the form, I will rewrite the form content
