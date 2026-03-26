/**
 * SVG sanitization utilities.
 *
 * These run in both browser and Node.js environments (used by tests).
 * The sanitizer uses a regex-based approach so it does not depend on a DOM
 * environment, making it safe to call from Node test harnesses.
 *
 * Threats mitigated:
 *  - <script> blocks (removed with their contents)
 *  - <foreignObject> blocks (removed with their contents)
 *  - Inline event handlers (on*)
 *  - javascript: URIs in href / xlink:href / src attributes
 */

// Tags that must never appear in the sanitized output.
const BLOCKED_TAGS = ['script', 'foreignobject'];

/**
 * Strips dangerous constructs from raw SVG markup and returns clean SVG.
 * Returns an empty string when the input does not contain an <svg> element.
 *
 * Uses a fail-closed strategy: after repeated cleaning passes, a final
 * allowlist check verifies no dangerous tag openers remain. If any are
 * detected, the entire SVG is rejected to prevent injection bypasses.
 */
export function sanitizeSvg(svgInput: string): string {
  let svg = svgInput.trim();

  // Must contain an <svg …> opening tag.
  if (!/<svg[\s>]/i.test(svg)) return '';

  // Apply all dangerous-content removals in a loop until the output is stable,
  // preventing multi-pass bypasses such as `<scr<script>ipt>` → `<script>`.
  for (let pass = 0; pass < 10; pass++) {
    const prev = svg;

    // Remove <script …>…</script> blocks (including multiline content).
    // Use [^>]* for the closing tag to handle </script foo> variants.
    svg = svg.replace(/<script[\s\S]*?<\/script[^>]*>/gi, '');

    // Remove any remaining <script …> opening/self-closing tags not caught above.
    svg = svg.replace(/<script\b[^>]*>/gi, '');

    // Fail-closed: if any <script opener remains after both passes, reject the SVG.
    if (/<script\b/i.test(svg)) return '';
    // Remove <foreignObject …>…</foreignObject> blocks.
    svg = svg.replace(/<foreignObject[\s\S]*?<\/foreignObject[^>]*>/gi, '');

    // Remove any remaining <foreignObject …> opening tags.
    svg = svg.replace(/<foreignObject\b[^>]*>/gi, '');

    // Remove inline event-handler attributes: on<word>="…" / on<word>='…'
    svg = svg.replace(/(\s)on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s/>]*)/gi, '$1');

    // Remove javascript: URIs from href, xlink:href, and src attributes.
    svg = svg.replace(
      /\b(href|xlink:href|src)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:\S*)/gi,
      '',
    );

    if (svg === prev) break; // stable – no more replacements needed
  }

  // Fail-closed: if any blocked tag opener is still present after cleaning,
  // reject the entire SVG rather than risk injecting malicious markup.
  const lower = svg.toLowerCase();
  for (const tag of BLOCKED_TAGS) {
    if (lower.includes(`<${tag}`)) return '';
  }

  return svg;
}

/**
 * Returns true when the sanitized SVG is non-empty (i.e. safe to render).
 */
export function isSafeSvg(svgInput: string): boolean {
  return sanitizeSvg(svgInput).length > 0;
}

/**
 * Rewrites the root `<svg>` tag of already-sanitized markup to make it
 * responsive while preserving the correct aspect ratio.
 *
 * Strategy:
 *  - Always sets `width="100%"` so the diagram fills its container.
 *  - When a `viewBox` is present, removes the hard-coded `height` attribute
 *    and injects `style="height:auto"` so the browser derives the rendered
 *    height from the viewBox aspect ratio instead of defaulting to the CSS
 *    replaced-element intrinsic value of 150 px.
 *  - When no `viewBox` is present, the original `height` attribute is left
 *    unchanged.
 *  - Merges `height:auto` into an existing `style` attribute if one is
 *    present, using a trailing-semicolon-aware join to avoid double semicolons.
 */
export function rewriteSvgRoot(svg: string): string {
  return svg.replace(/<svg\b([^>]*)>/i, (_match, attrs: string) => {
    // Replace or insert width="100%"
    let a = attrs.replace(/\bwidth\s*=\s*(?:"[^"]*"|'[^']*'|\S+)/i, '');
    // Remove hard-coded height only when a viewBox is present, then inject
    // height:auto so the browser uses the viewBox aspect ratio.
    if (/\bviewBox\s*=/i.test(a)) {
      a = a.replace(/\bheight\s*=\s*(?:"[^"]*"|'[^']*'|\S+)/i, '');
      // Merge height:auto into an existing style attribute, or add one.
      if (/\bstyle\s*=\s*"[^"]*"/i.test(a)) {
        a = a.replace(
          /(\bstyle\s*=\s*")([^"]*)(")/i,
          (_m, open, val: string, close) =>
            `${open}${val}${val && !val.trimEnd().endsWith(';') ? ';' : ''}height:auto${close}`,
        );
      } else {
        a = `${a} style="height:auto"`;
      }
    }
    return `<svg width="100%"${a.startsWith(' ') ? '' : ' '}${a.trimEnd()}>`;
  });
}
