import { cn } from "@/lib/utils";

/**
 * Hand-drawn "star scribble" brand mark for the sketch identity.
 *
 * Strokes use `currentColor` so the mark inherits ink color from context
 * (brand `--sk-line` in light/dark) rather than a hardcoded hex — callers
 * set color via a text-color className on an ancestor or the mark itself.
 * `aria-hidden` because the mark is always paired with the "Wishlist App"
 * wordmark, which is the accessible name for the logo link.
 */
export function WishlistMark({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={cn("wobble-icon", className)}
        >
            <path d="M12 2.6 L14.3 9.4 L21.3 9.5 L15.5 13.7 L17.6 20.4 L12 16.2 L6.4 20.4 L8.5 13.7 L2.7 9.5 L9.7 9.4 Z" />
            <path d="M12 3.4 L13.9 9.7" opacity="0.5" />
            <path d="M9 15.5 L12 17.8" opacity="0.5" />
        </svg>
    );
}
