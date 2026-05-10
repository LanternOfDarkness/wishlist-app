"use server";

import * as cheerio from "cheerio";

export interface MetadataResult {
    title: string;
    image?: string;
    price?: number;
    currency?: string;
}

function parseHttpUrl(url: string) {
    const parsedUrl = new URL(url);

    if (!parsedUrl.protocol.startsWith('http')) {
        throw new Error('Invalid URL protocol');
    }

    return parsedUrl;
}

async function fetchHtml(url: string) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(url, {
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
    try {
        const parsedUrl = parseHttpUrl(url);
        const html = await fetchHtml(parsedUrl.href);
        const $ = cheerio.load(html);

        return {
            title: extractTitle($),
            image: extractImage($, parsedUrl.href),
            price: extractPrice($),
            currency: extractCurrency($),
        };

    } catch (error) {
        console.error('Error fetching metadata:', error);
        return null;
    }
}
