import React, { useMemo } from 'react';
import { sanitizeSvg } from './svgUtils';

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
 * - Preserves the original `viewBox` (or `height`) so the aspect ratio is
 *   maintained automatically.
 * - Uses `currentColor` context so strokes/fills declared as `currentColor`
 *   adapt to the surrounding text colour in both light and dark themes.
 */
export const SvgRenderer: React.FC<SvgRendererProps> = ({ children }) => {
  const sanitized = useMemo(() => {
    const clean = sanitizeSvg(children);
    if (!clean) return null;

    // Make the SVG responsive: override width to 100% so it fills the
    // container, and remove any hard-coded height to let the viewBox control
    // the aspect ratio. If there is no viewBox we leave height alone.
    return clean
      .replace(/<svg\b([^>]*)>/i, (_match, attrs: string) => {
        // Replace or insert width="100%"
        let a = attrs.replace(/\bwidth\s*=\s*(?:"[^"]*"|'[^']*'|\S+)/i, '');
        // Remove hard-coded height only when a viewBox is present (aspect
        // ratio is then preserved automatically by the browser).
        if (/\bviewBox\s*=/i.test(a)) {
          a = a.replace(/\bheight\s*=\s*(?:"[^"]*"|'[^']*'|\S+)/i, '');
        }
        return `<svg width="100%"${a.startsWith(' ') ? '' : ' '}${a.trimEnd()}>`;
      });
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
