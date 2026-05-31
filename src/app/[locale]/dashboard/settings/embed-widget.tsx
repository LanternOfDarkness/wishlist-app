"use client";

import { useMemo, useState, useTransition } from "react";
import { updateWidgetItems } from "@/actions/update-widget-items";
import { updateWidgetSettings } from "@/actions/update-widget-settings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Copy, Check, Grid2X2, List } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Item } from "@prisma/client";
import type { JsonValue } from "@prisma/client/runtime/library";
import {
  getWishlistWidgetSettingsState,
  type WidgetLayout,
} from "@/lib/wishlist-settings-state";

interface EmbedWidgetProps {
  username: string;
  items?: Item[];
  appearance?: JsonValue;
}

export function EmbedWidget({
  username,
  items = [],
  appearance,
}: EmbedWidgetProps) {
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("Settings");
  const locale = useLocale();
  const router = useRouter();
  const settings = getWishlistWidgetSettingsState(appearance);
  const [localItems, setLocalItems] = useState(items);
  const [widgetLayout, setWidgetLayout] = useState<WidgetLayout>(
    settings.layout,
  );
  const [widgetItemSize, setWidgetItemSize] = useState(
    settings.itemSize,
  );
  const [previewVersion, setPreviewVersion] = useState(0);

  const selectedItemsCount = useMemo(
    () => localItems.filter((item) => item.showInWidget).length,
    [localItems],
  );

  const refreshPreview = () => {
    setPreviewVersion((version) => version + 1);
    router.refresh();
  };

  const handleToggleItem = (itemId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;

    setLocalItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, showInWidget: nextStatus } : item,
      ),
    );

    startTransition(async () => {
      const result = await updateWidgetItems(itemId, nextStatus);

      if (result?.error) {
        setLocalItems((currentItems) =>
          currentItems.map((item) =>
            item.id === itemId ? { ...item, showInWidget: currentStatus } : item,
          ),
        );
        return;
      }

      refreshPreview();
    });
  };

  const handleLayoutChange = (layout: WidgetLayout) => {
    setWidgetLayout(layout);
    startTransition(async () => {
      await updateWidgetSettings({ layout });
      refreshPreview();
    });
  };

  const handleItemSizeChange = (size: number) => {
    setWidgetItemSize(size);
    startTransition(async () => {
      await updateWidgetSettings({ itemSize: size });
      refreshPreview();
    });
  };

  const [copied, setCopied] = useState(false);

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://wishlist.com";
  const embedUrl = `${baseUrl}/${locale}/embed/${username}`;
  const previewUrl = `${embedUrl}?preview=${previewVersion}`;

  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="420" style="border:none; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.1);" title="${username}'s Wishlist"></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(iframeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 max-w-xl w-full border rounded-lg p-4 bg-card mt-8">
      <div>
        <h3 className="text-lg font-medium">
          {t("embedTitle")}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("embedDesc")}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="embed-code">{t("iframeCodeLabel")}</Label>
        <div className="flex gap-2">
          <code
            id="embed-code"
            className="flex-1 block p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto break-all"
          >
            {iframeCode}
          </code>
        </div>
        <Button onClick={handleCopy} className="w-full mt-2" variant="outline">
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2 text-green-500" />
              {t("copied")}
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              {t("copyCode")}
            </>
          )}
        </Button>
      </div>

      <div className="space-y-3 pt-6 border-t mt-6">
        <div>
          <h3 className="text-lg font-medium">{t("widgetLayoutTitle")}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t("widgetLayoutDesc")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={widgetLayout === "grid" ? "default" : "outline"}
            onClick={() => handleLayoutChange("grid")}
            disabled={isPending}
          >
            <Grid2X2 className="w-4 h-4 mr-2" />
            {t("layoutGrid")}
          </Button>
          <Button
            type="button"
            variant={widgetLayout === "list" ? "default" : "outline"}
            onClick={() => handleLayoutChange("list")}
            disabled={isPending}
          >
            <List className="w-4 h-4 mr-2" />
            {t("layoutList")}
          </Button>
        </div>
      </div>

      <div className="space-y-3 pt-6 border-t mt-6">
        <div>
          <Label htmlFor="widget-item-size">{t("widgetItemSizeTitle")}</Label>
          <p className="text-sm text-muted-foreground mt-1">
            {t("widgetItemSizeDesc")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            id="widget-item-size"
            type="range"
            min="70"
            max="160"
            step="10"
            value={widgetItemSize}
            onChange={(event) =>
              handleItemSizeChange(Number(event.target.value))
            }
            disabled={isPending}
            className="w-full accent-primary"
          />
          <span className="w-14 text-right text-sm text-muted-foreground">
            {widgetItemSize}px
          </span>
        </div>
      </div>

      <div className="space-y-4 pt-6 border-t mt-6">
        <div>
          <h3 className="text-lg font-medium">
            {t("widgetItemsTitle")}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t("widgetItemsDesc")}
          </p>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("noItems")}
            </p>
          ) : (
            localItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md"
              >
                <input
                  type="checkbox"
                  id={`widget-${item.id}`}
                  checked={item.showInWidget}
                  onChange={() => handleToggleItem(item.id, item.showInWidget)}
                  disabled={
                    isPending ||
                    (!item.showInWidget &&
                      selectedItemsCount >= 5)
                  }
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                />
                <Label
                  htmlFor={`widget-${item.id}`}
                  className="flex-1 cursor-pointer truncate"
                >
                  {item.name}{" "}
                  {item.price ? `- ${item.price} ${item.currency}` : ""}
                </Label>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="space-y-4 pt-6 border-t mt-6">
        <div>
          <h3 className="text-lg font-medium">
            {t("widgetPreviewTitle")}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t("widgetPreviewDesc")}
          </p>
        </div>
        <iframe
          src={previewUrl}
          key={previewVersion}
          width="100%"
          height="420"
          style={{
            border: "none",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
          title={`${username}'s Wishlist`}
        ></iframe>
      </div>
    </div>
  );
}
