"use server";

import * as cheerio from "cheerio";

export interface MetadataResult {
    title: string;
    image?: string;
    price?: number;
    currency?: string;
}

export async function fetchMetadata(url: string): Promise<MetadataResult | null> {
    try {
        // Валідація URL
        const urlObj = new URL(url);
        if (!urlObj.protocol.startsWith('http')) {
            throw new Error('Invalid URL protocol');
        }

        // Fetch HTML з timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд timeout

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Витягуємо title
        let title =
            $('meta[property="og:title"]').attr('content') ||
            $('meta[name="twitter:title"]').attr('content') ||
            $('title').text() ||
            'Untitled';

        title = title.trim();

        // Витягуємо image
        let image =
            $('meta[property="og:image"]').attr('content') ||
            $('meta[name="twitter:image"]').attr('content') ||
            $('img').first().attr('src');

        // Перетворюємо відносний URL в абсолютний
        if (image && !image.startsWith('http')) {
            image = new URL(image, url).href;
        }

        // Витягуємо price (опціонально)
        let price: number | undefined;
        let currency: string | undefined;

        const priceContent =
            $('meta[property="product:price:amount"]').attr('content') ||
            $('meta[property="og:price:amount"]').attr('content') ||
            $('[itemprop="price"]').attr('content');

        if (priceContent) {
            const parsedPrice = parseFloat(priceContent.replace(/[^0-9.]/g, ''));
            if (!isNaN(parsedPrice)) {
                price = parsedPrice;
            }
        }

        const currencyContent =
            $('meta[property="product:price:currency"]').attr('content') ||
            $('meta[property="og:price:currency"]').attr('content') ||
            $('[itemprop="priceCurrency"]').attr('content');

        if (currencyContent) {
            currency = currencyContent.toUpperCase();
        }

        return {
            title,
            image: image || undefined,
            price,
            currency: currency || 'UAH',
        };

    } catch (error) {
        console.error('Error fetching metadata:', error);
        return null;
    }
}
