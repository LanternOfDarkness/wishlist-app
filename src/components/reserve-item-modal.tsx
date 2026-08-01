"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Gift } from "@/components/brand/icons";
import { SketchSpinner } from "@/components/ui/sketch-spinner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { reserveItem } from "@/actions/reserve-item";

interface ReserveItemModalProps {
  itemId: string;
  itemName: string;
  price: number | null;
  currency: string;
  pledgedTotal: number;
  shareKey?: string;
}

export function ReserveItemModal({
  itemId,
  itemName,
  price,
  currency,
  pledgedTotal,
  shareKey,
}: ReserveItemModalProps) {
  const t = useTranslations("Reservation");
  const [open, setOpen] = useState(false);
  const canPledgePartially = price != null && price > 0;
  const [mode, setMode] = useState<"full" | "partial">(
    canPledgePartially ? "partial" : "full",
  );
  const [amount, setAmount] = useState("");
  const [guestName, setGuestName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const remaining =
    price != null ? Math.max(price - pledgedTotal, 0) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "partial" && !(parseFloat(amount) > 0)) {
      toast.error(t("amountRequired"));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await reserveItem({
        itemId,
        mode,
        amount: mode === "partial" ? parseFloat(amount) : undefined,
        guestName: guestName.trim() || undefined,
        isAnonymous,
        shareKey,
      });

      if (result.success) {
        toast.success(t("success"));
        setOpen(false);
        setAmount("");
      } else {
        toast.error(result.error || t("error"));
      }
    } catch (error) {
      console.error(error);
      toast.error(t("error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Gift className="mr-2 h-4 w-4" />
          {t("reserveButton")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("modalTitle", { name: itemName })}</DialogTitle>
          <DialogDescription>{t("modalDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {canPledgePartially && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={mode === "partial" ? "default" : "outline"}
                onClick={() => setMode("partial")}
              >
                {t("modeContribute")}
              </Button>
              <Button
                type="button"
                variant={mode === "full" ? "default" : "outline"}
                onClick={() => setMode("full")}
              >
                {t("modeFull")}
              </Button>
            </div>
          )}

          {mode === "partial" && (
            <div className="grid gap-2">
              <Label htmlFor="amount">
                {t("amountLabel")} ({currency})
              </Label>
              <Input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              {remaining != null && (
                <p className="text-xs text-muted-foreground">
                  {t("remaining", { amount: remaining.toFixed(2) })}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="guestName">{t("nameLabel")}</Label>
            <Input
              id="guestName"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder={t("namePlaceholder")}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isAnonymous"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
            />
            <Label htmlFor="isAnonymous">{t("anonymousLabel")}</Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <SketchSpinner className="mr-2 h-4 w-4" />
                  {t("submitting")}
                </>
              ) : (
                t("submit")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
