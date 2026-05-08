import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { fetchMetadata } from '../fetch-metadata';

// Mock fetch globally
global.fetch = vi.fn();

describe('fetchMetadata', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Suppress console.error in tests to avoid noisy output for expected errors
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('should handle non-HTTP URL protocols', async () => {
        const result = await fetchMetadata('ftp://example.com/file');
        expect(result).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledWith('Error fetching metadata:', expect.any(Error));
    });

    it('should handle invalid URL string', async () => {
        const result = await fetchMetadata('not-a-url');
        expect(result).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledWith('Error fetching metadata:', expect.any(Error));
    });

    it('should fetch metadata successfully', async () => {
        const mockHtml = `
            <html>
                <head>
                    <title>Test Title</title>
                    <meta property="og:image" content="https://example.com/image.jpg" />
                    <meta property="product:price:amount" content="19.99" />
                    <meta property="product:price:currency" content="USD" />
                </head>
            </html>
        `;

        (global.fetch as Mock).mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve(mockHtml),
        });

        const result = await fetchMetadata('https://example.com');

        expect(result).toEqual({
            title: 'Test Title',
            image: 'https://example.com/image.jpg',
            price: 19.99,
            currency: 'USD',
        });
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should fetch metadata successfully (price formatting edge cases)', async () => {
        const mockHtml = `
            <html>
                <head>
                    <title>Test Title</title>
                    <meta property="product:price:amount" content="invalid" />
                </head>
            </html>
        `;

        (global.fetch as Mock).mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve(mockHtml),
        });

        const result = await fetchMetadata('https://example.com');

        expect(result).toEqual({
            title: 'Test Title',
            image: undefined,
            price: undefined,
            currency: 'UAH',
        });
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle HTTP fetch errors gracefully', async () => {
        (global.fetch as Mock).mockResolvedValueOnce({
            ok: false,
            status: 404,
        });

        const result = await fetchMetadata('https://example.com');

        expect(result).toBeNull();
        expect(console.error).toHaveBeenCalledWith('Error fetching metadata:', expect.any(Error));
    });

    it('should handle missing metadata fields gracefully', async () => {
        const mockHtml = `
            <html>
                <head>
                </head>
            </html>
        `;

        (global.fetch as Mock).mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve(mockHtml),
        });

        const result = await fetchMetadata('https://example.com');

        expect(result).toEqual({
            title: 'Untitled',
            image: undefined,
            price: undefined,
            currency: 'UAH', // Default currency
        });
    });

    it('should convert relative image URLs to absolute', async () => {
        const mockHtml = `
            <html>
                <head>
                    <meta property="og:image" content="/relative-image.jpg" />
                </head>
            </html>
        `;

        (global.fetch as Mock).mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve(mockHtml),
        });

        const result = await fetchMetadata('https://example.com/path');

        expect(result).toMatchObject({
            image: 'https://example.com/relative-image.jpg',
        });
    });
});
