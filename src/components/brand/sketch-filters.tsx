/**
 * Sitewide SVG filter definitions for the "sketch" brand identity.
 *
 * Renders once in the root layout. Nothing here paints anything on screen —
 * it just registers a `<filter>` that other elements reference via
 * `filter: url(#wobble)` (see the `.wobble-icon` utility in globals.css).
 *
 * IMPORTANT: `#wobble` is for decorative SVG only (icons, underline swashes,
 * illustrations) — never apply it to anything containing text. The
 * feDisplacementMap distorts geometry, which garbles glyphs and makes text
 * unreadable.
 */
export function SketchFilters() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{ position: "absolute", width: 0, height: 0 }}
    >
      <filter id="wobble">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.045 0.09"
          numOctaves="2"
          seed="7"
          result="wobble-noise"
        />
        <feDisplacementMap in="SourceGraphic" in2="wobble-noise" scale="3.2" />
      </filter>
    </svg>
  );
}
