"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Copy, Check } from "lucide-react";

interface EmbedWidgetProps {
    username: string;
}

export function EmbedWidget({ username }: EmbedWidgetProps) {
    const [copied, setCopied] = useState(false);

    // In a real app, use the actual domain.
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://wishlist.com';
    const embedUrl = `${baseUrl}/en/embed/${username}`;

    const iframeCode = `<iframe src="${embedUrl}" width="350" height="500" style="border:none; border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" title="${username}'s Wishlist"></iframe>`;

    const handleCopy = () => {
        navigator.clipboard.writeText(iframeCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-4 max-w-xl w-full border rounded-lg p-4 bg-card mt-8">
            <div>
                <h3 className="text-lg font-medium">Embed Your Wishlist</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Copy the code below to embed your wishlist widget on your blog or website.
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
                            Copied!
                        </>
                    ) : (
                        <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Code
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
