import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { fetchMetadata } from '../fetch-metadata';

// Mock fetch globally
global.fetch = vi.fn();

// Mock auth so tests control whether the caller is authenticated.
vi.mock('@/lib/wishlist-command-context', () => ({
    getAuthenticatedUserId: vi.fn(),
}));

// Mock DNS resolution so hostname-based SSRF/rebinding cases are deterministic.
vi.mock('node:dns', () => {
    const lookup = vi.fn();
    return {
        default: { promises: { lookup } },
        promises: { lookup },
    };
});

import { getAuthenticatedUserId } from '@/lib/wishlist-command-context';
import dns from 'node:dns';

const mockedLookup = dns.promises.lookup as unknown as Mock;
const mockedGetAuthenticatedUserId = getAuthenticatedUserId as unknown as Mock;

// Default DNS map used by most tests; individual tests can override with
// mockImplementationOnce/mockImplementation.
const DNS_MAP: Record<string, { address: string; family: number }[]> = {
    'example.com': [{ address: '93.184.216.34', family: 4 }],
    'localhost': [{ address: '127.0.0.1', family: 4 }],
    'internal.example.com': [{ address: '10.0.0.5', family: 4 }],
};

describe('fetchMetadata', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Suppress console.error in tests to avoid noisy output for expected errors
        vi.spyOn(console, 'error').mockImplementation(() => {});

        // Authenticated by default; individual tests override for the anon case.
        mockedGetAuthenticatedUserId.mockResolvedValue('user-1');

        mockedLookup.mockImplementation(async (hostname: string) => {
            return DNS_MAP[hostname] ?? [{ address: '93.184.216.34', family: 4 }];
        });
    });

    it('should return null and perform no fetch when unauthenticated', async () => {
        mockedGetAuthenticatedUserId.mockResolvedValue(null);

        const result = await fetchMetadata('https://example.com');

        expect(result).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle non-HTTP URL protocols', async () => {
        const result = await fetchMetadata('ftp://example.com/file');
        expect(result).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledWith('Error fetching metadata:', expect.any(Error));
    });

    it('should reject file:// URLs', async () => {
        const result = await fetchMetadata('file:///etc/passwd');
        expect(result).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should reject protocols that merely start with "http" (httpx://)', async () => {
        const result = await fetchMetadata('httpx://example.com');
        expect(result).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle invalid URL string', async () => {
        const result = await fetchMetadata('not-a-url');
        expect(result).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledWith('Error fetching metadata:', expect.any(Error));
    });

    it.each([
        ['http://169.254.169.254/latest/meta-data/'],
        ['http://localhost:3000'],
        ['http://127.0.0.1'],
        ['http://[::1]'],
        ['http://10.0.0.5'],
        ['http://192.168.1.1'],
    ])('should reject SSRF target %s with no outbound fetch', async (url) => {
        const result = await fetchMetadata(url);
        expect(result).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should reject a hostname whose DNS lookup resolves to a private address', async () => {
        const result = await fetchMetadata('http://internal.example.com/');
        expect(result).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
        expect(mockedLookup).toHaveBeenCalledWith('internal.example.com', { all: true });
    });

    it('should reject a public URL that redirects to a private address', async () => {
        (global.fetch as Mock).mockResolvedValueOnce({
            status: 302,
            headers: {
                get: (name: string) => (name === 'location' ? 'http://localhost/internal' : null),
            },
        });

        const result = await fetchMetadata('https://example.com/redirect');

        expect(result).toBeNull();
        // Only the first hop should have been requested; the redirect target
        // must be blocked before any second fetch happens.
        expect(global.fetch).toHaveBeenCalledTimes(1);
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
            status: 200,
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
            status: 200,
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
            status: 200,
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
            status: 200,
            text: () => Promise.resolve(mockHtml),
        });

        const result = await fetchMetadata('https://example.com/path');

        expect(result).toMatchObject({
            image: 'https://example.com/relative-image.jpg',
        });
    });
});
