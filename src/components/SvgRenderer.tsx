import React, { useMemo } from 'react';
import { sanitizeSvg, rewriteSvgRoot } from './svgUtils';

interface SvgRendererProps {
  /** Raw SVG markup (the content of a fenced ```svg block). */
  children: string;
}

/**
 * Safely renders inline SVG markup.
 *
 * - Sanitizes the markup via `sanitizeSvg` (strips scripts, foreignObject,
 *   event handlers, and javascript: URIs) before injecting into the DOM.
 * - Sets `width="100%"` on the <svg> root so it fills its container.
 * - When a `viewBox` is present, removes the hard-coded `height` and injects
 *   `style="height:auto"` so the browser derives the rendered height from the
 *   viewBox aspect ratio instead of defaulting to the CSS intrinsic 150 px.
 * - When no `viewBox` is present, the original `height` is left unchanged.
 * - Uses `currentColor` context so strokes/fills declared as `currentColor`
 *   adapt to the surrounding text colour in both light and dark themes.
 */
export const SvgRenderer: React.FC<SvgRendererProps> = ({ children }) => {
  const sanitized = useMemo(() => {
    const clean = sanitizeSvg(children);
    if (!clean) return null;

    // Make the SVG responsive: override width to 100% so it fills the
    // container.  When a viewBox is present we can derive the correct rendered
    // height from the aspect ratio — but only if we explicitly set
    // style="height:auto".  Without that, some browsers fall back to the CSS
    // replaced-element default of 150 px, causing diagrams to appear squashed
    // or incorrectly scaled.  If there is no viewBox we leave height alone.
    return rewriteSvgRoot(clean);
  }, [children]);

  if (!sanitized) {
    return (
      <div className="my-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800 text-sm">
        <p className="font-medium">Invalid SVG</p>
        <p className="mt-1 opacity-75">The SVG block does not contain a valid &lt;svg&gt; element.</p>
      </div>
    );
  }

  return (
    <div
      className="svg-renderer my-4 flex justify-center overflow-x-auto"
      dir="ltr"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
};
