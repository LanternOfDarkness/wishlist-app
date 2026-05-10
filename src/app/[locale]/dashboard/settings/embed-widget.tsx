"use client";

import { useState } from "react";
import { useTransition } from "react";
import { updateWidgetItems } from "@/actions/update-widget-items";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Copy, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Item } from "@prisma/client";

interface EmbedWidgetProps {
  username: string;
  items?: Item[];
}

export function EmbedWidget({ username, items = [] }: EmbedWidgetProps) {
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("Settings");

  const handleToggleItem = (itemId: string, currentStatus: boolean) => {
    startTransition(async () => {
      await updateWidgetItems(itemId, !currentStatus);
    });
  };

  const [copied, setCopied] = useState(false);

  // In a real app, use the actual domain.
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://wishlist.com";
  const embedUrl = `${baseUrl}/en/embed/${username}`;

  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="250" style="border:none; border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" title="${username}'s Wishlist"></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(iframeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 max-w-xl w-full border rounded-lg p-4 bg-card mt-8">
      <div>
        {/* Note: using hardcoded text as translations might not exist yet */}
        <h3 className="text-lg font-medium">
          {t("embedTitle") || "Embed Your Wishlist"}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("embedDesc") ||
            "Copy the code below to embed your wishlist widget on your blog or website."}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="embed-code">Iframe Code</Label>
        <div className="flex gap-2">
          <code className="flex-1 block p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto break-all">
            {iframeCode}
          </code>
        </div>
        <Button onClick={handleCopy} className="w-full mt-2" variant="outline">
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2 text-green-500" />
              {t("copied") || "Copied!"}
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              {t("copyCode") || "Copy Code"}
            </>
          )}
        </Button>
      </div>
      <div className="space-y-4 pt-6 border-t mt-6">
        <div>
          <h3 className="text-lg font-medium">
            {t("widgetItemsTitle") || "Select items for widget (max 5)"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t("widgetItemsDesc") ||
              "Choose which items you want to feature in your embed widget. If none are selected, your top 5 items will be shown."}
          </p>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("noItems") || "No items in your wishlist yet."}
            </p>
          ) : (
            items.map((item) => (
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
                      items.filter((i) => i.showInWidget).length >= 5)
                  }
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
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
            {t("widgetPreviewTitle") || "Widget Preview"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t("widgetPreviewDesc") ||
              "This is how your widget will look when embedded on your site."}
          </p>
        </div>
        <iframe
          src={embedUrl}
          width="100%"
          height="250"
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
