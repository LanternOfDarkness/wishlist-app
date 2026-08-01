import { cn } from "@/lib/utils";

/**
 * Sketch-native loading indicator (plan Stage 4). Replaces the geometric
 * `Loader2` + `animate-spin` wheel with a hand-drawn scribble loop whose
 * stroke draws itself (see `.sketch-spin` in globals.css) — the pencil
 * redraws the loop instead of a gear spinning. `pathLength="1"` normalizes
 * the dash length so the CSS keyframes needn't know the real path length.
 * `aria-hidden` because callers always pair this with loading text
 * ("Fetching..."/"Saving..."), which is the accessible name. No size class:
 * the caller sizes it (e.g. `h-4 w-4`).
 */
export function SketchSpinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("sketch-spin", className)}
    >
      <path
        pathLength="1"
        d="M12.1 3.8
           C14.9 3.5 17.7 5 18.9 7.9
           C19.7 9.9 19.4 12.2 18.1 13.9
           C16.9 15.5 15 16.8 13 17.4
           C10.9 18.1 8.6 18 7 16.7
           C5.5 15.5 4.9 13.5 5.2 11.6
           C5.5 9.8 6.6 8.1 8.2 7.1
           C9.7 6.2 11.5 5.8 12.9 6
           C12.2 6.3 11.5 6.9 11.2 7.6"
      />
    </svg>
  );
}
