"use server";

import * as cheerio from "cheerio";

import { getAuthenticatedUserId } from "@/lib/wishlist-command";
import { safeFetch, UnsafeUrlError } from "@/lib/safe-fetch";

export interface MetadataResult {
    title: string;
    image?: string;
    price?: number;
    currency?: string;
}

async function fetchHtml(url: string) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await safeFetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.text();
    } finally {
        clearTimeout(timeoutId);
    }
}

type MetadataDocument = ReturnType<typeof cheerio.load>;

function extractTitle($: MetadataDocument) {
    return (
        $('meta[property="og:title"]').attr('content') ||
        $('meta[name="twitter:title"]').attr('content') ||
        $('title').text() ||
        'Untitled'
    ).trim();
}

function extractImage($: MetadataDocument, sourceUrl: string) {
    const image =
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content') ||
        $('img').first().attr('src');

    if (!image) {
        return undefined;
    }

    return image.startsWith('http') ? image : new URL(image, sourceUrl).href;
}

function extractPrice($: MetadataDocument) {
    const priceContent =
        $('meta[property="product:price:amount"]').attr('content') ||
        $('meta[property="og:price:amount"]').attr('content') ||
        $('[itemprop="price"]').attr('content');

    if (!priceContent) {
        return undefined;
    }

    const parsedPrice = parseFloat(priceContent.replace(/[^0-9.]/g, ''));
    return Number.isNaN(parsedPrice) ? undefined : parsedPrice;
}

function extractCurrency($: MetadataDocument) {
    const currencyContent =
        $('meta[property="product:price:currency"]').attr('content') ||
        $('meta[property="og:price:currency"]').attr('content') ||
        $('[itemprop="priceCurrency"]').attr('content');

    return currencyContent?.toUpperCase() || 'UAH';
}

export async function fetchMetadata(url: string): Promise<MetadataResult | null> {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
        return null;
    }

    try {
        const parsedUrl = new URL(url);
        const html = await fetchHtml(parsedUrl.href);
        const $ = cheerio.load(html);

        return {
            title: extractTitle($),
            image: extractImage($, parsedUrl.href),
            price: extractPrice($),
            currency: extractCurrency($),
        };

    } catch (error) {
        // The public return type stays `MetadataResult | null` (many existing
        // callers/tests depend on that), but the *reason* for a null result —
        // blocked target vs. HTTP failure vs. parse failure — is preserved
        // here so it's distinguishable in logs instead of flattening to one
        // generic message.
        const reason =
            error instanceof UnsafeUrlError
                ? 'blocked_url'
                : error instanceof Error && error.message.startsWith('HTTP error!')
                  ? 'http_error'
                  : 'unknown';

        console.error(`Error fetching metadata [${reason}]:`, error);
        return null;
    }
}
