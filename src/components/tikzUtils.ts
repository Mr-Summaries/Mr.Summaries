/**
 * Pure utility helpers for TikzRenderer.
 * Kept in a separate file so they can be imported by unit tests
 * without pulling in React or any DOM dependencies.
 */

/**
 * Regex matching the only preamble directives that are permitted to appear
 * before \begin{document} in a tikz fenced block:
 *   \usepackage[optional]{...}
 *   \usetikzlibrary[optional]{...}
 *
 * The optional argument is restricted to safe characters and the main argument
 * to valid package/library name characters (letters, digits, commas, spaces,
 * hyphens, dots, underscores) to prevent arbitrary LaTeX injection.
 *
 * All other commands are silently dropped to avoid security issues with
 * arbitrary LaTeX injection.
 */
const ALLOWED_PREAMBLE_LINE_RE = /^\\(usepackage|usetikzlibrary)(\[[\w\s,!*=.\-]*])?{[\w\s,.\-]+}$/;

/**
 * Given a raw string that may contain lines appearing before \begin{document},
 * returns only those lines that match the allowlist (\usepackage / \usetikzlibrary).
 * All other lines (blank lines, unknown commands, comments) are silently dropped.
 */
export function extractAllowedPreamble(preamble: string): string[] {
  return preamble
    .split('\n')
    .map(line => line.trim())
    .filter(line => ALLOWED_PREAMBLE_LINE_RE.test(line));
}

/**
 * Ensures TikZ content is wrapped in \begin{document}…\end{document} as
 * required by tikzjax.  If the wrapper is already present the content is
 * returned unchanged (after trimming leading/trailing whitespace).
 *
 * If preamble directives (\usepackage / \usetikzlibrary) appear before
 * \begin{document}, they are extracted, validated against the allowlist, and
 * re-inserted immediately before \begin{document} in the output.  Any other
 * content before \begin{document} is silently dropped for security.
 */
export function normalizeTikz(raw: string): string {
  const trimmed = raw.trim();

  const docMatch = /\\begin\s*\{document\}/.exec(trimmed);
  if (!docMatch) {
    // No \begin{document}: wrap the entire content as before.
    return `\\begin{document}\n${trimmed}\n\\end{document}`;
  }

  const docIdx = docMatch.index;
  const beforeDoc = trimmed.slice(0, docIdx);
  const docAndAfter = trimmed.slice(docIdx);

  const allowedPreamble = extractAllowedPreamble(beforeDoc);
  if (allowedPreamble.length === 0) {
    // Nothing usable before \begin{document}: return the document part trimmed.
    return docAndAfter.trim();
  }

  return `${allowedPreamble.join('\n')}\n${docAndAfter.trim()}`;
}
