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
import { updateItem } from "@/actions/update-item";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Category, Item } from "@prisma/client";
import Image from "next/image";
import {
  applyMetadataToWishlistItemDraft,
  createEmptyWishlistItemDraft,
  type WishlistItemDraft,
} from "@/lib/wishlist-item-intake";


// Owner-facing item lists omit/optionalize `isReserved` (surprise
// preservation — see wishlist-presentation.ts), so this modal (and anything
// that forwards an item into it, like the item actions menu) accepts that
// narrower shape rather than the full Prisma `Item` type.
export type EditableWishlistItem = Omit<Item, "isReserved"> & {
  isReserved?: boolean;
};

interface AddItemModalProps {
  wishlistId: string;
  categories?: Category[];
  favoriteCurrencies?: string[];
  /** When provided, the modal edits this item instead of creating a new one. */
  item?: EditableWishlistItem;
  /** Controlled open state, used when rendering without the default trigger (e.g. from an actions menu). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Custom trigger element; omit to hide the trigger entirely (fully controlled). */
  trigger?: React.ReactNode;
}

function itemToDraft(item: EditableWishlistItem): WishlistItemDraft {
  return {
    url: item.url || "",
    name: item.name,
    imageUrl: item.imageUrl || "",
    price: item.price != null ? String(item.price) : "",
    currency: item.currency,
    priority: String(item.priority),
    isPrivate: item.isPrivate,
    categoryId: item.categoryId || "",
    newCategoryName: "",
  };
}

export function AddItemModal({
  wishlistId,
  categories = [],
  item,
  open: controlledOpen,
  onOpenChange,
  trigger,
}: AddItemModalProps) {
  const t = useTranslations("AddItem");
  const isEditMode = Boolean(item);
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;
  const [draft, setDraft] = useState(() =>
    item ? itemToDraft(item) : createEmptyWishlistItemDraft(),
  );
  const [isFetching, setIsFetching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // The modal instance persists across open/close (it's owned by the actions
  // menu), so resync the draft whenever it opens rather than only on mount —
  // otherwise a cancelled edit would leave stale values the next time it opens.
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setDraft(item ? itemToDraft(item) : createEmptyWishlistItemDraft());
    }
    setOpen(next);
  };

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
        toast.success(t("fetch_success"));
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
      toast.error(t("name_required"));
      return;
    }

    setIsSubmitting(true);
    try {
      const itemData = {
        name: draft.name,
        url: draft.url,
        imageUrl: draft.imageUrl,
        price: draft.price ? parseFloat(draft.price) : undefined,
        currency: draft.currency,
        priority: parseInt(draft.priority, 10),
        categoryId: draft.categoryId,
        newCategoryName:
          draft.categoryId === "new" ? draft.newCategoryName : undefined,
        isPrivate: draft.isPrivate,
      };

      const result = isEditMode
        ? await updateItem(item!.id, itemData)
        : await addItem({ ...itemData, wishlistId });

      if (result.success) {
        toast.success(isEditMode ? t("edit_success") : t("add_success"));
        setOpen(false);
        if (!isEditMode) {
          setDraft(createEmptyWishlistItemDraft());
        }
      } else {
        toast.error(
          result.error || (isEditMode ? t("edit_error") : t("add_error")),
        );
      }
    } catch (error) {
      console.error(error);
      toast.error(isEditMode ? t("edit_error") : t("add_error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultTrigger = !isEditMode && !isControlled ? (
    <DialogTrigger asChild>
      <Button size="lg">
        <Sparkles className="mr-2 h-4 w-4" />
        {t("title") || "Add Item"}
      </Button>
    </DialogTrigger>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : defaultTrigger}
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("editTitle") || "Edit Item" : t("title") || "Add Item"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t("editDescription") || "Update your item details"
              : t("url_placeholder") || "Paste link to auto-fill details"}
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
                  {isEditMode ? t("saveEdit") || "Save" : t("submit") || "Add"}
                </>
              ) : isEditMode ? (
                t("saveEdit") || "Save"
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
