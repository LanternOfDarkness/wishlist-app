"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Archive, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Category } from "@prisma/client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AddItemModal,
  type EditableWishlistItem,
} from "@/components/add-item-modal";
import { deleteItem } from "@/actions/delete-item";
import { setItemArchived } from "@/actions/archive-item";

interface ItemActionsMenuProps {
  item: EditableWishlistItem;
  wishlistId: string;
  categories?: Category[];
}

export function ItemActionsMenu({
  item,
  wishlistId,
  categories = [],
}: ItemActionsMenuProps) {
  const t = useTranslations("Wishlist");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      const result = await setItemArchived(item.id, true);
      if (result.success) {
        toast.success(t("itemArchived"));
      } else {
        toast.error(result.error || t("actionError"));
      }
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteItem(item.id);
      if (result.success) {
        toast.success(t("itemDeleted"));
        setDeleteOpen(false);
      } else {
        toast.error(result.error || t("actionError"));
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label={t("itemActions")}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            {t("editItem")}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isArchiving} onSelect={handleArchive}>
            <Archive className="mr-2 h-4 w-4" />
            {t("archiveItem")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("deleteItem")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddItemModal
        item={item}
        wishlistId={wishlistId}
        categories={categories}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteItemTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteItemDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("deleteItemCancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={handleDelete}>
              {t("deleteItemConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
