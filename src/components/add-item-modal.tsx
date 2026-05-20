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
import Image from "next/image";
import {
  applyMetadataToWishlistItemDraft,
  createEmptyWishlistItemDraft,
} from "@/lib/wishlist-item-intake";


interface AddItemModalProps {
  wishlistId: string;
  categories?: Category[];
  favoriteCurrencies?: string[];
}

export function AddItemModal({
  wishlistId,
  categories = [],
}: AddItemModalProps) {
  const t = useTranslations("AddItem");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(createEmptyWishlistItemDraft);
  const [isFetching, setIsFetching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFetchMetadata = async () => {
    if (!draft.url.trim()) {
      toast.error(t("error_fetch") || "Please enter URL");
      return;
    }

    setIsFetching(true);
    try {
      const metadata = await fetchMetadata(draft.url);

      if (metadata) {
        setDraft((currentDraft) =>
          applyMetadataToWishlistItemDraft(currentDraft, metadata),
        );
        toast.success("Дані успішно завантажено!");
      } else {
        toast.error(t("error_fetch") || "Error fetching");
      }
    } catch (error) {
      console.error(error);
      toast.error(t("error_fetch") || "Error fetching");
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!draft.name.trim()) {
      toast.error("Назва обов'язкова");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await addItem({
        name: draft.name,
        url: draft.url,
        imageUrl: draft.imageUrl,
        price: draft.price ? parseFloat(draft.price) : undefined,
        currency: draft.currency,
        priority: parseInt(draft.priority, 10),
        wishlistId,
        categoryId: draft.categoryId,
        newCategoryName:
          draft.categoryId === "new" ? draft.newCategoryName : undefined,
        isPrivate: draft.isPrivate,
      });

      if (result.success) {
        toast.success("Бажання додано!");
        setOpen(false);
        setDraft(createEmptyWishlistItemDraft());
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
          {t("title") || "Add Item"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title") || "Add Item"}</DialogTitle>
          <DialogDescription>
            {t("url_placeholder") || "Paste link to auto-fill details"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* URL Field */}

            <div className="grid gap-2">
              <Label htmlFor="url">{t("url_label") || "URL"}</Label>
              <div className="flex gap-2">
                <Input
                  id="url"
                  type="url"
                  placeholder={t("url_placeholder") || "https://"}
                  value={draft.url}
                  onChange={(e) =>
                    setDraft({ ...draft, url: e.target.value })
                  }
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleFetchMetadata}
                  disabled={isFetching || !draft.url.trim()}
                >
                  {isFetching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("fetching") || "Fetching..."}
                    </>
                  ) : (
                    t("fetch_button") || "Fetch"
                  )}
                </Button>
              </div>
            </div>

            {/* Name Field */}

            <div className="grid gap-2">
              <Label htmlFor="name">{t("name_label") || "Name"} *</Label>
              <Input
                id="name"
                placeholder={t("name_placeholder") || "Item Name"}
                value={draft.name}
                onChange={(e) =>
                  setDraft({ ...draft, name: e.target.value })
                }
                required
              />
            </div>

            {/* Image URL Field */}

            <div className="grid gap-2">
              <Label htmlFor="imageUrl">
                {t("image_label") || "Image URL"}
              </Label>
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://..."
                value={draft.imageUrl}
                onChange={(e) =>
                  setDraft({ ...draft, imageUrl: e.target.value })
                }
              />
              {draft.imageUrl && (
                <div className="mt-2 rounded border p-2 bg-muted/50">
                  <Image
                    src={draft.imageUrl}
                    alt="Preview"
                    width={480}
                    height={128}
                    unoptimized
                    className="h-32 w-full object-contain"
                  />
                </div>
              )}
            </div>

            {/* Price and Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">{t("price_label") || "Price"}</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder={t("price_placeholder") || "100.00"}
                  value={draft.price}
                  onChange={(e) =>
                    setDraft({ ...draft, price: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="currency">
                  {t("currency_label") || "Currency"}
                </Label>
                <Input
                  id="currency"
                  placeholder="UAH"
                  value={draft.currency}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      currency: e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>
            </div>

            {/* Priority and Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority (1-5)</Label>
                <select
                  id="priority"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={draft.priority}
                  onChange={(e) =>
                    setDraft({ ...draft, priority: e.target.value })
                  }
                >
                  <option value="1">1 - Lowest</option>
                  <option value="2">2 - Low</option>
                  <option value="3">3 - Medium</option>
                  <option value="4">4 - High</option>
                  <option value="5">5 - Highest</option>
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="categoryId">Category</Label>
                <select
                  id="categoryId"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={draft.categoryId}
                  onChange={(e) =>
                    setDraft({ ...draft, categoryId: e.target.value })
                  }
                >
                  <option value="">No Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value="new">+ Create New Category</option>
                </select>
              </div>
            </div>

            {draft.categoryId === "new" && (
              <div className="grid gap-2">
                <Label htmlFor="newCategory">New Category Name</Label>
                <Input
                  id="newCategory"
                  placeholder="Electronics, Books, etc."
                  value={draft.newCategoryName}
                  onChange={(e) =>
                    setDraft({ ...draft, newCategoryName: e.target.value })
                  }
                  required={draft.categoryId === "new"}
                />
              </div>
            )}

            <div className="flex items-center space-x-2 mt-4">
              <input
                type="checkbox"
                id="isPrivate"
                checked={draft.isPrivate}
                onChange={(e) =>
                  setDraft({ ...draft, isPrivate: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="isPrivate">
                Make this item private (only visible to mutual followers)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {t("cancel") || "Cancel"}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("submit") || "Add"}
                </>
              ) : (
                t("submit") || "Add"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
